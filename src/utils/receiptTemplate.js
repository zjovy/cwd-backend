export const RECEIPT_SUBJECT = 'Donation Receipt - C&W Market Foundation';

export function formatDonationAmount(amount) {
  const value = Number.parseFloat(amount || 0);
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function buildReceiptMessage(donation) {
  return [
    `Dear ${donation.first_name} ${donation.last_name},`,
    '',
    `The C&W Market Foundation has received your generous gift of $${formatDonationAmount(
      donation.amount
    )} to support our annual efforts. Your contribution makes a meaningful difference in the work we do for our community.`,
    '',
    'Thank you for your generosity and continued support.',
    '',
    'Sincerely,',
    'The C&W Market Foundation',
  ].join('\n');
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
