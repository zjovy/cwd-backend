import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const userRepository = {
  createUser: (userData) => provider.createUser(userData),
  findByUid: (uid) => provider.findByUid(uid),
  getAll: () => provider.getAll(),
  findOrCreate: (userData) => provider.findOrCreate(userData),
  setApproved: (uid, isApproved) => provider.setApproved(uid, isApproved),
  setAdmin: (uid, isAdmin) => provider.setAdmin(uid, isAdmin),
};

export default userRepository;
