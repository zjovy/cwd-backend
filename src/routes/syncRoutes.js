import express from 'express';

import syncController from '../controllers/syncController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import syncAuthMiddleware from '../middleware/syncAuthMiddleware.js';

const router = express.Router();

router.post('/stripe', syncAuthMiddleware, syncController.syncStripe);
router.post('/stripe/trigger', authMiddleware, syncController.syncStripeManual);

export default router;
