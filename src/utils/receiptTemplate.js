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
    `Dear ${donation.first_name},`,
    '',
    `The C&W Market Foundation has received your generous gift of $${formatDonationAmount(donation.amount)} to support our annual efforts.`,
    '',
    'Thanks to the donations from our Annual Fundraiser, we were able to provide groceries every two weeks to over 250 families and seniors. These grocery packages included options such as turkeys, hams, or Cornish hens for both Thanksgiving and Christmas holidays.',
    '',
    'All of us at the C&W Market Foundation appreciate our donors. We are very grateful for your contribution!',
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
