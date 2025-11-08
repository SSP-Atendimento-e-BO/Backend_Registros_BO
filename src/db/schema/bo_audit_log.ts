import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const boAuditLog = pgTable('bo_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  boId: uuid('bo_id').notNull(),
  action: text('action').notNull(), // 'update' | 'delete'
  policeIdentifier: text('police_identifier').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})