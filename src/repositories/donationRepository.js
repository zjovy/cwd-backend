import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const donationRepository = {
  getDonations: (opts) => provider.getDonations(opts),
  getById: (id) => provider.getById(id),
  createDonation: (data) => provider.createDonation(data),
  updateDonation: (id, body) => provider.updateDonation(id, body),
  updateReceiptStatus: (id, status) => provider.updateReceiptStatus(id, status),
  deleteDonation: (id) => provider.deleteDonation(id),
};

export default donationRepository;
