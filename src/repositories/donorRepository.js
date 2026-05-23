import mysqlProvider from '../providers/mysqlProvider.js';

const p = mysqlProvider;

const donorRepository = {
  getDonors: (opts) => p.getDonors(opts),
  getById: (id) => p.getDonorById(id),
  createDonor: (data) => p.createDonor(data),
  updateDonor: (id, body) => p.updateDonor(id, body),
  deleteDonor: (id) => p.deleteDonor(id),
  findOrCreateByEmail: (data) => p.findOrCreateDonorByEmail(data),

  async sendThankYouEmail() {
    throw new Error('Not implemented');
  },
  async getThankYouTemplate() {
    throw new Error('Not implemented');
  },
};

export default donorRepository;
