import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/connection.ts";
import { registerBo } from "../../db/schema/register_bo.ts";
import { boAuditLog } from "../../db/schema/bo_audit_log.ts";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { sendBoConfirmationEmail } from "../../services/email.ts";
import { generatePdf } from "../../services/pdf.ts";
import { isValidPoliceIdentifier } from "../../services/police.ts";

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
          // Aceita YYYY-MM-DD ou ISO datetime, e permite limpeza com ""
          date_of_birth: z
            .union([
              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              z.string().datetime(),
              z.literal("")
            ])
            .optional(),
          gender: z.string().optional(),
          nationality: z.string().optional(),
          marital_status: z.string().optional(),
          profession: z.string().optional(),
          full_address: z.string().optional(),
          phone_or_cell_phone: z.string().optional(),
          // E-mail válido ou string vazia para remover
          email: z.union([z.string().email(), z.literal("")]).optional(),
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
        // Normalizar data de nascimento para YYYY-MM-DD (se vier como ISO)
        const normalizedDateOfBirth =
          typeof date_of_birth === "string"
            ? (date_of_birth.includes("T")
                ? date_of_birth.slice(0, 10)
                : date_of_birth)
            : undefined;
        const sanitizedEmail = email === "" ? null : email;

        // Inserir o B.O. no banco de dados
        const [result] = await db.insert(registerBo).values({
          date_and_time_of_event: new Date(date_and_time_of_event),
          place_of_the_fact,
          type_of_occurrence,
          full_name,
          cpf_or_rg,
          date_of_birth:
            normalizedDateOfBirth === undefined
              ? undefined
              : normalizedDateOfBirth === ""
              ? null
              : normalizedDateOfBirth,
          gender,
          nationality,
          marital_status,
          profession,
          full_address,
          phone_or_cell_phone,
          email: sanitizedEmail,
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
          date_of_birth:
            normalizedDateOfBirth && normalizedDateOfBirth !== ""
              ? new Date(normalizedDateOfBirth)
              : undefined,
          gender,
          nationality,
          marital_status,
          profession,
          full_address,
          phone_or_cell_phone,
          email: sanitizedEmail ?? undefined,
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
          // Permite ISO datetime ou string vazia para limpar
          date_and_time_of_event: z
            .union([z.string().datetime(), z.literal("")])
            .optional(),
          place_of_the_fact: z.string().optional(),
          type_of_occurrence: z.string().optional(),
          full_name: z.string().optional(),
          cpf_or_rg: z.string().optional(),
          // Aceita YYYY-MM-DD, ISO datetime, ou "" para limpar
          date_of_birth: z
            .union([
              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              z.string().datetime(),
              z.literal("")
            ])
            .optional(),
          gender: z.string().optional(),
          nationality: z.string().optional(),
          marital_status: z.string().optional(),
          profession: z.string().optional(),
          full_address: z.string().optional(),
          phone_or_cell_phone: z.string().optional(),
          // E-mail válido ou string vazia para remover
          email: z.union([z.string().email(), z.literal("")]).optional(),
          relationship_with_the_fact: z.string().optional(),
          transcription: z.string().optional(),
          // Identificação do policial realizando a edição
          police_identifier: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { date_and_time_of_event, police_identifier, ...fieldsToUpdate } = request.body;

      try {
        // Validar policial
        if (!isValidPoliceIdentifier(police_identifier)) {
          return reply.status(403).send({ error: "Policial não autorizado ou identificador inválido" });
        }

        // Buscar estado atual para auditoria/diff
        const beforeRows = await db
          .select()
          .from(registerBo)
          .where(eq(registerBo.id, id));
        if (!beforeRows.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }
        const before = beforeRows[0];

        // Chaves conforme schema do banco (nullable vs notNull)
        const nullableKeys = new Set([
            "cpf_or_rg",
            "date_of_birth",
            "gender",
            "nationality",
            "marital_status",
            "profession",
            "full_address",
            "phone_or_cell_phone",
            "email",
            "transcription",
        ]);
        const nonNullableKeys = new Set([
            "place_of_the_fact",
            "type_of_occurrence",
            "full_name",
            "relationship_with_the_fact",
        ]);
    
        // Converte "" -> null apenas para campos nullable; ignora "" nos not-null
        const sanitizedFields = Object.fromEntries(
            Object.entries(fieldsToUpdate)
                .filter(([key, value]) => {
                    if (value === "") {
                        return nullableKeys.has(key);
                    }
                    return value !== undefined;
                })
                .map(([key, value]) => [key, value === "" ? null : value]),
        );
    
        // Normalizar data de nascimento (ISO -> YYYY-MM-DD)
        const normalizedDOB =
            typeof fieldsToUpdate.date_of_birth === "string"
                ? fieldsToUpdate.date_of_birth.includes("T")
                    ? fieldsToUpdate.date_of_birth.slice(0, 10)
                    : fieldsToUpdate.date_of_birth
                : fieldsToUpdate.date_of_birth;
    
        const updatedBo = await db
            .update(registerBo)
            .set({
                ...sanitizedFields,
                // Não permitir limpar para NULL (coluna é notNull). Se vier "", ignora.
                ...(typeof date_and_time_of_event === "string" &&
                    date_and_time_of_event !== "" && {
                        date_and_time_of_event: new Date(date_and_time_of_event),
                    }),
                ...(normalizedDOB !== undefined && {
                    date_of_birth: normalizedDOB === "" ? null : normalizedDOB,
                }),
            })
            .where(eq(registerBo.id, id))
            .returning();

        if (!updatedBo.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }

        const after = updatedBo[0];

        // Calcular diff
        const changedKeys = [
          ...Object.keys(sanitizedFields),
          ...(typeof date_and_time_of_event === "string" && date_and_time_of_event !== "" ? ["date_and_time_of_event"] : []),
          ...(normalizedDOB !== undefined ? ["date_of_birth"] : []),
        ];
        const diff: Record<string, { from: any; to: any }> = Object.fromEntries(
          changedKeys.map((k) => [
            k,
            {
              from: (before as any)[k] ?? null,
              to: (after as any)[k] ?? null,
            },
          ]),
        );

        await db.insert(boAuditLog).values({
          boId: id,
          action: "update",
          policeIdentifier: police_identifier,
          details: { changedKeys, diff, ip: (request.ip as any) },
        });

        return reply.status(200).send(after);
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
        body: z.object({
          police_identifier: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { police_identifier } = request.body as { police_identifier: string };

      try {
        if (!isValidPoliceIdentifier(police_identifier)) {
          return reply.status(403).send({ error: "Policial não autorizado ou identificador inválido" });
        }

        const beforeRows = await db
          .select()
          .from(registerBo)
          .where(eq(registerBo.id, id));

        if (!beforeRows.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }
        const before = beforeRows[0];

        const deletedBo = await db
          .delete(registerBo)
          .where(eq(registerBo.id, id))
          .returning();

        if (!deletedBo.length) {
          return reply.status(404).send({ error: "B.O. não encontrado" });
        }

        await db.insert(boAuditLog).values({
          boId: id,
          action: "delete",
          policeIdentifier: police_identifier,
          details: {
            snapshot: {
              id: before.id,
              full_name: before.full_name,
              type_of_occurrence: before.type_of_occurrence,
              created_at: (before as any).createdAt,
            },
            ip: (request.ip as any),
          },
        });

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
