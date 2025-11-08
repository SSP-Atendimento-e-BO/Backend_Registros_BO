const MOCK_POLICE_IDENTIFIERS = new Set<string>([
  'PM-0001',
  'PM-0002',
  'PM-0123',
  'PM-0456',
  'PM-1234',
  'PM-5678',
  // Identificadores numéricos simples
  '100001',
  '100002',
  '200123',
])

export function isValidPoliceIdentifier(id: string): boolean {
  const trimmed = id.trim()
  if (!trimmed) return false
  // Regra simples: precisa estar no mock e ter tamanho razoável
  return MOCK_POLICE_IDENTIFIERS.has(trimmed)
}