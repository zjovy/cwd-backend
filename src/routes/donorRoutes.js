import express from 'express';

import donorController from '../controllers/donorController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requireApprovalMiddleware);

router.get('/', donorController.getDonors);
router.get('/:id', donorController.getDonorDetail);
router.put('/:id', donorController.updateDonorDetail);
router.delete('/:id', donorController.deleteDonor);
router.post('/', donorController.createDonor);
router.post("/:id/send-thank-you", donorController.sendThankYouEmail);
router.get("/:id/thank-you-template", donorController.downloadThankYouTemplate);

export default router;