import { describe, it, expect } from 'vitest'
import { generatePdf } from '../../src/services/pdf.ts'

describe('generatePdf', () => {
  it('gera um PDF Buffer com dados essenciais', async () => {
    const buffer = await generatePdf({
      id: 'test-id',
      date_and_time_of_event: new Date(),
      place_of_the_fact: 'Local de Teste',
      type_of_occurrence: 'Furto',
      full_name: 'Fulano de Tal',
      relationship_with_the_fact: 'Vítima',
      created_at: new Date(),
    })
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('tolera campos opcionais ausentes', async () => {
    const buffer = await generatePdf({
      id: 'test-id-2',
      date_and_time_of_event: new Date(),
      place_of_the_fact: 'Outro Local',
      type_of_occurrence: 'Roubo',
      full_name: 'Ciclano',
      relationship_with_the_fact: 'Testemunha',
      created_at: new Date(),
    })
    expect(Buffer.isBuffer(buffer)).toBe(true)
  })
})