import donorRepository from '../repositories/donorRepository.js';

const donorController = {

  async getDonors(req, res) {
    const { search, page, limit } = req.query
    try {
      const {rows, total } = await donorRepository.getDonors({search, page, limit});
      res.json({donors: rows, total});
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
    const id = req.params.id;
    try{
      const result = await donorRepository.updateDonor(id, req.body);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Donor not found" })
      }
      res.json({ message: "Donor updated successfully" })
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
    try {
      const result = await donorRepository.createDonor(req.body)
      res.status(201).json({ message: 'Donor created successfully', id: result.insertId })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
};

export default donorController;