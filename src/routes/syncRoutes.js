import express from 'express';

import syncController from '../controllers/syncController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';
import syncAuthMiddleware from '../middleware/syncAuthMiddleware.js';

const router = express.Router();

router.post('/stripe', syncAuthMiddleware, syncController.syncStripe);
router.post(
  '/stripe/trigger',
  authMiddleware,
  requireApprovalMiddleware,
  syncController.syncStripeManual
);
router.get('/stripe/last', authMiddleware, syncController.getLastSync);

export default router;
