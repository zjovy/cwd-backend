import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const donationRepository = {
  getDonations: (opts) => provider.getDonations(opts),
  getById: (id) => provider.getById(id),
  createDonation: (data) => provider.createDonation(data),
  updateDonation: (id, body) => provider.updateDonation(id, body),
  deleteDonation: (id) => provider.deleteDonation(id),
  getMaxStripeCreatedAt: () => provider.getMaxStripeCreatedAt(),
  existsByStripeId: (id) => provider.existsByStripeId(id),
  createStripeDonation: (data) => provider.createStripeDonation(data),
};

export default donationRepository;
