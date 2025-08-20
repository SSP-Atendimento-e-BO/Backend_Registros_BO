import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import multipart from '@fastify/multipart'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const transcriptionRoute: FastifyPluginCallbackZod = (app) => {
  app.register(multipart)

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables.')
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  app.post(
    '/transcribe',
    {
      // Como multipart não é validado por zod aqui, deixamos sem schema
      schema: {
        // Opcional: poderia validar headers, se necessário
      },
    },
    async (request, reply) => {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ error: 'Arquivo de áudio ausente.' })
      }

      const buffer = await data.toBuffer()
      const base64 = buffer.toString('base64')
      const mimeType = data.mimetype

      try {
        const result = await model.generateContent([
          {
            text: 'Transcreva o áudio para português do Brasil. Seja preciso, claro e mantenha a pontuação.Elimine da transcrição qualquer ruído em paralelo,principalmente os que possam ficar no final da fala!',
          },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ])

        const text = result.response.text()

        return reply.status(200).send({ text })
      } catch (error) {
        app.log.error('Erro ao transcrever:', error)
        return reply.status(500).send({ error: 'Erro interno na transcrição.' })
      }
    }
  )
}