import { Resend } from 'resend';
import { env } from '../env.ts';
import fs from 'fs';
import path from 'path';

// Inicializa o cliente Resend com a API key
const resend = new Resend(env.RESEND_API_KEY);

// Interface para os logs de envio de e-mail
export interface EmailLog {
  boId: string;
  recipientEmail: string;
  sentAt: Date;
  status: 'success' | 'error';
  errorMessage?: string;
}

// Armazena os logs de envio (em produção, seria melhor usar o banco de dados)
const emailLogs: EmailLog[] = [];

// Template HTML básico para o e-mail
const getEmailTemplate = (fullName: string, boId: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmação de Registro de Boletim de Ocorrência</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #003366; color: white; padding: 10px 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
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
        </div>
        <div class="footer">
          <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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
  pdfPath: string,
) {
  try {
    // Verifica se o arquivo PDF existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF não encontrado: ${pdfPath}`);
    }

    // Lê o arquivo PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Envia o e-mail com o PDF anexado
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM || 'boletim@seusistema.com',
      to: recipientEmail,
      subject: 'Confirmação de Registro de Boletim de Ocorrência',
      html: getEmailTemplate(fullName, boId),
      attachments: [
        {
          filename: `BO_${boId}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    // Registra o log de envio
    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: error ? 'error' : 'success',
      errorMessage: error?.message,
    };
    
    emailLogs.push(log);
    
    // Em produção, salvar o log no banco de dados
    
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    // Registra o erro no log
    const log: EmailLog = {
      boId,
      recipientEmail,
      sentAt: new Date(),
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
    };
    
    emailLogs.push(log);
    
    console.error('Erro ao enviar e-mail:', error);
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