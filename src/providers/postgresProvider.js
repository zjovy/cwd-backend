import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES ($1, $2, $3, $4) RETURNING id`;
    const { rows } = await pgPool.query(sql, [uid, email, firstname, lastname]);
    return { id: rows[0].id, uid, email, isApproved: false, isAdmin: false };
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    const existing = await this.findByUid(uid);
    if (existing) return existing;
    return this.createUser({ uid, email, firstname, lastname });
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
