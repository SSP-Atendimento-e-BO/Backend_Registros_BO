import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../../db/connection.ts'
import { registerBo } from '../../db/schema/register_bo.ts'
import { desc, eq } from 'drizzle-orm'

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
        return reply
          .status(500)
          .send({ error: 'Erro interno ao registrar B.O.' })
      }
    },
  )

  app.get('/register-bo', async (request, reply) => {
    try {
      const allBo = await db
        .select()
        .from(registerBo)
        .orderBy(desc(registerBo.createdAt))
      return reply.status(200).send(allBo)
    } catch (error) {
      app.log.error('Erro ao listar B.O.s:', error)
      return reply.status(500).send({ error: 'Erro interno ao listar B.O.s' })
    }
  })

  app.get(
    '/register-bo/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        const bo = await db.select().from(registerBo).where(eq(registerBo.id, id))

        if (!bo.length) {
          return reply.status(404).send({ error: 'B.O. não encontrado' })
        }

        return reply.status(200).send(bo[0])
      } catch (error) {
        app.log.error('Erro ao buscar B.O.:', error)
        return reply.status(500).send({ error: 'Erro interno ao buscar B.O.' })
      }
    },
  )

  app.put(
    '/register-bo/:id',
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          date_and_time_of_event: z.string().datetime().optional(),
          place_of_the_fact: z.string().optional(),
          type_of_occurrence: z.string().optional(),
          full_name: z.string().optional(),
          cpf_or_rg: z.string().optional(),
          date_of_birth: z.string().datetime().optional(),
          gender: z.string().optional(),
          nationality: z.string().optional(),
          marital_status: z.string().optional(),
          profession: z.string().optional(),
          full_address: z.string().optional(),
          phone_or_cell_phone: z.string().optional(),
          email: z.string().email().optional(),
          relationship_with_the_fact: z.string().optional(),
          transcription: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { date_and_time_of_event, ...fieldsToUpdate } = request.body

      try {
        const updatedBo = await db
          .update(registerBo)
          .set({
            ...fieldsToUpdate,
            ...(date_and_time_of_event && {
              date_and_time_of_event: new Date(date_and_time_of_event),
            }),
          })
          .where(eq(registerBo.id, id))
          .returning()

        if (!updatedBo.length) {
          return reply.status(404).send({ error: 'B.O. não encontrado' })
        }

        return reply.status(200).send(updatedBo[0])
      } catch (error) {
        app.log.error('Erro ao atualizar B.O.:', error)
        return reply
          .status(500)
          .send({ error: 'Erro interno ao atualizar B.O.' })
      }
    },
  )

  app.delete(
    '/register-bo/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        const deletedBo = await db
          .delete(registerBo)
          .where(eq(registerBo.id, id))
          .returning()

        if (!deletedBo.length) {
          return reply.status(404).send({ error: 'B.O. não encontrado' })
        }

        return reply.status(204).send()
      } catch (error) {
        app.log.error('Erro ao deletar B.O.:', error)
        return reply.status(500).send({ error: 'Erro interno ao deletar B.O.' })
      }
    },
  )
}
