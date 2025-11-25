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
    reporters: ['verbose'],
    slowTestThreshold: 1000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: 'coverage',
      exclude: ['node_modules', 'tests/setup-db.ts', 'src/services/email.ts'],
      thresholds: { lines: 70, functions: 75, branches: 50, statements: 69 },
    },
  },
})