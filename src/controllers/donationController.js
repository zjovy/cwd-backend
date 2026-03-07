import donationRepository from '../repositories/donationRepository.js';

const donationController = {

  async getDonations(req, res) {
    try {
      const { search, status, minAmount, maxAmount } = req.query
      const donations = await donationRepository.getDonations({
        search,
        status,
        minAmount,
        maxAmount
      })
      res.json(donations);
    } catch (err) {
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  },

  async updateDonation(req, res) {
    const id = req.params.id
    try {
      const result = await donationRepository.updateDonation(id, req.body)
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Donation not found" })
      }
      res.json({ message: "Donation updated successfully" })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
  
  async deleteDonation(req, res) {
    const id = req.params.id
    try {
      const result = await donationRepository.deleteDonation(id)
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Donation not found" })
      }
      res.json({ message: "Donation deleted successfully" })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async createDonation(req, res){
    
  }

};

export default donationController;