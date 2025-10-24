import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/connection.ts";
import { registerBo } from "../../db/schema/register_bo.ts";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { sendBoConfirmationEmail } from "../../services/email.ts";
import { generatePdf } from "../../services/pdf.ts";

export const registerBoRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    "/register-bo",
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
      } = request.body;

      try {
        // Inserir o B.O. no banco de dados
        const [result] = await db.insert(registerBo).values({
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
        }).returning({ id: registerBo.id });

        const boId = result.id;

        // Gerar o PDF do B.O.
        const pdfData = {
          id: boId,
          date_and_time_of_event: new Date(date_and_time_of_event),
          place_of_the_fact,
          type_of_occurrence,
          full_name,
          cpf_or_rg,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
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
        };

        const pdfBuffer = await generatePdf(pdfData);

        // Enviar e-mail com o PDF anexado (se o e-mail foi fornecido)
        if (email) {
          try {
            const emailResult = await sendBoConfirmationEmail(
              email,
              full_name,
              boId,
              pdfBuffer
            );
            
            if (!emailResult.success) {
              app.log.error(`Erro ao enviar e-mail para ${email}:`, emailResult.error);
            } else {
              app.log.info(`E-mail enviado com sucesso para ${email}`);
            }
          } catch (emailError) {
            // Não falhar o registro do B.O. se o envio de e-mail falhar
            app.log.error(`Erro ao enviar e-mail para ${email}:`, emailError);
          }
        }

        return reply.status(201).send({ id: boId });
      } catch (error) {
        app.log.error("Erro ao registrar B.O.:", error);
        return reply
          .status(500)
          .send({ error: "Erro interno ao registrar B.O." });
      }
    }
  );

  app.get(
  '/register-bo',
  {
    schema: {
      querystring: z.object({
        page: z.coerce.number().optional().default(1),
        searchTerm: z.string().optional(),
        typeFilter: z.string().optional(),
      }),
    },
  },
  async (request, reply) => {
    const { page, searchTerm, typeFilter } = request.query
    const limit = 10
    const offset = (page - 1) * limit

    try {
      const whereConditions = []

      // 🔍 Filtro por nome com acento + case insensitive
      if (searchTerm) {
        const searchTermPattern = `%${searchTerm}%`
        whereConditions.push(
          or(
            sql`unaccent(${registerBo.id}::text) ILIKE unaccent(${searchTermPattern})`,
            sql`unaccent(${registerBo.full_name}) ILIKE unaccent(${searchTermPattern})`,
            sql`unaccent(${registerBo.place_of_the_fact}) ILIKE unaccent(${searchTermPattern})`,
            sql`unaccent(${registerBo.type_of_occurrence}) ILIKE unaccent(${searchTermPattern})`,
          ),
        )
      }

      // 🎯 Filtro por tipo (se não for "all")
      if (typeFilter && typeFilter !== 'all') {
        whereConditions.push(eq(registerBo.type_of_occurrence, typeFilter))
      }

      const finalWhereCondition =
        whereConditions.length > 0 ? and(...whereConditions) : undefined

      // 📊 Busca total + dados paginados
      const [total, data] = await Promise.all([
        db
          .select({ count: sql`count(*)` })
          .from(registerBo)
          .where(finalWhereCondition),
        db
          .select()
          .from(registerBo)
          .where(finalWhereCondition)
          .orderBy(desc(registerBo.createdAt))
          .limit(limit)
          .offset(offset),
      ])

      const totalCount = Number(total[0].count)

      return reply.status(200).send({
        data,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      })
    } catch (error) {
      if (error instanceof Error) {
        app.log.error('Erro ao listar B.O.s: ' + error.stack)
      } else {
        app.log.error('Erro ao listar B.O.s:', error)
      }
      return reply
        .status(500)
        .send({ error: 'Erro interno ao listar B.O.s' })
    }
  },
)

  app.get(
    "/register-bo/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const bo = await db
          .select()
          .from(registerBo)
          .where(eq(registerBo.id, id));

        if (!bo.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }

        return reply.status(200).send(bo[0]);
      } catch (error) {
        app.log.error("Erro ao buscar B.O.:", error);
        return reply.status(500).send({ error: "Erro interno ao buscar B.O." });
      }
    }
  );

  app.put(
    "/register-bo/:id",
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
      const { id } = request.params;
      const { date_and_time_of_event, ...fieldsToUpdate } = request.body;

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
          .returning();

        if (!updatedBo.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }

        return reply.status(200).send(updatedBo[0]);
      } catch (error) {
        app.log.error("Erro ao atualizar B.O.:", error);
        return reply
          .status(500)
          .send({ error: "Erro interno ao atualizar B.O." });
      }
    }
  );

  app.delete(
    "/register-bo/:id",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const deletedBo = await db
          .delete(registerBo)
          .where(eq(registerBo.id, id))
          .returning();

        if (!deletedBo.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }

        return reply.status(204).send();
      } catch (error) {
        app.log.error("Erro ao deletar B.O.:", error);
        return reply
          .status(500)
          .send({ error: "Erro interno ao deletar B.O." });
      }
    }
  );
};
