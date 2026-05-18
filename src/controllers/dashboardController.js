import dashboardRepository from '../repositories/dashboardRepository.js';
import { validateDateRange } from '../utils/dateValidation.js';

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

  async getRangeSummary(req, res) {
    const { startDate, endDate } = req.query;
    const dateError = validateDateRange(startDate, endDate);
    if (dateError) return res.status(400).json({ error: dateError });
    try {
      const data = await dashboardRepository.getRangeSummary({ startDate, endDate });
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getRangeTrend(req, res) {
    const { startDate, endDate, bucket = 'month' } = req.query;
    if (!['month', 'week', 'day', 'year'].includes(bucket))
      return res.status(400).json({ error: 'bucket must be month, week, day, or year' });
    const dateError = validateDateRange(startDate, endDate);
    if (dateError) return res.status(400).json({ error: dateError });
    try {
      const data = await dashboardRepository.getRangeTrend({ startDate, endDate, bucket });
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default dashboardController;
