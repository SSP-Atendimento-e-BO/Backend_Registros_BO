import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { fastify } from 'fastify'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import { registerBoRoute } from '../../src/http/routes/register_bo.ts'
import { db } from '../../src/db/connection.ts'
import { registerBo } from '../../src/db/schema/register_bo.ts'

function createTestApp() {
  const app = fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setSerializerCompiler(serializerCompiler)
  app.setValidatorCompiler(validatorCompiler)
  app.register(registerBoRoute)
  return app
}

let app: ReturnType<typeof createTestApp>

beforeAll(async () => {
  app = createTestApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await db.delete(registerBo)
})

describe('GET /register-bo listagem e filtros', () => {
  it('lista com paginação e filtra por tipo', async () => {
    // Cria alguns BOs
    const base = {
      date_and_time_of_event: new Date().toISOString(),
      place_of_the_fact: 'Centro',
      full_name: 'Teste',
      relationship_with_the_fact: 'Vítima',
      email: '',
    }

    for (const tipo of ['Furto', 'Roubo', 'Estelionato']) {
      await app.inject({ method: 'POST', url: '/register-bo', payload: { ...base, type_of_occurrence: tipo } })
    }

    const resAll = await app.inject({ method: 'GET', url: '/register-bo?page=1' })
    expect(resAll.statusCode).toBe(200)
    const all = resAll.json()
    expect(all.data.length).toBe(3)

    const resFilter = await app.inject({ method: 'GET', url: '/register-bo?page=1&typeFilter=Roubo' })
    const onlyRoubo = resFilter.json()
    expect(onlyRoubo.data.length).toBe(1)
    expect(onlyRoubo.data[0].type_of_occurrence).toBe('Roubo')
  })

  it('busca por termo com unaccent/case-insensitive', async () => {
    const base = {
      date_and_time_of_event: new Date().toISOString(),
      place_of_the_fact: 'Rua São José',
      type_of_occurrence: 'Furto',
      full_name: 'José Álvarez',
      relationship_with_the_fact: 'Vítima',
      email: '',
    }

    await app.inject({ method: 'POST', url: '/register-bo', payload: base })

    const res = await app.inject({ method: 'GET', url: '/register-bo?page=1&searchTerm=alvarez' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBe(1)
    expect(body.data[0].full_name).toContain('Álvarez')
  })
})