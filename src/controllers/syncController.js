import stripeSyncService from '../services/stripeSyncService.js';
import syncMetaRepository from '../repositories/syncMetaRepository.js';

async function runSync(_req, res) {
  try {
    const result = await stripeSyncService.sync();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function getLastSync(_req, res) {
  try {
    const syncedAt = await syncMetaRepository.getLastSync('stripe_last_sync');
    res.json({ synced_at: syncedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

const syncController = {
  syncStripe: runSync,
  syncStripeManual: runSync,
  getLastSync,
};

export default syncController;
