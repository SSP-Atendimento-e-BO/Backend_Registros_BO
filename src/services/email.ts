import { Resend } from "resend";
import { env } from "../env.ts";

// Inicializa o cliente Resend com a API key
const resend = new Resend(env.RESEND_API_KEY);

// Interface para os logs de envio de e-mail
export interface EmailLog {
  boId: string;
  recipientEmail: string;
  sentAt: Date;
  status: "success" | "error";
  errorMessage?: string;
  type?: "confirmation" | "update" | "deletion";
}

// Armazena os logs de envio (em produção, seria melhor usar o banco de dados)
const emailLogs: EmailLog[] = [];

const commonStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background-color: #003366; color: white; padding: 10px 20px; text-align: center; }
  .content { padding: 20px; background-color: #f9f9f9; }
  .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  .diff-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .diff-table th, .diff-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .diff-table th { background-color: #f2f2f2; }
`;

// Template HTML básico para o e-mail
const getEmailTemplate = (
  fullName: string,
  boId: string,
  telegramDeepLink?: string,
) => {
  const telegramSection = telegramDeepLink
    ? `
          <p>Se desejar receber notificações sobre este e outros B.O.s pelo Telegram, acesse o link abaixo para ativar:</p>
          <p><a href="${telegramDeepLink}" target="_blank" rel="noopener noreferrer">${telegramDeepLink}</a></p>
        `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmação de Registro de Boletim de Ocorrência</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Confirmação de Registro de Boletim de Ocorrência</h1>
        </div>
        <div class="content">
          <p>Prezado(a) <strong>${fullName}</strong>,</p>
          <p>Seu Boletim de Ocorrência foi registrado com sucesso em nosso sistema.</p>
          <p>O número de identificação do seu B.O. é: <strong>${boId}</strong></p>
          <p>Em anexo, você encontrará o PDF com todos os detalhes do seu registro.</p>
          <p>Este documento serve como comprovante oficial do seu registro.</p>
          <p>Caso tenha alguma dúvida, entre em contato com a delegacia mais próxima.</p>
          ${telegramSection}
        </div>
        <div class="footer">
          <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const fieldLabelMap: Record<string, string> = {
  date_and_time_of_event: "Data e hora do fato",
  place_of_the_fact: "Local do fato",
  type_of_occurrence: "Tipo de ocorrência",
  full_name: "Nome completo",
  cpf_or_rg: "CPF ou RG",
  date_of_birth: "Data de nascimento",
  gender: "Gênero",
  nationality: "Nacionalidade",
  marital_status: "Estado civil",
  profession: "Profissão",
  full_address: "Endereço completo",
  phone_or_cell_phone: "Telefone ou celular",
  email: "E-mail",
  relationship_with_the_fact: "Relação com o fato",
  transcription: "Relato do ocorrido",
};

const getUpdateEmailTemplate = (
  fullName: string,
  boId: string,
  changes: Record<string, { from: any; to: any }>,
  policeIdentifier: string,
) => {
  const rows = Object.entries(changes)
    .map(
      ([key, value]) => `
    <tr>
      <td>${fieldLabelMap[key] ?? key}</td>
      <td>${value.from}</td>
      <td>${value.to}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Atualização de Boletim de Ocorrência</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Atualização de Boletim de Ocorrência</h1>
        </div>
        <div class="content">
          <p>Prezado(a) <strong>${fullName}</strong>,</p>
          <p>O Boletim de Ocorrência <strong>${boId}</strong> foi atualizado.</p>
          <p><strong>Responsável pela alteração:</strong> ${policeIdentifier}</p>
          <p><strong>Data da alteração:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          <h3>Detalhes das alterações:</h3>
          <table class="diff-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor Anterior</th>
                <th>Valor Atual</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p>Se você não reconhece esta alteração, entre em contato imediatamente.</p>
        </div>
        <div class="footer">
          <p>Este é um e-mail automático. Por favor, não responda.</p>
          <p>Caso deseje parar de receber notificações, entre em contato com a ouvidoria.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getDeletionEmailTemplate = (
  fullName: string,
  boId: string,
  reason: string,
  policeIdentifier: string,
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Exclusão de Boletim de Ocorrência</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Exclusão de Boletim de Ocorrência</h1>
        </div>
        <div class="content">
          <p>Prezado(a) <strong>${fullName}</strong>,</p>
          <p>Informamos que o Boletim de Ocorrência <strong>${boId}</strong> foi excluído do nosso sistema.</p>
          <p><strong>Responsável pela exclusão:</strong> ${policeIdentifier}</p>
          <p><strong>Data da exclusão:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          <p><strong>Motivo da exclusão:</strong> ${reason}</p>
          <p>Caso tenha dúvidas ou acredite que isso seja um erro, por favor, compareça à delegacia mais próxima.</p>
        </div>
        <div class="footer">
          <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

async function sendEmailWithRetry(
  params: any,
  retries = 3,
): Promise<{ data: any; error: any }> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await resend.emails.send(params);
      if (!result.error) return { data: result.data, error: null };
      console.warn(`Tentativa ${i + 1} falhou:`, result.error);
    } catch (err) {
      console.warn(`Tentativa ${i + 1} falhou com exceção:`, err);
      if (i === retries - 1) return { data: null, error: err };
    }
    // Espera exponencial simples: 1s, 2s, 4s...
    await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  return { data: null, error: "Falha após múltiplas tentativas" };
}

/**
 * Envia um e-mail com o PDF do B.O. anexado
 * @param recipientEmail E-mail do destinatário
 * @param fullName Nome completo do destinatário
 * @param boId ID do Boletim de Ocorrência
 * @param pdfPath Caminho para o arquivo PDF
 * @returns Objeto com status do envio
 */
export async function sendBoConfirmationEmail(
  recipientEmail: string,
  fullName: string,
  boId: string,
  pdfBuffer: Buffer,
  telegramDeepLink?: string,
) {
  try {
    const { data, error } = await sendEmailWithRetry({
      from: env.EMAIL_FROM || "boletim@seusistema.com",
      to: recipientEmail,
      subject: "Confirmação de Registro de Boletim de Ocorrência",
      html: getEmailTemplate(fullName, boId, telegramDeepLink),
      attachments: [
        {
          filename: `BO_${boId}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: error ? "error" : "success",
      errorMessage:
        error instanceof Error ? String(error) : (error as any)?.message,
      type: "confirmation",
    };

    emailLogs.push(log);

    if (error) {
      console.error("Erro ao enviar e-mail:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: "error",
      errorMessage:
        error instanceof Error ? error.message : "Erro desconhecido",
      type: "confirmation",
    };

    emailLogs.push(log);

    console.error("Erro ao enviar e-mail:", error);
    return { success: false, error };
  }
}

/**
 * Envia um e-mail notificando a atualização do B.O.
 */
export async function sendBoUpdateEmail(
  recipientEmail: string,
  fullName: string,
  boId: string,
  changes: Record<string, { from: any; to: any }>,
  policeIdentifier: string,
) {
  try {
    const { data, error } = await sendEmailWithRetry({
      from: env.EMAIL_FROM || "boletim@seusistema.com",
      to: recipientEmail,
      subject: `Atualização no Boletim de Ocorrência ${boId}`,
      html: getUpdateEmailTemplate(fullName, boId, changes, policeIdentifier),
    });

    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: error ? "error" : "success",
      errorMessage:
        error instanceof Error ? String(error) : (error as any)?.message,
      type: "update",
    };
    emailLogs.push(log);

    if (error) {
      console.error("Erro ao enviar e-mail de atualização:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: "error",
      errorMessage:
        error instanceof Error ? error.message : "Erro desconhecido",
      type: "update",
    };
    emailLogs.push(log);
    console.error("Erro ao enviar e-mail de atualização:", error);
    return { success: false, error };
  }
}

/**
 * Envia um e-mail notificando a exclusão do B.O.
 */
export async function sendBoDeletionEmail(
  recipientEmail: string,
  fullName: string,
  boId: string,
  reason: string,
  policeIdentifier: string,
) {
  try {
    const { data, error } = await sendEmailWithRetry({
      from: env.EMAIL_FROM || "boletim@seusistema.com",
      to: recipientEmail,
      subject: `Exclusão do Boletim de Ocorrência ${boId}`,
      html: getDeletionEmailTemplate(fullName, boId, reason, policeIdentifier),
    });

    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: error ? "error" : "success",
      errorMessage:
        error instanceof Error ? String(error) : (error as any)?.message,
      type: "deletion",
    };
    emailLogs.push(log);

    if (error) {
      console.error("Erro ao enviar e-mail de exclusão:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: "error",
      errorMessage:
        error instanceof Error ? error.message : "Erro desconhecido",
      type: "deletion",
    };
    emailLogs.push(log);
    console.error("Erro ao enviar e-mail de exclusão:", error);
    return { success: false, error };
  }
}

/**
 * Obtém os logs de envio de e-mail
 * @returns Array com os logs de envio
 */
export function getEmailLogs() {
  return emailLogs;
}
