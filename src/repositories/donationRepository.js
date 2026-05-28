import mysqlProvider from '../providers/mysqlProvider.js';

const provider = mysqlProvider;

const donationRepository = {
  getDonations: (opts) => provider.getDonations(opts),
  getById: (id) => provider.getById(id),
  getUnsentIds: (filters) => provider.getUnsentIds(filters),
  getUnsentRecipients: (filters) => provider.getUnsentRecipients(filters),
  createDonation: (data) => provider.createDonation(data),
  updateDonation: (id, body) => provider.updateDonation(id, body),
  updateReceiptStatus: (id, status) => provider.updateReceiptStatus(id, status),
  markManyReceiptStatus: (ids, status) =>
    provider.markManyReceiptStatus(ids, status),
  deleteDonation: (id) => provider.deleteDonation(id),
  getMaxStripeCreatedAt: () => provider.getMaxStripeCreatedAt(),
  existsByStripeId: (id) => provider.existsByStripeId(id),
  createStripeDonation: (data) => provider.createStripeDonation(data),
};

export default donationRepository;
