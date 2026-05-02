import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const p = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const donorRepository = {
  getDonors: (opts) => p.getDonors(opts),
  getById: (id) => p.getDonorById(id),
  createDonor: (data) => p.createDonor(data),
  updateDonor: (id, body) => p.updateDonor(id, body),
  deleteDonor: (id) => p.deleteDonor(id),
  upsertByEmail: (data) => p.upsertDonorByEmail(data),
  findOrCreateByEmail: (data) => p.findOrCreateDonorByEmail(data),

  async sendThankYouEmail() {
    throw new Error('Not implemented');
  },
  async getThankYouTemplate() {
    throw new Error('Not implemented');
  },
};

export default donorRepository;
