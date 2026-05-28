import express from 'express';

import donationController from '../controllers/donationController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requireApprovalMiddleware);

router.get('/', donationController.getDonations);
router.get('/receipt-template', donationController.getReceiptTemplate);
router.post('/unsent-recipients', donationController.getUnsentRecipients);
router.post('/send-receipts', donationController.sendReceipts);
router.post('/mark-sent', donationController.markReceiptsSent);
router.get('/:id', donationController.getDonationDetail);
router.post('/:id/send-receipt', donationController.sendReceipt);
router.put('/:id', donationController.updateDonation);
router.post('/', donationController.createDonation);
router.delete('/:id', donationController.deleteDonation);

export default router;
