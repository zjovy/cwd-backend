import { pool } from '../config/database.js';

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`;
    const [result] = await pool.execute(sql, [uid, email, firstname, lastname]);
    return { id: result.insertId, uid, email, role: 'pending' };
  },

  async deleteByUid(uid) {
    await pool.execute(`DELETE FROM users WHERE firebase_uid = ?`, [uid]);
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    await pool.execute(
      `INSERT IGNORE INTO users (firebase_uid, email, firstname, lastname) VALUES (?, ?, ?, ?)`,
      [uid, email, firstname, lastname]
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
    await pool.execute(`UPDATE users SET role = ? WHERE firebase_uid = ?`, [
      role,
      uid,
    ]);
    return this.findByUid(uid);
  },

  async getDonations({
    search,
    status,
    minAmount,
    maxAmount,
    startDate,
    endDate,
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
      where += ` AND (dn.first_name LIKE ? OR dn.last_name LIKE ? OR dn.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
    if (startDate) {
      where += ` AND d.donation_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND d.donation_date <= ?`;
      params.push(endDate);
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM donations d JOIN donors dn ON d.donor_id = dn.id ${where}`,
        params
      ),
      pool.execute(
        `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status,
                dn.first_name, dn.last_name, dn.email
         FROM donations d
         JOIN donors dn ON d.donor_id = dn.id
         ${where}
         ORDER BY d.donation_date DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);

    return { rows, total: parseInt(countRows[0].total) };
  },

  async getById(id) {
    const [rows] = await pool.execute(
      `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status,
              dn.first_name, dn.last_name, dn.email, dn.phone, dn.address
       FROM donations d
       JOIN donors dn ON d.donor_id = dn.id
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  _buildUnsentWhere({
    search,
    status,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    requireEmail,
  } = {}) {
    const LIMIT = 20;
    let where = `WHERE COALESCE(d.receipt_status, 'pending') <> 'sent'`;
    const params = [];

    if (search) {
      where += ` AND (dn.first_name LIKE ? OR dn.last_name LIKE ? OR dn.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && status !== 'sent') {
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
    if (startDate) {
      where += ` AND d.donation_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND d.donation_date <= ?`;
      params.push(endDate);
    }

    if (requireEmail) {
      where += ` AND dn.email IS NOT NULL AND dn.email <> ''`;
    }

    return { where, params, limit: LIMIT };
  },

  async getUnsentIds(filters = {}) {
    const { where, params, limit } = this._buildUnsentWhere({
      ...filters,
      requireEmail: true,
    });
    const [rows] = await pool.execute(
      `SELECT d.id FROM donations d JOIN donors dn ON d.donor_id = dn.id
       ${where} ORDER BY d.donation_date DESC, d.id DESC LIMIT ${limit}`,
      params
    );
    return rows.map((r) => r.id);
  },

  async getUnsentRecipients(filters = {}) {
    const { where, params, limit } = this._buildUnsentWhere({
      ...filters,
      requireEmail: true,
    });
    const [rows] = await pool.execute(
      `SELECT d.id, dn.first_name, dn.last_name, dn.email
       FROM donations d
       JOIN donors dn ON d.donor_id = dn.id
       ${where}
       ORDER BY d.donation_date DESC, d.id DESC
       LIMIT ${limit}`,
      params
    );
    return rows;
  },

  async createDonation({ donor_id, amount, donation_date, receipt_status }) {
    const [result] = await pool.execute(
      `INSERT INTO donations (donor_id, amount, donation_date, receipt_status)
       VALUES (?, ?, ?, ?)`,
      [donor_id, amount, donation_date, receipt_status ?? 'pending']
    );
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  },

  async updateDonation(id, body) {
    const { amount, donation_date, receipt_status } = body;
    const [result] = await pool.execute(
      `UPDATE donations SET amount = ?, donation_date = ?, receipt_status = ? WHERE id = ?`,
      [amount, donation_date, receipt_status, id]
    );
    return { affectedRows: result.affectedRows };
  },

  async updateReceiptStatus(id, receipt_status) {
    const [result] = await pool.execute(
      `UPDATE donations SET receipt_status = ? WHERE id = ?`,
      [receipt_status, id]
    );
    return { affectedRows: result.affectedRows };
  },

  async markManyReceiptStatus(ids, receipt_status) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { affectedRows: 0 };
    }
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.execute(
      `UPDATE donations SET receipt_status = ? WHERE id IN (${placeholders})`,
      [receipt_status, ...ids]
    );
    return { affectedRows: result.affectedRows };
  },

  async deleteDonation(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[donation]] = await conn.execute(
        'SELECT donor_id FROM donations WHERE id = ?',
        [id]
      );
      if (!donation) {
        await conn.rollback();
        return { affectedRows: 0 };
      }
      const [del] = await conn.execute('DELETE FROM donations WHERE id = ?', [
        id,
      ]);
      const [[{ cnt }]] = await conn.execute(
        'SELECT COUNT(*) AS cnt FROM donations WHERE donor_id = ?',
        [donation.donor_id]
      );
      if (parseInt(cnt) === 0) {
        await conn.execute('DELETE FROM donors WHERE id = ?', [
          donation.donor_id,
        ]);
      }
      await conn.commit();
      return { affectedRows: del.affectedRows };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getMaxStripeCreatedAt() {
    const [rows] = await pool.execute(
      'SELECT MAX(stripe_created_at) AS max_created FROM donations WHERE stripe_payment_intent_id IS NOT NULL'
    );
    return rows[0].max_created ?? null;
  },

  async existsByStripeId(stripePaymentIntentId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM donations WHERE stripe_payment_intent_id = ?',
      [stripePaymentIntentId]
    );
    return parseInt(rows[0].cnt) > 0;
  },

  async createStripeDonation({
    donor_id,
    amount,
    donation_date,
    description,
    stripe_payment_intent_id,
    stripe_created_at,
  }) {
    const [result] = await pool.execute(
      `INSERT IGNORE INTO donations
         (donor_id, amount, donation_date, description, stripe_payment_intent_id, stripe_created_at, receipt_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        donor_id,
        amount,
        donation_date,
        description,
        stripe_payment_intent_id,
        stripe_created_at,
      ]
    );
    return { affectedRows: result.affectedRows };
  },

  async findOrCreateDonorByEmail({
    first_name,
    last_name,
    email,
    phone,
    address,
  }) {
    await pool.execute(
      `INSERT IGNORE INTO donors (first_name, last_name, email, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone, address]
    );
    const [rows] = await pool.execute('SELECT * FROM donors WHERE email = ?', [
      email,
    ]);
    return rows[0];
  },

  async getDonors({ search, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ` AND (d.first_name LIKE ? OR d.last_name LIKE ? OR d.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS total FROM donors d ${where}`, params),
      pool.execute(
        `SELECT d.id, d.first_name, d.last_name, d.email, d.address, d.phone,
                COUNT(dn.id) AS donation_count,
                COALESCE(SUM(dn.amount), 0) AS total_donations,
                MAX(dn.donation_date) AS most_recent
         FROM donors d
         LEFT JOIN donations dn ON dn.donor_id = d.id
         ${where}
         GROUP BY d.id, d.first_name, d.last_name, d.email, d.address, d.phone
         ORDER BY most_recent DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ]);
    return { rows, total: parseInt(countRows[0].total) };
  },

  async getDonorById(id) {
    const [donorRows] = await pool.execute(
      `SELECT d.id, d.first_name, d.last_name, d.email, d.address, d.phone,
              COUNT(dn.id) AS donation_count,
              COALESCE(SUM(dn.amount), 0) AS total_donations,
              MAX(dn.donation_date) AS most_recent
       FROM donors d
       LEFT JOIN donations dn ON dn.donor_id = d.id
       WHERE d.id = ?
       GROUP BY d.id, d.first_name, d.last_name, d.email, d.address, d.phone`,
      [id]
    );
    if (!donorRows.length) return null;

    const [donationRows] = await pool.execute(
      `SELECT id, amount, donation_date, receipt_status
       FROM donations
       WHERE donor_id = ?
       ORDER BY donation_date DESC`,
      [id]
    );

    const {
      id: donorId,
      first_name,
      last_name,
      email,
      address,
      phone,
      donation_count,
      total_donations,
      most_recent,
    } = donorRows[0];
    return {
      id: donorId,
      first_name,
      last_name,
      email,
      address,
      phone,
      donation_count: parseInt(donation_count),
      total_donations: parseFloat(total_donations),
      most_recent,
      donations: donationRows,
    };
  },

  async createDonor({ first_name, last_name, email, address, phone }) {
    const [result] = await pool.execute(
      `INSERT INTO donors (first_name, last_name, email, address, phone) VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, address, phone]
    );
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  },

  async updateDonor(id, { first_name, last_name, email, address, phone }) {
    const [result] = await pool.execute(
      `UPDATE donors SET first_name = ?, last_name = ?, email = ?, address = ?, phone = ? WHERE id = ?`,
      [first_name, last_name, email, address, phone, id]
    );
    return { affectedRows: result.affectedRows };
  },

  async deleteDonor(id) {
    const [[{ cnt }]] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM donations WHERE donor_id = ?',
      [id]
    );
    if (parseInt(cnt) > 0) {
      const err = new Error('Cannot delete donor with existing donations.');
      err.statusCode = 409;
      throw err;
    }
    const [result] = await pool.execute('DELETE FROM donors WHERE id = ?', [
      id,
    ]);
    return { affectedRows: result.affectedRows };
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
        : (
            ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) *
            100
          ).toFixed(1);
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

  async setLastSync(key) {
    await pool.execute(
      'INSERT INTO sync_meta (`key`, synced_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE synced_at = VALUES(synced_at)',
      [key]
    );
  },

  async getLastSync(key) {
    const [rows] = await pool.execute(
      'SELECT synced_at FROM sync_meta WHERE `key` = ?',
      [key]
    );
    return rows[0]?.synced_at ?? null;
  },

  async getRangeSummary({ startDate, endDate } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (startDate) {
      where += ' AND donation_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND donation_date <= ?';
      params.push(endDate);
    }
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS donation_count
       FROM donations ${where}`,
      params
    );
    return {
      total_amount: parseFloat(rows[0].total_amount),
      donation_count: parseInt(rows[0].donation_count),
    };
  },

  async getRangeTrend({ startDate, endDate, bucket = 'month' } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (startDate) {
      where += ' AND donation_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND donation_date <= ?';
      params.push(endDate);
    }

    let labelExpr, keyExpr;
    if (bucket === 'week') {
      labelExpr = `DATE_FORMAT(DATE_SUB(donation_date, INTERVAL WEEKDAY(donation_date) DAY), '%b %d, %Y')`;
      keyExpr = `DATE_FORMAT(DATE_SUB(donation_date, INTERVAL WEEKDAY(donation_date) DAY), '%Y-%m-%d')`;
    } else if (bucket === 'day') {
      labelExpr = `DATE_FORMAT(donation_date, '%b %d, %Y')`;
      keyExpr = `DATE_FORMAT(donation_date, '%Y-%m-%d')`;
    } else if (bucket === 'year') {
      labelExpr = `DATE_FORMAT(donation_date, '%Y')`;
      keyExpr = `DATE_FORMAT(donation_date, '%Y')`;
    } else {
      labelExpr = `DATE_FORMAT(donation_date, '%b %Y')`;
      keyExpr = `DATE_FORMAT(donation_date, '%Y-%m')`;
    }

    const [rows] = await pool.execute(
      `SELECT ${labelExpr} AS label, ${keyExpr} AS bucket_key,
              COALESCE(SUM(amount), 0) AS amount
       FROM donations ${where}
       GROUP BY bucket_key, label
       ORDER BY bucket_key`,
      params
    );
    return rows;
  },
};
