import { env } from "../env.ts";

type TelegramContact = {
  phone: string;
  chatId: number;
  active: boolean;
  createdAt: Date;
};

const contacts = new Map<string, TelegramContact>();

let lastUpdateId: number | undefined;

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function getTelegramDeepLinkForPhone(phone: string | null | undefined) {
  const username = env.TELEGRAM_BOT_USERNAME;
  const normalized = normalizePhone(phone);
  if (!username || !normalized) return undefined;
  const encoded = encodeURIComponent(normalized);
  return `https://t.me/${username}?start=${encoded}`;
}

export function registerTelegramContact(identifier: string, chatId: number) {
  const normalized = normalizePhone(identifier);
  if (!normalized) return;
  const existing = contacts.get(normalized);
  const now = new Date();
  if (existing) {
    contacts.set(normalized, {
      phone: normalized,
      chatId,
      active: true,
      createdAt: existing.createdAt,
    });
  } else {
    contacts.set(normalized, {
      phone: normalized,
      chatId,
      active: true,
      createdAt: now,
    });
  }
}

export function deactivateTelegramContact(identifier: string) {
  const normalized = normalizePhone(identifier);
  if (!normalized) return;
  const existing = contacts.get(normalized);
  if (!existing) return;
  contacts.set(normalized, {
    ...existing,
    active: false,
  });
}

function getActiveContactByPhone(phone: string | null | undefined) {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  const contact = contacts.get(normalized);
  if (!contact || !contact.active) return undefined;
  return contact;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      return { success: false, error: errorBody };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendTelegramMessageToPhone(
  phone: string | null | undefined,
  text: string,
) {
  const contact = getActiveContactByPhone(phone);
  if (!contact) {
    return { success: false, error: "No active contact for phone" };
  }
  return sendTelegramMessage(contact.chatId, text);
}

export async function handleTelegramUpdate(update: any) {
  const message = update && update.message;
  const text: string | undefined = message && message.text;
  const chat = message && message.chat;
  const chatId: number | undefined = chat && chat.id;

  if (typeof text !== "string" || typeof chatId !== "number") {
    return;
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("/start")) {
    const parts = trimmed.split(" ");
    const param = parts.length > 1 ? parts[1] : "";
    if (param) {
      registerTelegramContact(param, chatId);
      await sendTelegramMessage(
        chatId,
        "Cadastro de notificações via Telegram ativado para seu Boletim de Ocorrência. As comunicações oficiais continuam por e‑mail — verifique sua caixa de entrada e a pasta de spam. Para interromper, envie: /stop <seu_telefone>.",
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "Para ativar as notificações via Telegram, utilize o link enviado por e‑mail após o registro do B.O. As comunicações oficiais continuam por e‑mail.",
      );
    }
  } else if (lower.startsWith("/stop")) {
    const parts = trimmed.split(" ");
    const param = parts.length > 1 ? parts[1] : "";
    if (param) {
      deactivateTelegramContact(param);
    }
    await sendTelegramMessage(
      chatId,
      "Notificações via Telegram desativadas. Você continuará recebendo as comunicações oficiais por e‑mail. Para reativar, utilize o link do e‑mail e o comando /start.",
    );
  }
}

export function startTelegramPolling() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`;

  const tick = async () => {
    try {
      const body =
        typeof lastUpdateId === "number"
          ? { offset: lastUpdateId + 1, timeout: 10 }
          : { timeout: 10 };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setTimeout(tick, 1000);
        return;
      }

      const data = (await response.json()) as {
        ok: boolean;
        result?: Array<any>;
      };

      if (!data.ok || !Array.isArray(data.result)) {
        setTimeout(tick, 1000);
        return;
      }

      for (const update of data.result) {
        if (typeof update.update_id === "number") {
          lastUpdateId = update.update_id;
        }
        await handleTelegramUpdate(update);
      }
    } catch {
      setTimeout(tick, 2000);
      return;
    }

    setTimeout(tick, 500);
  };

  tick();
}
