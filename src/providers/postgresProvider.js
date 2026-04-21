import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, username, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, username, email, firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const { rows } = await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return { id: rows[0].id, uid, username, email, isApproved: false };
  },

  async upsertUser({ uid, username, email, firstname, lastname }) {
    const sql = `
      INSERT INTO users (firebase_uid, username, email, firstname, lastname)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email = EXCLUDED.email,
        firstname = EXCLUDED.firstname,
        lastname = EXCLUDED.lastname;
    `;
    await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS "firebaseUid", username, email, firstname, lastname, is_approved AS "isApproved" FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const { rows } = await pgPool.query(`SELECT username, email, firstname, lastname, is_approved AS "isApproved" FROM users ORDER BY username ASC`);
    return rows;
  },

  async updateUser(uid, updateData) {
    if (updateData.isApproved !== undefined) {
      const sql = `UPDATE users SET is_approved = $1 WHERE firebase_uid = $2 RETURNING id, firebase_uid AS "firebaseUid", username, email, firstname, lastname, is_approved AS "isApproved"`;
      const { rows } = await pgPool.query(sql, [updateData.isApproved, uid]);
      return rows[0] || null;
    }
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS "firebaseUid", username, email, firstname, lastname, is_approved AS "isApproved", is_admin AS "isAdmin" FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },
};