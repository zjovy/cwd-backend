import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES ($1, $2, $3, $4) RETURNING id`;
    const { rows } = await pgPool.query(sql, [uid, email, firstname, lastname]);
    return { id: rows[0].id, uid, email, isApproved: false, isAdmin: false };
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    await pgPool.query(
      `INSERT INTO users (firebase_uid, email, firstname, lastname)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid) DO NOTHING`,
      [uid, email, firstname, lastname],
    );
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS "firebaseUid", email, firstname, lastname, is_approved AS "isApproved", is_admin AS "isAdmin" FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS "firebaseUid", email, firstname, lastname, is_approved AS "isApproved", is_admin AS "isAdmin" FROM users ORDER BY email ASC`;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async setApproved(uid, isApproved) {
    await pgPool.query(`UPDATE users SET is_approved = $1 WHERE firebase_uid = $2`, [isApproved, uid]);
    return this.findByUid(uid);
  },

  async setAdmin(uid, isAdmin) {
    await pgPool.query(`UPDATE users SET is_admin = $1 WHERE firebase_uid = $2`, [isAdmin, uid]);
    return this.findByUid(uid);
  },
};
