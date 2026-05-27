import donationRepository from '../repositories/donationRepository.js';
import donorRepository from '../repositories/donorRepository.js';
import emailService from '../services/emailService.js';
import { buildReceiptPdf } from '../services/receiptPdfService.js';
import { validateDateRange } from '../utils/dateValidation.js';
import {
  RECEIPT_SUBJECT,
  applyReceiptTemplate,
  buildReceiptMessage,
  messageToHtml,
} from '../utils/receiptTemplate.js';

const donationController = {
  async getDonations(req, res) {
    try {
      const {
        search,
        status,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;
      const dateError = validateDateRange(startDate, endDate);
      if (dateError) return res.status(400).json({ error: dateError });
      const { rows, total } = await donationRepository.getDonations({
        search,
        status,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page,
        limit,
      });
      res.json({ donations: rows, total });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDonationDetail(req, res) {
    try {
      const id = req.params.id;

      const donation = await donationRepository.getById(id);

      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      res.json(donation);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateDonation(req, res) {
    const id = req.params.id;
    try {
      const donorFields = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
      ];
      if (donorFields.some((f) => req.body[f] !== undefined)) {
        return res.status(400).json({
          error:
            'Donor fields cannot be updated via the donation endpoint. Use PUT /donors/:id.',
        });
      }

      const result = await donationRepository.updateDonation(id, req.body);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      res.json({ message: 'Donation updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteDonation(req, res) {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = req.params.id;
    try {
      const result = await donationRepository.deleteDonation(id);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      res.json({ message: 'Donation deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async sendReceipt(req, res) {
    try {
      const donation = await donationRepository.getById(req.params.id);
      if (!donation)
        return res.status(404).json({ error: 'Donation not found' });

      if (!donation.email) {
        return res
          .status(422)
          .json({ error: 'Donor has no email address on file.' });
      }

      const body = req.body?.body
        ? applyReceiptTemplate(String(req.body.body), donation)
        : buildReceiptMessage(donation);
      const pdf = await buildReceiptPdf({ donation, message: body });
      const email = await emailService.sendDonationReceipt({
        html: messageToHtml(body),
        pdf,
        subject: RECEIPT_SUBJECT,
        text: body,
        to: donation.email,
      });

      await donationRepository.updateReceiptStatus(req.params.id, 'sent');

      res.json({
        emailId: email?.id,
        message: `Receipt sent to ${donation.email}`,
        receipt_status: 'sent',
      });
    } catch (err) {
      console.error('[send-receipt] error:', err);
      res
        .status(500)
        .json({ error: 'Failed to send receipt. Please try again.' });
    }
  },

  async sendReceipts(req, res) {
    try {
      const { allUnsent, filters, body } = req.body || {};
      let ids = Array.isArray(req.body?.ids) ? req.body.ids : null;

      if (allUnsent) {
        ids = await donationRepository.getUnsentIds(filters || {});
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'No donations selected to send.' });
      }

      const sharedBody = typeof body === 'string' && body.trim() ? body : null;

      const sent = [];
      const failed = [];

      const donorLabel = (donation) =>
        [donation?.first_name, donation?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Unknown donor';

      for (const rawId of ids) {
        const id = Number(rawId);
        let donation = null;
        try {
          donation = await donationRepository.getById(id);
          if (!donation) {
            failed.push({
              id,
              name: 'Unknown donor',
              email: null,
              error: 'Not found',
            });
            continue;
          }
          if (!donation.email) {
            failed.push({
              id,
              name: donorLabel(donation),
              email: null,
              error: 'No email on file',
            });
            continue;
          }

          const msg = sharedBody
            ? applyReceiptTemplate(sharedBody, donation)
            : buildReceiptMessage(donation);
          const pdf = await buildReceiptPdf({ donation, message: msg });
          await emailService.sendDonationReceipt({
            html: messageToHtml(msg),
            pdf,
            subject: RECEIPT_SUBJECT,
            text: msg,
            to: donation.email,
          });
          await donationRepository.updateReceiptStatus(id, 'sent');
          sent.push(id);
        } catch (err) {
          console.error(`[send-receipts] failed for id ${id}:`, err);
          failed.push({
            id,
            name: donorLabel(donation),
            email: donation?.email || null,
            error: err.message || 'Send failed',
          });
        }
      }

      res.json({ sent, failed, total: ids.length });
    } catch (err) {
      console.error('[send-receipts] error:', err);
      res
        .status(500)
        .json({ error: 'Failed to send receipts. Please try again.' });
    }
  },

  async markReceiptsSent(req, res) {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map((id) => Number(id)).filter((n) => Number.isFinite(n))
        : [];
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No donation ids provided.' });
      }
      const { affectedRows } = await donationRepository.markManyReceiptStatus(
        ids,
        'sent'
      );
      res.json({ updated: affectedRows, ids });
    } catch (err) {
      console.error('[mark-receipts-sent] error:', err);
      res.status(500).json({ error: 'Failed to mark donations as sent.' });
    }
  },

  async createDonation(req, res) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        address,
        amount,
        donation_date,
        receipt_status,
      } = req.body;

      if (!first_name || !last_name || !email || !amount || !donation_date) {
        return res.status(400).json({
          error:
            'first_name, last_name, email, amount, and donation_date are required',
        });
      }

      if (
        isNaN(amount) ||
        Number(amount) <= 0 ||
        !/^\d+(\.\d{1,2})?$/.test(String(amount))
      ) {
        return res.status(400).json({
          error:
            'amount must be a positive number with at most 2 decimal places',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      if (phone) {
        if (/[^\d+() -]/.test(String(phone)))
          return res.status(400).json({ error: 'Invalid phone number format' });
        if (String(phone).replace(/\D/g, '').length < 7)
          return res.status(400).json({ error: 'Invalid phone number format' });
      }

      const donor = await donorRepository.findOrCreateByEmail({
        first_name,
        last_name,
        email,
        phone,
        address,
      });
      const result = await donationRepository.createDonation({
        donor_id: donor.id,
        amount,
        donation_date,
        receipt_status,
      });
      res.status(201).json({
        message: 'Donation created successfully',
        id: result.insertId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default donationController;
