import { pool } from '../config/database.js';

const donationRepository = {
  async getDonations({
    search,
    status,
    minAmount,
    maxAmount,
    page = 1,
    limit = 25,
  }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ` AND (d.donor_name LIKE ? OR d.donor_email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      where += ` AND d.receipt_status = ?`;
      params.push(status);
    }

    if (minAmount) {
      where += ` AND d.amount >= ?`;
      params.push(minAmount);
    }

    if (maxAmount) {
      where += ` AND d.amount <= ?`;
      params.push(maxAmount);
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM donations d ${where}`,
        params
      ),
      pool.execute(
        `SELECT d.id, d.donor_name, d.donor_email, d.amount, d.donation_date,
                d.receipt_status, dn.id AS donor_id
         FROM donations d
         LEFT JOIN donors dn ON d.donor_email = dn.email
         ${where}
         ORDER BY d.donation_date DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    return { rows, total: parseInt(countRows[0].total) };
  },

  async getById(id) {
    const sql = `
        SELECT
        d.id,
        d.donor_name,
        d.donor_email,
        d.amount,
        d.donation_date,
        d.receipt_status,
        dn.phone,
        dn.address
        FROM donations d
        LEFT JOIN donors dn
        ON d.donor_email = dn.email
        WHERE d.id = ?
    `;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
  },

  async updateDonation(id, body) {
    const { donor_name, donor_email, amount, donation_date, receipt_status } =
      body;

    const sql = `
      UPDATE donations
      SET donor_name = ?, donor_email = ?, amount = ?, donation_date = ?, receipt_status = ?
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, [
      donor_name,
      donor_email,
      amount,
      donation_date,
      receipt_status,
      id,
    ]);

    return result;
  },

  async deleteDonation(id) {
    const sql = `
      DELETE FROM donations
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, [id]);

    return result;
  },

  async createDonation({
    donor_name,
    donor_email,
    amount,
    donation_date,
    receipt_status,
  }) {
    const sql = `
      INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      donor_name,
      donor_email,
      amount,
      donation_date,
      receipt_status ?? 'pending',
    ]);

    return result;
  },
};

export default donationRepository;
