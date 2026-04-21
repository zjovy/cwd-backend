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
    const sql = `SELECT id, firebase_uid AS firebaseUid, username, email, firstname, lastname, is_approved AS isApproved, is_admin AS "isAdmin" FROM users WHERE firebase_uid = ?`;
    const [rows] = await pool.execute(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await pool.execute(`SELECT username, email, firstname, lastname, is_approved AS isApproved FROM users ORDER BY username ASC`);
    return rows;
  },

  async updateUser(uid, updateData) {
    if (updateData.isApproved !== undefined) {
      const sql = `UPDATE users SET is_approved = ? WHERE firebase_uid = ?`;
      await pool.execute(sql, [updateData.isApproved, uid]);
    }

    return this.findByUid(uid);
  },
};