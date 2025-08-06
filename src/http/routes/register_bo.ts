import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/connection.ts'
import { registerBo } from '../../db/schema/register_bo.ts'

export const registerBoRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    '/register-bo',
    {
      schema: {
        body: z.object({
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
        }),
      },
    },
    async (request, reply) => {
      const {
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
      } = request.body

      try {
        await db.insert(registerBo).values({
          date_and_time_of_event: new Date(date_and_time_of_event),
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
        })

        return reply.status(201).send()
      } catch (error) {
        app.log.error('Erro ao registrar B.O.:', error)
        return reply.status(500).send({ error: 'Erro interno ao registrar B.O.' })
      }
    }
  )
}
