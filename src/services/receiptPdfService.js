import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

import { formatDonationAmount } from '../utils/receiptTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../assets/logo.png');

function formatDonationDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderLabelValue(doc, label, value, x, y) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text(label, x, y);
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#111827')
    .text(value || '-', x, y + 14);
}

export function buildReceiptPdf({ donation, message }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: 'LETTER' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 54, 44, { width: 190 });
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#111827')
      .text('Donation Receipt', 54, 128);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6b7280')
      .text('C&W Market Foundation', 54, 158);

    doc.roundedRect(54, 190, 504, 76, 6).fillAndStroke('#f9fafb', '#e5e7eb');

    renderLabelValue(
      doc,
      'Donor',
      `${donation.first_name} ${donation.last_name}`,
      74,
      210
    );
    renderLabelValue(
      doc,
      'Amount',
      `$${formatDonationAmount(donation.amount)}`,
      254,
      210
    );
    renderLabelValue(
      doc,
      'Donation Date',
      formatDonationDate(donation.donation_date),
      392,
      210
    );

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text(message, 54, 304, {
        align: 'left',
        lineGap: 6,
        width: 504,
      });

    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .text('Thank you for supporting C&W Market Foundation.', 54, 720, {
        align: 'center',
        width: 504,
      });

    doc.end();
  });
}
