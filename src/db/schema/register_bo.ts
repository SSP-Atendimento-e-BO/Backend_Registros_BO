import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const registerBo = pgTable('register_bo', {
  id: uuid().primaryKey().defaultRandom(),
  transcription: text('transcription'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
