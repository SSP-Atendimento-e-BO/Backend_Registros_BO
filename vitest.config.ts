import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

// Carrega variáveis específicas de teste
dotenv.config({ path: '.env.test' })

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-db.ts'],
    include: ['tests/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    pool: 'threads',
    fileParallelism: false,
    maxConcurrency: 1,
  },
})