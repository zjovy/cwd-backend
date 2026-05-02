import { pool } from '../config/database.js';
import { emailKey } from '../utils/emailKey.js';

async function syncDonorStats(donorEmail) {
  const key = emailKey(donorEmail);
  if (!key) return;
  await pool.execute(
    `UPDATE donors d
     JOIN (
       SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt, MAX(donation_date) AS recent
       FROM donations
       WHERE LOWER(TRIM(COALESCE(donor_email, ''))) = ?
     ) stats
     SET d.total_donations = stats.total,
         d.donation_count  = stats.cnt,
         d.most_recent     = stats.recent
     WHERE LOWER(TRIM(COALESCE(d.email, ''))) = ?`,
    [key, key]
  );
}

async function ensureDonor(donor_name, donor_email) {
  const key = emailKey(donor_email);
  if (!key) return;
  const storedEmail = String(donor_email).trim() || null;
  await pool.execute(
    `INSERT IGNORE INTO donors (name, email, total_donations, donation_count)
     VALUES (?, ?, 0, 0)`,
    [donor_name ?? '', storedEmail]
  );
  await syncDonorStats(donor_email);
}

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [uid, email, firstname, lastname]);
    return { id: result.insertId, uid, email, role: 'pending' };
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    await pool.execute(
      `INSERT IGNORE INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`,
      [uid, email, firstname, lastname],
    );
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS firebaseUid, email, firstname, lastname, role FROM users WHERE firebase_uid = ?`;
    const [rows] = await pool.execute(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS firebaseUid, email, firstname, lastname, role FROM users ORDER BY email ASC`;
    const [rows] = await pool.execute(sql);
    return rows;
  },

  async setRole(uid, role) {
    await pool.execute(`UPDATE users SET role = ? WHERE firebase_uid = ?`, [role, uid]);
    return this.findByUid(uid);
  },

  async getDonations({ search, status, minAmount, maxAmount, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ` AND (LOWER(d.donor_name) LIKE LOWER(?) OR LOWER(d.donor_email) LIKE LOWER(?))`;
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
      pool.execute(`SELECT COUNT(*) AS total FROM donations d ${where}`, params),
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
    const [rows] = await pool.execute(
      `SELECT d.id, d.donor_name, d.donor_email, d.amount, d.donation_date,
              d.receipt_status, dn.phone, dn.address
       FROM donations d
       LEFT JOIN donors dn ON d.donor_email = dn.email
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async createDonation({ donor_name, donor_email, amount, donation_date, receipt_status }) {
    const donorEmailNormalized =
      donor_email != null && donor_email !== ''
        ? String(donor_email).trim()
        : donor_email;

    const [result] = await pool.execute(
      `INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status)
       VALUES (?, ?, ?, ?, ?)`,
      [donor_name, donorEmailNormalized, amount, donation_date, receipt_status ?? 'pending']
    );

    await ensureDonor(donor_name, donorEmailNormalized);
    return result;
  },

  async updateDonation(id, body) {
    const { donor_name, donor_email, amount, donation_date, receipt_status } = body;

    const conn = await pool.getConnection();
    let result;
    let previousEmail;
    try {
      await conn.beginTransaction();
      const [beforeRows] = await conn.execute(
        `SELECT donor_email FROM donations WHERE id = ? FOR UPDATE`,
        [id]
      );
      previousEmail = beforeRows[0]?.donor_email;
      [result] = await conn.execute(
        `UPDATE donations
         SET donor_name = ?, donor_email = ?, amount = ?, donation_date = ?, receipt_status = ?
         WHERE id = ?`,
        [donor_name, donor_email, amount, donation_date, receipt_status, id]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const emails = new Set(
      [previousEmail, donor_email].filter((e) => e != null && e !== '')
    );
    for (const email of emails) {
      await syncDonorStats(email);
    }

    return result;
  },

  async deleteDonation(id) {
    const [rows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const donorEmail = rows[0]?.donor_email;

    const [result] = await pool.execute(`DELETE FROM donations WHERE id = ?`, [id]);

    if (result.affectedRows > 0 && donorEmail) {
      await syncDonorStats(donorEmail);
    }

    return result;
  },

  async getDonors({ search, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;
    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    const [[countRows], [rows]] = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS total FROM donors ${where}`, params),
      pool.execute(
        `SELECT id, name, email, address, phone, total_donations, donation_count, most_recent
         FROM donors ${where} ORDER BY most_recent DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);
    return { rows, total: parseInt(countRows[0].total) };
  },

  async getDonorById(id) {
    const [rows] = await pool.execute(
      `SELECT dn.id, dn.name, dn.email, dn.address, dn.phone,
              dn.total_donations, dn.donation_count, dn.most_recent,
              d.amount, d.donation_date
       FROM donors dn
       LEFT JOIN donations d ON dn.email = d.donor_email
       WHERE dn.id = ?`,
      [id]
    );
    if (!rows.length) return null;
    const { id: donorId, name, email, address, phone, total_donations, donation_count, most_recent } = rows[0];
    return {
      id: donorId, name, email, address, phone,
      total_donations, donation_count, most_recent,
      donations: rows
        .filter((r) => r.amount != null)
        .map((r) => ({ amount: r.amount, donation_date: r.donation_date })),
    };
  },

  async updateDonor(id, { name, email, address, phone }) {
    const [existing] = await pool.execute(
      `SELECT email FROM donors WHERE id = ?`,
      [id]
    );
    const previousEmail = existing[0]?.email;
    const [result] = await pool.execute(
      `UPDATE donors SET name = ?, email = ?, address = ?, phone = ? WHERE id = ?`,
      [name, email, address, phone, id]
    );
    if (email && emailKey(email) !== emailKey(previousEmail)) {
      await syncDonorStats(email);
    }
    return result;
  },

  async deleteDonor(donorId) {
    const [result] = await pool.execute(
      `DELETE FROM donors WHERE id = ?`,
      [donorId]
    );
    return result;
  },

  async createDonor({ name, email, address, phone }) {
    const [result] = await pool.execute(
      `INSERT INTO donors (name, email, address, phone, total_donations, donation_count)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [name, email, address, phone]
    );
    return result;
  },

  async getDashboardSummary() {
    const [allTime] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM donations`
    );
    const [thisWeek] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS week_amount, COUNT(*) AS week_count
      FROM donations
      WHERE donation_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);
    const [lastMonth] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS last_month_amount
      FROM donations
      WHERE donation_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 MONTH), '%Y-%m-01')
        AND donation_date < DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
    `);
    const [thisMonth] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS this_month_amount
      FROM donations
      WHERE donation_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    const [donors] = await pool.execute(
      `SELECT COUNT(*) AS total_donors FROM donors`
    );
    const lastMonthAmount = parseFloat(lastMonth[0].last_month_amount);
    const thisMonthAmount = parseFloat(thisMonth[0].this_month_amount);
    const growthRate =
      lastMonthAmount === 0
        ? null
        : (((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100).toFixed(1);
    return {
      total_amount: parseFloat(allTime[0].total_amount),
      week_amount: parseFloat(thisWeek[0].week_amount),
      week_count: parseInt(thisWeek[0].week_count),
      total_donors: parseInt(donors[0].total_donors),
      growth_rate: growthRate,
    };
  },

  async getDonationTrend() {
    const [rows] = await pool.execute(`
      SELECT YEAR(donation_date) AS year, COALESCE(SUM(amount), 0) AS amount
      FROM donations
      WHERE YEAR(donation_date) >= YEAR(CURDATE()) - 2
      GROUP BY year
      ORDER BY year
    `);
    return rows;
  },

  async getLast6MonthsDonations() {
    const [rows] = await pool.execute(`
      SELECT
        DATE_FORMAT(donation_date, '%b %Y') AS month,
        DATE_FORMAT(donation_date, '%Y-%m') AS month_key,
        COALESCE(SUM(amount), 0) AS amount
      FROM donations
      WHERE donation_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
      GROUP BY month_key, month
      ORDER BY month_key
    `);
    return rows;
  },

  async getRecentDonations() {
    const [rows] = await pool.execute(`
      SELECT d.id, d.donor_name, d.donor_email, d.amount, d.donation_date,
             d.receipt_status, dn.id AS donor_id
      FROM donations d
      LEFT JOIN donors dn ON d.donor_email = dn.email
      ORDER BY d.donation_date DESC
      LIMIT 5
    `);
    return rows;
  },
};
