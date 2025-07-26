import { reset, seed } from 'drizzle-seed'
import { db, sql } from './connection.ts'
import { schema } from './schema/index.ts'

await reset(db, schema)

await seed(db, schema).refine((f) => {
  return {
    registerBo: {
      count: 5,
      columns: {
        transcription: f.loremIpsum()
      },
    },
  }
})

await sql.end()

// biome-ignore lint/suspicious/noConsole: only used in dev
console.log('Database seeded')