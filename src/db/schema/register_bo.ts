import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const registerBo = pgTable('register_bo', {
  id: uuid('id').primaryKey().defaultRandom(),
  date_and_time_of_event: timestamp('date_and_time_of_event').notNull(),
  place_of_the_fact: text('place_of_the_fact').notNull(),
  type_of_occurrence: text('type_of_occurrence').notNull(),
  full_name: text('full_name').notNull(),
  cpf_or_rg: text('cpf_or_rg'),
  date_of_birth: timestamp('date_of_birth'),
  gender: text('gender'),
  nationality: text('nationality'),
  marital_status: text('marital_status'),
  profession: text('profession'),
  full_address: text('full_address'),
  phone_or_cell_phone: text('phone_or_cell_phone'),
  email: text('email'),
  relationship_with_the_fact: text('relationship_with_the_fact').notNull(),
  transcription: text('transcription'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
