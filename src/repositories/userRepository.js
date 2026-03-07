import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const userRepository = {
  createUser: (userData) => provider.createUser(userData),
  findByUid: (uid) => provider.findByUid(uid),
  getAll: () => provider.getAll(),
  upsertUser: (userData) => provider.upsertUser(userData),
};

export default userRepository;
