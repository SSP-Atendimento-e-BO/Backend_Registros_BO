import postgres from 'postgres'

async function main() {
  const adminUrl = 'postgresql://docker:docker@localhost:5432/postgres'
  const sql = postgres(adminUrl, { max: 1 })
  try {
    const existing = await sql`SELECT 1 FROM pg_database WHERE datname = 'ssp_bo_test'`
    if (existing.length === 0) {
      await sql.unsafe('CREATE DATABASE ssp_bo_test')
      console.log('✅ Banco de teste criado: ssp_bo_test')
    } else {
      console.log('ℹ️ Banco de teste já existe: ssp_bo_test')
    }
  } finally {
    await sql.end({ timeout: 0 })
  }
}

main().catch((err) => {
  console.error('Erro ao criar banco de teste:', err)
  process.exit(1)
})