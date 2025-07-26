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
import multipart from '@fastify/multipart'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = fastify({ logger: true, bodyLimit: 104857600 }).withTypeProvider<ZodTypeProvider>()
const PORT = 3333

app.register(fastifyCors)
app.register(multipart)

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in the environment variables.')
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

app.post('/transcribe', async (request, reply) => {
  const data = await request.file()

  if (!data) {
    return reply.code(400).send({ error: 'Arquivo de áudio ausente.' })
  }

  const buffer = await data.toBuffer()
  const base64 = buffer.toString('base64')
  const mimeType = data.mimetype

  try {
    const result = await model.generateContent([
      {
        text: 'Transcreva o áudio para português do Brasil. Seja preciso, claro e mantenha a pontuação.',
      },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ])

    const text = result.response.text()
    return reply.send({ text })
  } catch (error) {
    app.log.error('Erro ao transcrever:', error)
    return reply.code(500).send({ error: 'Erro interno na transcrição.' })
  }
})

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
