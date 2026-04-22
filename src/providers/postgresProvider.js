import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, username, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, username, email, firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const { rows } = await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return { id: rows[0].id, uid, username, email, isApproved: false, isAdmin: false };
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
    const sql = `SELECT id, firebase_uid AS "firebaseUid", username, email, firstname, lastname, is_approved AS "isApproved", is_admin AS "isAdmin" FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS "firebaseUid", username, email, firstname, lastname, is_approved AS "isApproved", is_admin AS "isAdmin" FROM users ORDER BY username ASC`;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async updateUser(uid, updateData) {
    const fields = [];
    const values = [];
    let i = 1;

    if (updateData.isApproved !== undefined) {
      fields.push(`is_approved = $${i++}`);
      values.push(updateData.isApproved);
    }
    if (updateData.isAdmin !== undefined) {
      fields.push(`is_admin = $${i++}`);
      values.push(updateData.isAdmin);
    }

    if (fields.length === 0) return this.findByUid(uid);

    values.push(uid);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE firebase_uid = $${i}`;
    await pgPool.query(sql, values);
    return this.findByUid(uid);
  },
};
