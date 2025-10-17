import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { env } from '../env.js';

/**
 * Gera um PDF com os dados do Boletim de Ocorrência
 * @param boData Dados do Boletim de Ocorrência
 * @returns Caminho do arquivo PDF gerado
 */
export async function generatePdf(boData: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Cria o diretório de PDFs se não existir
      const pdfDir = path.join(process.cwd(), 'uploads', 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Define o caminho do arquivo PDF
      const pdfPath = path.join(pdfDir, `BO_${boData.id}.pdf`);
      
      // Cria um novo documento PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Pipe o PDF para um arquivo
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      
      // Adiciona o cabeçalho
      doc.fontSize(20).text('BOLETIM DE OCORRÊNCIA', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Número do B.O.: ${boData.id}`, { align: 'center' });
      doc.moveDown();
      
      // Adiciona uma linha horizontal
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown();
      
      // Adiciona os dados do B.O.
      doc.fontSize(14).text('DADOS DA OCORRÊNCIA', { underline: true });
      doc.moveDown();
      
      doc.fontSize(12).text(`Data e Hora: ${formatDate(boData.date_and_time_of_event)}`);
      doc.text(`Local: ${boData.place_of_the_fact}`);
      doc.text(`Tipo de Ocorrência: ${boData.type_of_occurrence}`);
      doc.moveDown();
      
      doc.fontSize(14).text('DADOS DO COMUNICANTE', { underline: true });
      doc.moveDown();
      
      doc.fontSize(12).text(`Nome Completo: ${boData.full_name}`);
      if (boData.cpf_or_rg) doc.text(`CPF/RG: ${boData.cpf_or_rg}`);
      if (boData.date_of_birth) doc.text(`Data de Nascimento: ${new Date(boData.date_of_birth).toLocaleDateString('pt-BR')}`);
      if (boData.gender) doc.text(`Gênero: ${boData.gender}`);
      if (boData.nationality) doc.text(`Nacionalidade: ${boData.nationality}`);
      if (boData.marital_status) doc.text(`Estado Civil: ${boData.marital_status}`);
      if (boData.profession) doc.text(`Profissão: ${boData.profession}`);
      if (boData.full_address) doc.text(`Endereço: ${boData.full_address}`);
      if (boData.phone_or_cell_phone) doc.text(`Telefone/Celular: ${boData.phone_or_cell_phone}`);
      if (boData.email) doc.text(`E-mail: ${boData.email}`);
      doc.text(`Relação com o Fato: ${boData.relationship_with_the_fact}`);
      doc.moveDown();
      
      // Adiciona a transcrição, se existir
      if (boData.transcription) {
        doc.fontSize(14).text('RELATO DA OCORRÊNCIA', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(boData.transcription);
        doc.moveDown();
      }
      
      // Adiciona o rodapé
      doc.fontSize(10).text(`Boletim registrado em: ${formatDate(boData.created_at)}`, { align: 'center' });
      doc.text('Este documento é um registro oficial.', { align: 'center' });
      
      // Finaliza o PDF
      doc.end();
      
      // Resolve a promessa quando o stream for fechado
      stream.on('finish', () => {
        resolve(pdfPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Formata uma data para exibição
 * @param date Data a ser formatada
 * @returns String formatada da data
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}