import donorRepository from '../repositories/donorRepository.js';

const donorController = {

  async getDonors(req, res) {
    const { search, page, limit } = req.query
    try {
      const {rows, total } = await donorRepository.getDonors({search, page, limit});
      res.json({donors: rows, total});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
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
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateDonorDetail(req, res){
    const id = req.params.id;
    try{
      const result = await donorRepository.updateDonor(id, req.body);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Donor not found" })
      }
      res.json({ message: "Donor updated successfully" })
    } catch (err) {
      console.error(err);
      res.status(500).json({error: 'Internal server error'});
    }
  },

  async upsertByEmail(req, res) {
    try {
      await donorRepository.upsertByEmail(req.body);
      res.json({ message: 'Donor contact updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async sendThankYouEmail(req, res){
    const donorId = req.params.id
    try {
      await donorRepository.sendThankYouEmail(donorId)
      res.json({ message: "Email sent successfully" })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }

  },

  async downloadThankYouTemplate(req, res){
    const donorId = req.params.id
    try {
      const template = await donorRepository.getThankYouTemplate(donorId)
      res.setHeader("Content-Type", "text/plain")
      res.send(template)
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteDonor(req, res){
    const donorId = req.params.id
    try {
      const result = await donorRepository.deleteDonor(donorId)
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Donor not found" })
      }
      
      res.json({ message: "Donor deleted successfully" })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createDonor(req, res){
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
      }
      
      const result = await donorRepository.createDonor(req.body)
      res.status(201).json({ message: 'Donor created successfully', id: result.insertId })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' })
    }
  }
};

export default donorController;