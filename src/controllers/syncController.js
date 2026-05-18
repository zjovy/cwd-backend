import stripeSyncService from '../services/stripeSyncService.js';

const syncController = {
  async syncStripe(_req, res) {
    try {
      const result = await stripeSyncService.sync();
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async syncStripeManual(_req, res) {
    try {
      const result = await stripeSyncService.sync();
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
};

export default syncController;
