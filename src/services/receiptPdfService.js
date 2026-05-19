import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

import { formatDonationAmount } from '../utils/receiptTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, '../assets/logo.png');

const MARGIN = 72;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function ordinalDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${month} ${day}${suffix}, ${year}`;
}

export function buildReceiptPdf({ donation, message }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'LETTER' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // --- Logo (top left) ---
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, MARGIN, MARGIN, { width: 160 });
    }

    // --- Address block (top right) ---
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#111827')
      .text('1901 Church Street', MARGIN, MARGIN, {
        align: 'right',
        width: CONTENT_WIDTH,
      })
      .text('Evanston, IL 60201', { align: 'right', width: CONTENT_WIDTH })
      .text('info@cwmarketfoundation.org', {
        align: 'right',
        width: CONTENT_WIDTH,
      });

    // --- Date (left) ---
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#111827')
      .text(ordinalDate(donation.donation_date), MARGIN, MARGIN + 130);

    // --- Donor name ---
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#111827')
      .text(
        `${donation.first_name} ${donation.last_name}`,
        MARGIN,
        MARGIN + 180
      );

    // --- Body (editable message: salutation + paragraphs) ---
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#111827')
      .text(message, MARGIN, MARGIN + 230, {
        align: 'left',
        lineGap: 4,
        paragraphGap: 12,
        width: CONTENT_WIDTH,
      });

    // --- Closing ---
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#111827')
      .text('With gratitude,', MARGIN, doc.y + 28);

    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(11).text('Clarence and Wendy Weaver');
    doc.font('Helvetica-Oblique').fontSize(11).text('Co-Founders');

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(11).text('Sydni Craig');
    doc.font('Helvetica-Oblique').fontSize(11).text('Board President');

    // --- Footer ---
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor('#6b7280')
      .text(
        'The C&W Market Foundation is a 501(c)(3), tax-exempt organization ' +
          'Federal EIN #82-2114121. We acknowledge that no goods or services ' +
          'were provided in exchange for your donation. Retain this letter for ' +
          'income tax purposes.',
        MARGIN,
        PAGE_HEIGHT - MARGIN - 36,
        { align: 'center', width: CONTENT_WIDTH }
      );

    doc.end();
  });
}
