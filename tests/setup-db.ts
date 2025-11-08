import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definido para testes')

const sql = postgres(url)

// Cria extensão unaccent na inicialização dos testes
await sql.unsafe('CREATE EXTENSION IF NOT EXISTS unaccent')

await sql.end({ timeout: 0 })