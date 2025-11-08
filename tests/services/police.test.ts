import { describe, it, expect } from 'vitest'
import { isValidPoliceIdentifier } from '../../src/services/police.ts'

describe('isValidPoliceIdentifier', () => {
  it('aceita identificadores mock válidos', () => {
    expect(isValidPoliceIdentifier('PM-0123')).toBe(true)
    expect(isValidPoliceIdentifier('PM-0456')).toBe(true)
    expect(isValidPoliceIdentifier('PM-0789')).toBe(true)
    expect(isValidPoliceIdentifier('PM-0001')).toBe(true)
    expect(isValidPoliceIdentifier('PM-9999')).toBe(true)
  })

  it('rejeita identificadores inválidos', () => {
    expect(isValidPoliceIdentifier('')).toBe(false)
    expect(isValidPoliceIdentifier('pm-0123')).toBe(false)
    expect(isValidPoliceIdentifier('PM-ABCD')).toBe(false)
    expect(isValidPoliceIdentifier('CIVIL-1234')).toBe(false)
    expect(isValidPoliceIdentifier('PM-12345')).toBe(false)
  })
})