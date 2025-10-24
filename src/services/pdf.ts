import PDFDocument from 'pdfkit';

export async function generatePdf(boData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => {
        chunks.push(chunk as Buffer)
      })
      doc.on('error', reject)
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      // Cabeçalho
      doc.fontSize(20).text('BOLETIM DE OCORRÊNCIA', { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text(`Número do B.O.: ${boData.id}`, { align: 'center' })
      doc.moveDown()

      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke()
      doc.moveDown()

      // Conteúdo
      doc.fontSize(14).text('DADOS DA OCORRÊNCIA', { underline: true })
      doc.moveDown()

      doc.fontSize(12).text(`Data e Hora: ${formatDate(boData.date_and_time_of_event)}`)
      doc.text(`Local: ${boData.place_of_the_fact}`)
      doc.text(`Tipo de Ocorrência: ${boData.type_of_occurrence}`)
      doc.moveDown()

      doc.fontSize(14).text('DADOS DO COMUNICANTE', { underline: true })
      doc.moveDown()

      doc.fontSize(12).text(`Nome Completo: ${boData.full_name}`)
      if (boData.cpf_or_rg) doc.text(`CPF/RG: ${boData.cpf_or_rg}`)
      if (boData.date_of_birth) doc.text(`Data de Nascimento: ${new Date(boData.date_of_birth).toLocaleDateString('pt-BR')}`)
      if (boData.gender) doc.text(`Gênero: ${boData.gender}`)
      if (boData.nationality) doc.text(`Nacionalidade: ${boData.nationality}`)
      if (boData.marital_status) doc.text(`Estado Civil: ${boData.marital_status}`)
      if (boData.profession) doc.text(`Profissão: ${boData.profession}`)
      if (boData.full_address) doc.text(`Endereço: ${boData.full_address}`)
      if (boData.phone_or_cell_phone) doc.text(`Telefone/Celular: ${boData.phone_or_cell_phone}`)
      if (boData.email) doc.text(`E-mail: ${boData.email}`)
      doc.text(`Relação com o Fato: ${boData.relationship_with_the_fact}`)
      doc.moveDown()

      if (boData.transcription) {
        doc.fontSize(14).text('RELATO DA OCORRÊNCIA', { underline: true })
        doc.moveDown()
        doc.fontSize(12).text(boData.transcription)
        doc.moveDown()
      }

      doc.fontSize(10).text(`Boletim registrado em: ${formatDate(boData.created_at)}`, { align: 'center' })
      doc.text('Este documento é um registro oficial.', { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
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