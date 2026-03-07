import donorRepository from '../repositories/donorRepository.js';

const donorController = {

  async getDonors(req, res) {
    const search = req.query.search
    try {
      const donors = await donorRepository.getDonors(search);
      res.json(donors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getDonorDetail(req, res) {
    try {
      const id = req.params.id;

      const donor = await donorRepository.getById(id);

      if (!donor) {
        return res.status(404).json({ error: "Donor not found" });
      }

      res.json(donor);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateDonorDetail(req, res){
    const id = req.prams.id;
    try{
      const result = await donorRepository.updateDonor(id, req.body);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Donation not found" })
      }
      res.json({ message: "Donation updated successfully" })
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  },

  async sendThankYouEmail(req, res){
    const donorId = req.params.id
    try {
      await donorRepository.sendThankYouEmail(donorId)
      res.json({ message: "Email sent successfully" })
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  },
  async downloadThankYouTemplate(req, res) {
    const donorId = req.params.id
  
    const template = await donorRepository.getThankYouTemplate(donorId)
  
    res.setHeader("Content-Type", "text/plain")
    res.send(template)
  },

  async deleteDonor(req, res){
    const donorId = req.params.id
    try{
      const result = await donorRepository.deleteDonor(donorId)
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Donor not found" })
      }
    
      res.json({ message: "Donor deleted successfully" })
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async createDonor(req, res){
    
  }
};

export default donorController;