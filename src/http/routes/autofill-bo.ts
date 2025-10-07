import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const autofillBoRoute: FastifyPluginCallbackZod = (app) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not defined in the environment variables."
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const boSchema = z.object({
    date_and_time_of_event: z
      .string()
      .datetime()
      .optional()
      .describe(
        "A data e hora em que o evento ocorreu. Formato: YYYY-MM-DDTHH:MM:SSZ"
      ),
    place_of_the_fact: z
      .string()
      .optional()
      .describe("O local onde o fato aconteceu."),
    type_of_occurrence: z
      .string()
      .optional()
      .describe("O tipo de crime ou ocorrência (ex: roubo, furto, agressão)."),
    full_name: z
      .string()
      .optional()
      .describe(
        "O nome completo do requerente (quem está registrando o B.O.)."
      ),
    cpf_or_rg: z.string().optional().describe("O CPF ou RG do requerente."),
    date_of_birth: z
      .string()
      .datetime()
      .optional()
      .describe(
        "A data de nascimento do requerente. Formato: YYYY-MM-DDTHH:MM:SSZ"
      ),
    gender: z.string().optional().describe("O gênero do requerente."),
    nationality: z
      .string()
      .optional()
      .describe("A nacionalidade do requerente."),
    marital_status: z
      .string()
      .optional()
      .describe("O estado civil do requerente."),
    profession: z.string().optional().describe("A profissão do requerente."),
    full_address: z
      .string()
      .optional()
      .describe("O endereço completo do requerente."),
    phone_or_cell_phone: z
      .string()
      .optional()
      .describe("O telefone ou celular de contato do requerente."),
    email: z
      .string()
      .email()
      .optional()
      .describe("O email de contato do requerente."),
    relationship_with_the_fact: z
      .string()
      .optional()
      .describe(
        "A relação do requerente com o fato (vítima, comunicante, testemunha)."
      ),
    transcription: z
      .string()
      .optional()
      .describe(
        "O relato detalhado do que aconteceu, em primeira pessoa se possível."
      ),
  });

  app.post("/autofill-bo", async (request, reply) => {
    const body = request.body as { userInput: string };
    const { userInput } = body;

    try {
      const result = await streamObject({
        model: google("models/gemini-2.5-flash"),
        schema: boSchema,
        prompt: `O usuário forneceu o seguinte relato para um boletim de ocorrência. Extraia as informações para preencher o formulário. Se uma informação não for encontrada, deixe o campo em branco.OBSERVAÇÃO: NÃO CRIE INFORMAÇÕES,SÓ PREENCHA OS CAMPOS QUE FORAM PASSADOS.Relato: "${userInput}"`,
      });

      // Lê o stream inteiro
      let fullText = "";
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      // 🔥 Aqui entra o try/catch do parse
      let boData: any = {};
      try {
        boData = JSON.parse(fullText);
      } catch (err) {
        console.error("❌ Erro ao parsear JSON da IA:", fullText, err);
        return reply
          .status(500)
          .send({
            error: "Erro ao interpretar resposta da IA.",
            raw: fullText,
          });
      }

      reply.send(boData);
    } catch (error) {
      console.error("❌ Erro no processamento do autofill:", error);
      reply
        .status(500)
        .send({ error: "Erro interno ao gerar B.O. automático." });
    }
  });
};
