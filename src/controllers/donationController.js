import donationRepository from '../repositories/donationRepository.js';

const donationController = {

  async getDonations(req, res) {
    try {
      const { search, status, minAmount, maxAmount, page, limit } = req.query
      const { rows, total } = await donationRepository.getDonations({
        search,
        status,
        minAmount,
        maxAmount,
        page,
        limit,
      })
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
        return res.status(404).json({ error: "Donation not found" });
      }

      res.json(donation);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateDonation(req, res) {
    const id = req.params.id
    try {
      const result = await donationRepository.updateDonation(id, req.body)
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Donation not found" });
      }
      res.json({ message: "Donation updated successfully" })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  async deleteDonation(req, res) {
    const id = req.params.id
    try {
      const result = await donationRepository.deleteDonation(id)
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Donation not found" });
      }
      res.json({ message: "Donation deleted successfully" })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async sendReceipt(req, res) {
    try {
      const donation = await donationRepository.getById(req.params.id);
      if (!donation) return res.status(404).json({ error: 'Donation not found' });

      const body = req.body?.body || [
        `Dear ${donation.donor_name},`,
        '',
        `The C&W Market Foundation has received your generous gift of $${parseFloat(donation.amount).toLocaleString()} to support our annual efforts. Your contribution makes a meaningful difference in the work we do for our community.`,
        '',
        'Thank you for your generosity and continued support.',
        '',
        'Sincerely,',
        'The C&W Market Foundation',
      ].join('\n');

      // TODO: configure a real email transport (e.g. nodemailer + SMTP/SendGrid)
      console.log(`[send-receipt] To: ${donation.donor_email}\n${body}`);

      res.json({ message: `Receipt sent to ${donation.donor_email}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async createDonation(req, res) {
    try {
      const { donor_name, amount } = req.body;
      
      if (!donor_name || !amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'donor_name and a positive amount are required' });
      }
      
      const result = await donationRepository.createDonation(req.body)
      res.status(201).json({ message: 'Donation created successfully', id: result.insertId })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

};

export default donationController;