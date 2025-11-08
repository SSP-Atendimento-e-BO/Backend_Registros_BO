import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { fastify } from 'fastify'
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import { registerBoRoute } from '../../src/http/routes/register_bo.ts'
import { db } from '../../src/db/connection.ts'
import { registerBo } from '../../src/db/schema/register_bo.ts'
import { boAuditLog } from '../../src/db/schema/bo_audit_log.ts'

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
  // Limpa tabelas entre testes
  await db.delete(boAuditLog)
  // Removido: limpeza de registerBo para evitar interferência entre arquivos de teste
})

describe('POST /register-bo', () => {
  it('cria um B.O. e retorna id (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/register-bo',
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: 'Praça da Sé',
        type_of_occurrence: 'Furto',
        full_name: 'João da Silva',
        relationship_with_the_fact: 'Vítima',
        email: '',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.id).toMatch(/[0-9a-f-]{36}/)
  })
})

describe('PUT /register-bo/:id com auditoria', () => {
  it('exige police_identifier e registra diff (200)', async () => {
    // Cria BO inicial
    const create = await app.inject({
      method: 'POST',
      url: '/register-bo',
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: 'Av. Paulista',
        type_of_occurrence: 'Roubo',
        full_name: 'Maria Santos',
        relationship_with_the_fact: 'Vítima',
        email: '',
      },
    })
    const { id } = create.json()

    // Tenta sem identificador -> 400 por schema? nosso schema exige string, então enviar sem body dará 400
    const missing = await app.inject({
      method: 'PUT',
      url: `/register-bo/${id}`,
      payload: {},
    })
    expect(missing.statusCode).toBe(400)

    // Identificador inválido -> 403
    const invalid = await app.inject({
      method: 'PUT',
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: 'INVALIDO',
        full_name: 'Maria S.',
      },
    })
    expect(invalid.statusCode).toBe(403)

    // Atualiza com identificador válido
    const ok = await app.inject({
      method: 'PUT',
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: 'PM-0123',
        full_name: 'Maria S.',
        email: '',
      },
    })
    expect(ok.statusCode).toBe(200)
    const updated = ok.json()
    expect(updated.full_name).toBe('Maria S.')

    // Verifica auditoria
    const logs = await db.select().from(boAuditLog)
    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('update')
    const details: any = logs[0].details as any
    expect(details.changedKeys).toContain('full_name')
    expect(details.diff.full_name.from).toBe('Maria Santos')
    expect(details.diff.full_name.to).toBe('Maria S.')
  })

  it('ignora "" para campos obrigatórios (não-null)', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/register-bo',
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: 'Centro',
        type_of_occurrence: 'Estelionato',
        full_name: 'Carlos',
        relationship_with_the_fact: 'Vítima',
        email: '',
      },
    })
    const { id } = create.json()

    const res = await app.inject({
      method: 'PUT',
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: 'PM-0456',
        full_name: '',
      },
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json()
    expect(updated.full_name).toBe('Carlos') // não mudou

    const logs = await db.select().from(boAuditLog)
    expect(logs.length).toBe(1)
    const details: any = logs[0].details as any
    expect(details.changedKeys).not.toContain('full_name')
  })
})

describe('DELETE /register-bo/:id com auditoria', () => {
  it('exige police_identifier e registra snapshot (204)', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/register-bo',
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: 'Centro',
        type_of_occurrence: 'Roubo',
        full_name: 'Ana',
        relationship_with_the_fact: 'Vítima',
        email: '',
      },
    })
    const { id } = create.json()

    const invalid = await app.inject({
      method: 'DELETE',
      url: `/register-bo/${id}`,
      payload: { police_identifier: 'XX-9999' },
    })
    expect(invalid.statusCode).toBe(403)

    const ok = await app.inject({
      method: 'DELETE',
      url: `/register-bo/${id}`,
      payload: { police_identifier: 'PM-0789' },
    })
    expect(ok.statusCode).toBe(204)

    const logs = await db.select().from(boAuditLog)
    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('delete')
    const details: any = logs[0].details as any
    expect(details.snapshot.full_name).toBe('Ana')
    expect(details.snapshot.type_of_occurrence).toBe('Roubo')
  })
})