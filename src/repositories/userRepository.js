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

async function checkAllowlist(email) {
  try {
    const query = 'SELECT * FROM allowed_users WHERE email = ? AND status IN ("pending", "invited")';
    const result = await db.query(query, [email]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Allowlist check error:', error);
    throw error;
  }
}

async function markUserAsActive(email) {
  const query = 'UPDATE allowed_users SET status = "active" WHERE email = ?';
  return database.query(query, [email]);
}

export default userRepository;
