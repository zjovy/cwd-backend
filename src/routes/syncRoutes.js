import express from 'express';
import syncController from '../controllers/syncController.js';
import syncAuthMiddleware from '../middleware/syncAuthMiddleware.js';

const router = express.Router();

router.post('/stripe', syncAuthMiddleware, syncController.syncStripe);

export default router;
