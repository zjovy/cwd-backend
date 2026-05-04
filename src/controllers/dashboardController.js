import dashboardRepository from '../repositories/dashboardRepository.js';

const dashboardController = {
  async getDashboardSummary(req, res) {
    try {
      const summary = await dashboardRepository.getDashboardSummary();
      res.json(summary);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDonationTrend(req, res) {
    try {
      const trend = await dashboardRepository.getDonationTrend();
      res.json(trend);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getLast6MonthsDonations(_req, res) {
    try {
      const data = await dashboardRepository.getLast6MonthsDonations();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default dashboardController;
