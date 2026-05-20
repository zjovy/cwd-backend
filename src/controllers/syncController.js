import stripeSyncService from '../services/stripeSyncService.js';
import syncMetaRepository from '../repositories/syncMetaRepository.js';

async function runSyncCron(_req, res) {
  try {
    const result = await stripeSyncService.sync();
    const status = result.errors.length > 0 ? 500 : 200;
    res.status(status).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function runSyncManual(_req, res) {
  try {
    const result = await stripeSyncService.sync();
    const status = result.errors.length > 0 ? 207 : 200;
    res.status(status).json(result);
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
  syncStripe: runSyncCron,
  syncStripeManual: runSyncManual,
  getLastSync,
};

export default syncController;
