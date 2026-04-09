import dashboardRepository from '../repositories/dashboardRepository.js';

const dashboardController = {

  async getDashboardSummary(req, res) {
    try {
      const summary = await dashboardRepository.getDashboardSummary();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getDonationTrend(req, res) {
    try {
      const trend = await dashboardRepository.getDonationTrend();
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getLast6MonthsDonations(_req, res) {
    try {
      const data = await dashboardRepository.getLast6MonthsDonations();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getRecentDonations(req, res) {
    try {
      const donations = await dashboardRepository.getRecentDonations();
      res.json(donations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

};

export default dashboardController;
