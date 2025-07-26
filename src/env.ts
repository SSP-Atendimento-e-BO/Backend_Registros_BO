import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  GEMINI_API_KEY: z.string(),
})

export const env = envSchema.parse(process.env)