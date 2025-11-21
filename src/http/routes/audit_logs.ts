import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { db } from "../../db/connection.ts"
import { boAuditLog } from "../../db/schema/bo_audit_log.ts"
import { and, desc, eq, sql } from "drizzle-orm"

export const auditLogsRoute: FastifyPluginCallbackZod = (app) => {
  app.get(
    "/audit-logs",
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().optional().default(1),
          boId: z.string().uuid().optional(),
          action: z.enum(["update", "delete"]).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, boId, action } = request.query
      const limit = 10
      const offset = (page - 1) * limit

      const whereConditions = [] as any[]
      if (boId) whereConditions.push(eq(boAuditLog.boId, boId))
      if (action) whereConditions.push(eq(boAuditLog.action, action))

      const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

      const baseCount = db.select({ count: sql`count(*)` }).from(boAuditLog)
      const baseData = db.select().from(boAuditLog)

      const countQuery = finalWhere ? baseCount.where(finalWhere) : baseCount
      const dataQuery = finalWhere ? baseData.where(finalWhere) : baseData

      const [total, data] = await Promise.all([
        countQuery,
        dataQuery.orderBy(desc(boAuditLog.createdAt)).limit(limit).offset(offset),
      ])

      const totalCount = Number(total[0].count)

      return reply.status(200).send({
        data,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      })
    }
  )
}