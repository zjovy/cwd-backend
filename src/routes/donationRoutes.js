import express from 'express';

import donationController from '../controllers/donationController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requireApprovalMiddleware);

router.get('/', donationController.getDonations);
router.get('/:id', donationController.getDonationDetail);
router.post('/:id/send-receipt', donationController.sendReceipt);
router.put('/:id', donationController.updateDonation);
router.post('/', donationController.createDonation);
router.delete("/:id", donationController.deleteDonation);

export default router;