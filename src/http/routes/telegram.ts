import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { handleTelegramUpdate } from "../../services/telegram.ts";

export const telegramRoute: FastifyPluginCallbackZod = (app) => {
  app.post(
    "/telegram/webhook",
    {
      schema: {
        body: z.any(),
      },
    },
    async (request, reply) => {
      const update = request.body as any;
      await handleTelegramUpdate(update);

      return reply.status(200).send({ ok: true });
    },
  );
};
