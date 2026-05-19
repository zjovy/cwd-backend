import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

import { formatDonationAmount } from '../utils/receiptTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS = path.resolve(__dirname, '../assets');
const logoPath = path.join(ASSETS, 'logo.png');
const fontsDir = path.join(ASSETS, 'fonts');

// 1 inch margins matching the docx
const MARGIN = 72;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Paragraph spacing: 240 twips = 12pt (matches docx spacing before/after)
const PARA_GAP = 12;

function ordinalDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const v = day % 100;
  const suffix = ['th', 'st', 'nd', 'rd'];
  const ord = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  return `${month} ${day}${ord}, ${year}`;
}

function registerFonts(doc) {
  const regular = path.join(fontsDir, 'OpenSans-regular.ttf');
  if (fs.existsSync(regular)) {
    doc.registerFont('OpenSans', regular);
    doc.registerFont('OpenSans-Bold', path.join(fontsDir, 'OpenSans-bold.ttf'));
    doc.registerFont(
      'OpenSans-Italic',
      path.join(fontsDir, 'OpenSans-italic.ttf')
    );
    return 'OpenSans';
  }
  // Fallback to built-in Helvetica
  return 'Helvetica';
}

export function buildReceiptPdf({ donation, message }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'LETTER' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const font = registerFonts(doc);
    const fontItalic =
      font === 'OpenSans' ? 'OpenSans-Italic' : 'Helvetica-Oblique';

    // --- Logo (top left, smaller, above everything) ---
    const logoHeight = fs.existsSync(logoPath)
      ? doc.image(logoPath, MARGIN, MARGIN, { width: 210 }).y
      : MARGIN;

    // --- Address block (below logo, right-aligned, 12pt) ---
    const addrY = MARGIN + 55;
    doc
      .font(font)
      .fontSize(12)
      .fillColor('#000000')
      .text('1901 Church Street', MARGIN, addrY, {
        align: 'right',
        width: CONTENT_WIDTH,
      })
      .text('Evanston, IL 60201', { align: 'right', width: CONTENT_WIDTH })
      .text('info@cwmarketfoundation.org', {
        align: 'right',
        width: CONTENT_WIDTH,
      });

    const bodyStart = Math.max(logoHeight, addrY + 50);

    // --- Spacer ---
    let y = bodyStart;

    // --- Date (11pt, left) ---
    y += PARA_GAP;
    doc
      .font(font)
      .fontSize(11)
      .fillColor('#000000')
      .text(ordinalDate(donation.donation_date), MARGIN, y);
    y = doc.y + PARA_GAP;

    // --- Spacer ---
    y += PARA_GAP;

    // --- Empty paragraph ---
    y += PARA_GAP;

    // --- Body message (11pt, left, 1.15x line spacing) ---
    // Strip any trailing closing block (Sincerely / With gratitude / signatures)
    // since the PDF renders its own formal closing below.
    const CLOSING_PATTERN =
      /^(sincerely|with gratitude|the c&w market foundation)/i;
    const allLines = message.split('\n');
    const lastClosingIdx = allLines.findLastIndex((l) =>
      CLOSING_PATTERN.test(l.trim())
    );
    const lines =
      lastClosingIdx !== -1 ? allLines.slice(0, lastClosingIdx) : allLines;
    for (const line of lines) {
      if (line.trim() === '') {
        y += PARA_GAP * 2;
      } else {
        doc.font(font).fontSize(11).fillColor('#000000').text(line, MARGIN, y, {
          align: 'left',
          lineGap: 2.3, // ~1.15x line spacing at 11pt
          width: CONTENT_WIDTH,
        });
        y = doc.y + PARA_GAP;
      }
    }

    // --- Empty paragraph before closing ---
    y += PARA_GAP;

    // --- Closing ---
    doc
      .font(font)
      .fontSize(11)
      .fillColor('#000000')
      .text('With gratitude,', MARGIN, y);
    y = doc.y + PARA_GAP;

    doc.font(font).fontSize(11).text('Clarence and Wendy Weaver', MARGIN, y);
    y = doc.y + 2;

    doc.font(fontItalic).fontSize(10).text('Co-Founders', MARGIN, y);
    y = doc.y + PARA_GAP * 2;

    doc.font(font).fontSize(11).text('Sydni Craig', MARGIN, y);
    y = doc.y + 2;

    doc.font(fontItalic).fontSize(10).text('Board President', MARGIN, y);

    // --- Footer (Calibri → Helvetica fallback, 9pt italic, left-aligned) ---
    doc
      .font(fontItalic)
      .fontSize(9)
      .fillColor('#000000')
      .text(
        'The C&W Market Foundation is a 501(c)(3), tax-exempt organization ' +
          'Federal EIN #82-2114121. We acknowledge that no goods or services ' +
          'were provided in exchange for your donation. Retain this letter for ' +
          'income tax purposes.',
        MARGIN,
        PAGE_HEIGHT - MARGIN - 36,
        { align: 'left', width: CONTENT_WIDTH }
      );

    doc.end();
  });
}
