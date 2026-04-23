import { pool } from '../config/database.js';

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [uid, email, firstname, lastname]);
    return { id: result.insertId, uid, email, isApproved: false, isAdmin: false };
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    await pool.execute(
      `INSERT IGNORE INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`,
      [uid, email, firstname, lastname],
    );
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS firebaseUid, email, firstname, lastname, is_approved AS isApproved, is_admin AS isAdmin FROM users WHERE firebase_uid = ?`;
    const [rows] = await pool.execute(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS firebaseUid, email, firstname, lastname, is_approved AS isApproved, is_admin AS isAdmin FROM users ORDER BY email ASC`;
    const [rows] = await pool.execute(sql);
    return rows;
  },

  async setApproved(uid, isApproved) {
    await pool.execute(`UPDATE users SET is_approved = ? WHERE firebase_uid = ?`, [isApproved, uid]);
    return this.findByUid(uid);
  },

  async setAdmin(uid, isAdmin) {
    await pool.execute(`UPDATE users SET is_admin = ? WHERE firebase_uid = ?`, [isAdmin, uid]);
    return this.findByUid(uid);
  },
};
