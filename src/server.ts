// server.js
import dotenv from 'dotenv'
dotenv.config()
import { fastifyCors } from '@fastify/cors'
import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { transcriptionRoute } from './http/routes/transcription.ts'
import { registerBoRoute } from './http/routes/register_bo.ts'
import { autofillBoRoute } from './http/routes/autofill-bo.ts'
import { syncBoletinsRoute } from './http/routes/sync-boletins.ts'
import { auditLogsRoute } from './http/routes/audit_logs.ts'

const app = fastify({ logger: true, bodyLimit: 104857600 }).withTypeProvider<ZodTypeProvider>()
const PORT = 3333

app.register(fastifyCors)

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(transcriptionRoute)
app.register(registerBoRoute)
app.register(autofillBoRoute)
app.register(syncBoletinsRoute)
app.register(auditLogsRoute)

const start = async () => {
  try {
    await app.listen({ port: PORT })
    app.log.info(`🚀 Servidor rodando em http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
