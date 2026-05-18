import { Resend } from 'resend';

const DEFAULT_CC_EMAIL = 'info@cwmarketfoundation.org';
const DEFAULT_FROM_EMAIL =
  'C&W Market Foundation <donations@noreply.cwmarketfoundation.org>';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(process.env.RESEND_API_KEY);
}

const emailService = {
  async sendDonationReceipt({ to, subject, html, text, pdf }) {
    const resend = getResendClient();
    const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
    const cc = process.env.RECEIPT_CC_EMAIL || DEFAULT_CC_EMAIL;

    const { data, error } = await resend.emails.send({
      attachments: [
        {
          content: pdf,
          contentType: 'application/pdf',
          filename: 'donation-receipt.pdf',
        },
      ],
      cc,
      from,
      html,
      subject,
      text,
      to,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send receipt email');
    }

    return data;
  },
};

export default emailService;
