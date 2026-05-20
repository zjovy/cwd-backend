import mysqlProvider from '../providers/mysqlProvider.js';

const provider = mysqlProvider;

const syncMetaRepository = {
  setLastSync: (key) => provider.setLastSync(key),
  getLastSync: (key) => provider.getLastSync(key),
};

export default syncMetaRepository;
