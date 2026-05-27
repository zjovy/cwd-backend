export const RECEIPT_SUBJECT = 'Donation Receipt - C&W Market Foundation';

export const RECEIPT_FIRST_NAME_PLACEHOLDER = '{{first_name}}';
export const RECEIPT_AMOUNT_PLACEHOLDER = '{{amount}}';

export function formatDonationAmount(amount) {
  const value = Number.parseFloat(amount || 0);
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function buildReceiptMessageTemplate() {
  return [
    `Dear ${RECEIPT_FIRST_NAME_PLACEHOLDER},`,
    '',
    `The C&W Market Foundation has received your generous gift of $${RECEIPT_AMOUNT_PLACEHOLDER} to support our annual efforts.`,
    '',
    'All of us at the C&W Market Foundation appreciate our donors. We are very grateful for your contribution!',
    '',
    'With gratitude,',
    '',
    'Clarence and Wendy Weaver',
    'Co-Founders',
    '',
    'Sydni Craig',
    'Board President',
  ].join('\n');
}

export function applyReceiptTemplate(template, donation) {
  const name = donation?.first_name || 'Donor';
  const amount = formatDonationAmount(donation?.amount);
  return String(template)
    .replaceAll(RECEIPT_FIRST_NAME_PLACEHOLDER, name)
    .replaceAll(RECEIPT_AMOUNT_PLACEHOLDER, amount);
}

export function buildReceiptMessage(donation) {
  return applyReceiptTemplate(buildReceiptMessageTemplate(), donation);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function messageToHtml(message) {
  return escapeHtml(message)
    .split('\n')
    .map((line) => (line ? `<p>${line}</p>` : '<br>'))
    .join('');
}
