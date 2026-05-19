import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider =
  databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const syncMetaRepository = {
  setLastSync: (key) => provider.setLastSync(key),
  getLastSync: (key) => provider.getLastSync(key),
};

export default syncMetaRepository;
