import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/connection.ts'
import { registerBo } from '../../db/schema/register_bo.ts'
import { eq } from 'drizzle-orm'
import { generatePdf } from '../../services/pdf.ts'
import { sendBoConfirmationEmail } from '../../services/email.ts'

// Endpoint para sincronização de B.Os offline
export const syncBoletinsRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    '/sync/boletins',
    {
      schema: {
        body: z.array(
          z.object({
            localId: z.string().min(1),
            date_and_time_of_event: z.string().datetime(),
            place_of_the_fact: z.string(),
            type_of_occurrence: z.string(),
            full_name: z.string(),
            cpf_or_rg: z.string().optional(),
            date_of_birth: z.string().datetime().optional(),
            gender: z.string().optional(),
            nationality: z.string().optional(),
            marital_status: z.string().optional(),
            profession: z.string().optional(),
            full_address: z.string().optional(),
            phone_or_cell_phone: z.string().optional(),
            email: z.string().email().optional(),
            relationship_with_the_fact: z.string(),
            transcription: z.string().optional(),
            collected_at: z.string().datetime().optional(),
          }),
        ),
      },
    },
    async (request, reply) => {
      // Autenticação simples via header Authorization (JWT real pode ser adicionado depois)
      const auth = request.headers['authorization']
      if (!auth || !auth.toString().trim().length) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const items = request.body as Array<any>

      const synced: Array<{ localId: string; serverId: string }> = []
      const failed: Array<{ localId: string; error: string }> = []

      for (const item of items) {
        const {
          localId,
          date_and_time_of_event,
          place_of_the_fact,
          type_of_occurrence,
          full_name,
          cpf_or_rg,
          date_of_birth,
          gender,
          nationality,
          marital_status,
          profession,
          full_address,
          phone_or_cell_phone,
          email,
          relationship_with_the_fact,
          transcription,
          collected_at,
        } = item

        try {
          // Se já existe um B.O. com o mesmo localId, apenas retorna o mapeamento
          if (localId) {
            const existing = await db
              .select({ id: registerBo.id })
              .from(registerBo)
              .where(eq(registerBo.localId, localId))

            if (existing.length > 0) {
              synced.push({ localId, serverId: existing[0].id })
              continue
            }
          }

          const values = {
            date_and_time_of_event: new Date(date_and_time_of_event),
            place_of_the_fact,
            type_of_occurrence,
            full_name,
            cpf_or_rg,
            // Em nosso schema, 'date_of_birth' é 'date' (string no Drizzle)
            // Portanto, mantemos o valor como string ou undefined
            date_of_birth: date_of_birth ?? undefined,
            gender,
            nationality,
            marital_status,
            profession,
            full_address,
            phone_or_cell_phone,
            email,
            relationship_with_the_fact,
            transcription,
            localId,
            collectedAt: collected_at ? new Date(collected_at) : undefined,
            receivedAt: new Date(),
            syncStatus: 'synced',
          }

          const [created] = await db
            .insert(registerBo)
            .values(values)
            .returning({ id: registerBo.id })

          const serverId = created.id
          synced.push({ localId, serverId })

          // Opcional: envia e-mail com PDF anexado, seguindo comportamento do endpoint existente
          if (email) {
            const pdfData = {
              id: serverId,
              date_and_time_of_event: values.date_and_time_of_event,
              place_of_the_fact,
              type_of_occurrence,
              full_name,
              cpf_or_rg,
              date_of_birth: values.date_of_birth,
              gender,
              nationality,
              marital_status,
              profession,
              full_address,
              phone_or_cell_phone,
              email,
              relationship_with_the_fact,
              transcription,
              created_at: new Date(),
            }

            try {
              const pdfBuffer = await generatePdf(pdfData)
              const emailResult = await sendBoConfirmationEmail(
                email,
                full_name,
                serverId,
                pdfBuffer,
              )

              if (!emailResult.success) {
                app.log.error(`Erro ao enviar e-mail para ${email}:`, emailResult.error)
              }
            } catch (err) {
              app.log.error(`Erro ao gerar/enviar PDF para ${email}:`, err)
            }
          }
        } catch (err) {
          failed.push({ localId, error: err instanceof Error ? err.message : 'Erro desconhecido' })
        }
      }

      return reply.status(200).send({ synced, failed })
    },
  )
}