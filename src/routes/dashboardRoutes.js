import express from 'express';

import dashboardController from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requireApprovalMiddleware);

router.get('/summary', dashboardController.getDashboardSummary);

router.get('/trend', dashboardController.getDonationTrend);

router.get('/last6months', dashboardController.getLast6MonthsDonations);

router.get('/range-summary', dashboardController.getRangeSummary);

router.get('/range-trend', dashboardController.getRangeTrend);

export default router;
