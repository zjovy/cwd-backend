import stripeSyncService from '../services/stripeSyncService.js';

async function runSync(_req, res) {
  try {
    const result = await stripeSyncService.sync();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

const syncController = {
  syncStripe: runSync,
  syncStripeManual: runSync,
};

export default syncController;
