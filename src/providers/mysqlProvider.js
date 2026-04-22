import { pool } from '../config/database.js';

export default {
  async createUser({ uid, username, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, username, email, firstname, lastname) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [uid, username, email, firstname, lastname]);
    return { id: result.insertId, uid, username, email, isApproved: false };
  },

  async upsertUser({ uid, username, email, firstname, lastname }) {
    const sql = `
      INSERT INTO users (firebase_uid, username, email, firstname, lastname)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        firstname = VALUES(firstname),
        lastname = VALUES(lastname);
    `;
    await pool.execute(sql, [uid, username, email, firstname, lastname]);
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS firebaseUid, username, email, firstname, lastname, is_approved AS isApproved, is_admin AS isAdmin FROM users WHERE firebase_uid = ?`;
    const [rows] = await pool.execute(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS firebaseUid, username, email, firstname, lastname, is_approved AS isApproved, is_admin AS isAdmin FROM users ORDER BY username ASC`;
    const [rows] = await pool.execute(sql);
    return rows;
  },

  async updateUser(uid, updateData) {
    const fields = [];
    const values = [];

    if (updateData.isApproved !== undefined) {
      fields.push('is_approved = ?');
      values.push(updateData.isApproved);
    }
    if (updateData.isAdmin !== undefined) {
      fields.push('is_admin = ?');
      values.push(updateData.isAdmin);
    }

    if (fields.length === 0) return this.findByUid(uid);

    values.push(uid);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE firebase_uid = ?`;
    await pool.execute(sql, values);
    return this.findByUid(uid);
  },
};