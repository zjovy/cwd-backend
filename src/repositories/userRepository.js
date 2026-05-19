import mysqlProvider from '../providers/mysqlProvider.js';

const provider = mysqlProvider;

const userRepository = {
  createUser: (userData) => provider.createUser(userData),
  findByUid: (uid) => provider.findByUid(uid),
  getAll: () => provider.getAll(),
  findOrCreate: (userData) => provider.findOrCreate(userData),
  setRole: (uid, role) => provider.setRole(uid, role),
};

export default userRepository;
