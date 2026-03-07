import express from 'express';
import donationController from '../controllers/donationController.js';

const router = express.Router();

router.get('/', donationController.getDonations);
router.get('/:id', donationController.getDonationDetail);
router.put('/:id', donationController.updateDonation);
router.post('/:id', donationController.createDonation);
router.delete("/:id", donationController.deleteDonation);

export default router;