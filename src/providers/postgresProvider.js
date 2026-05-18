import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, email, firstname, lastname) VALUES ($1, $2, $3, $4) RETURNING id`;
    const { rows } = await pgPool.query(sql, [uid, email, firstname, lastname]);
    return { id: rows[0].id, uid, email, role: 'pending' };
  },

  async findOrCreate({ uid, email, firstname, lastname }) {
    await pgPool.query(
      `INSERT INTO users (firebase_uid, email, firstname, lastname)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid) DO NOTHING`,
      [uid, email, firstname, lastname]
    );
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS "firebaseUid", email, firstname, lastname, role FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const sql = `SELECT firebase_uid AS "firebaseUid", email, firstname, lastname, role FROM users ORDER BY email ASC`;
    const { rows } = await pgPool.query(sql);
    return rows;
  },

  async setRole(uid, role) {
    await pgPool.query(`UPDATE users SET role = $1 WHERE firebase_uid = $2`, [
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
    page = 1,
    limit = 25,
  }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (search) {
      where += ` AND (dn.first_name ILIKE $${i} OR dn.last_name ILIKE $${i + 1} OR dn.email ILIKE $${i + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      i += 3;
    }
    if (status) {
      where += ` AND d.receipt_status = $${i}`;
      params.push(status);
      i++;
    }
    if (minAmount) {
      where += ` AND d.amount >= $${i}`;
      params.push(minAmount);
      i++;
    }
    if (maxAmount) {
      where += ` AND d.amount <= $${i}`;
      params.push(maxAmount);
      i++;
    }

    const [countResult, rowsResult] = await Promise.all([
      pgPool.query(
        `SELECT COUNT(*) AS total FROM donations d JOIN donors dn ON d.donor_id = dn.id ${where}`,
        params
      ),
      pgPool.query(
        `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status,
                dn.first_name, dn.last_name, dn.email
         FROM donations d
         JOIN donors dn ON d.donor_id = dn.id
         ${where}
         ORDER BY d.donation_date DESC LIMIT $${i} OFFSET $${i + 1}`,
        [...params, pageSize, offset]
      ),
    ]);

    return {
      rows: rowsResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },

  async getById(id) {
    const { rows } = await pgPool.query(
      `SELECT d.id, d.donor_id, d.amount, d.donation_date, d.receipt_status,
              dn.first_name, dn.last_name, dn.email, dn.phone, dn.address
       FROM donations d
       JOIN donors dn ON d.donor_id = dn.id
       WHERE d.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async createDonation({ donor_id, amount, donation_date, receipt_status }) {
    const { rows } = await pgPool.query(
      `INSERT INTO donations (donor_id, amount, donation_date, receipt_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [donor_id, amount, donation_date, receipt_status ?? 'pending']
    );
    return { insertId: rows[0].id, affectedRows: 1 };
  },

  async updateDonation(id, body) {
    const { amount, donation_date, receipt_status } = body;
    const { rowCount } = await pgPool.query(
      `UPDATE donations SET amount = $1, donation_date = $2, receipt_status = $3 WHERE id = $4`,
      [amount, donation_date, receipt_status, id]
    );
    return { affectedRows: rowCount };
  },

  async deleteDonation(id) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const {
        rows: [donation],
      } = await client.query('SELECT donor_id FROM donations WHERE id = $1', [
        id,
      ]);
      if (!donation) {
        await client.query('ROLLBACK');
        return { affectedRows: 0 };
      }
      const { rowCount } = await client.query(
        'DELETE FROM donations WHERE id = $1',
        [id]
      );
      const {
        rows: [{ cnt }],
      } = await client.query(
        'SELECT COUNT(*) AS cnt FROM donations WHERE donor_id = $1',
        [donation.donor_id]
      );
      if (parseInt(cnt) === 0) {
        await client.query('DELETE FROM donors WHERE id = $1', [
          donation.donor_id,
        ]);
      }
      await client.query('COMMIT');
      return { affectedRows: rowCount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getMaxStripeCreatedAt() {
    const { rows } = await pgPool.query(
      'SELECT MAX(stripe_created_at) AS max_created FROM donations WHERE stripe_payment_intent_id IS NOT NULL'
    );
    return rows[0].max_created ?? null;
  },

  async createStripeDonation({
    donor_id,
    amount,
    donation_date,
    description,
    stripe_payment_intent_id,
    stripe_created_at,
  }) {
    const { rowCount } = await pgPool.query(
      `INSERT INTO donations
         (donor_id, amount, donation_date, description, stripe_payment_intent_id, stripe_created_at, receipt_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       ON CONFLICT (stripe_payment_intent_id) DO NOTHING`,
      [donor_id, amount, donation_date, description, stripe_payment_intent_id, stripe_created_at]
    );
    return { affectedRows: rowCount };
  },

  async findOrCreateDonorByEmail({
    first_name,
    last_name,
    email,
    phone,
    address,
  }) {
    await pgPool.query(
      `INSERT INTO donors (first_name, last_name, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [first_name, last_name, email, phone, address]
    );
    const { rows } = await pgPool.query(
      'SELECT * FROM donors WHERE email = $1',
      [email]
    );
    return rows[0];
  },

  async getDonors({ search, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;
    if (search) {
      where += ` AND (d.first_name ILIKE $${i} OR d.last_name ILIKE $${i + 1} OR d.email ILIKE $${i + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      i += 3;
    }

    const [countResult, rowsResult] = await Promise.all([
      pgPool.query(`SELECT COUNT(*) AS total FROM donors d ${where}`, params),
      pgPool.query(
        `SELECT d.id, d.first_name, d.last_name, d.email, d.address, d.phone,
                COUNT(dn.id) AS donation_count,
                COALESCE(SUM(dn.amount), 0) AS total_donations,
                MAX(dn.donation_date) AS most_recent
         FROM donors d
         LEFT JOIN donations dn ON dn.donor_id = d.id
         ${where}
         GROUP BY d.id, d.first_name, d.last_name, d.email, d.address, d.phone
         ORDER BY most_recent DESC LIMIT $${i} OFFSET $${i + 1}`,
        [...params, pageSize, offset]
      ),
    ]);
    return {
      rows: rowsResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },

  async getDonorById(id) {
    const { rows: donorRows } = await pgPool.query(
      `SELECT d.id, d.first_name, d.last_name, d.email, d.address, d.phone,
              COUNT(dn.id) AS donation_count,
              COALESCE(SUM(dn.amount), 0) AS total_donations,
              MAX(dn.donation_date) AS most_recent
       FROM donors d
       LEFT JOIN donations dn ON dn.donor_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, d.first_name, d.last_name, d.email, d.address, d.phone`,
      [id]
    );
    if (!donorRows.length) return null;

    const { rows: donationRows } = await pgPool.query(
      `SELECT id, amount, donation_date, receipt_status
       FROM donations
       WHERE donor_id = $1
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
    const { rows } = await pgPool.query(
      `INSERT INTO donors (first_name, last_name, email, address, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [first_name, last_name, email, address, phone]
    );
    return { insertId: rows[0].id, affectedRows: 1 };
  },

  async updateDonor(id, { first_name, last_name, email, address, phone }) {
    const { rowCount } = await pgPool.query(
      `UPDATE donors SET first_name = $1, last_name = $2, email = $3, address = $4, phone = $5 WHERE id = $6`,
      [first_name, last_name, email, address, phone, id]
    );
    return { affectedRows: rowCount };
  },

  async deleteDonor(id) {
    const {
      rows: [{ cnt }],
    } = await pgPool.query(
      'SELECT COUNT(*) AS cnt FROM donations WHERE donor_id = $1',
      [id]
    );
    if (parseInt(cnt) > 0) {
      const err = new Error('Cannot delete donor with existing donations.');
      err.statusCode = 409;
      throw err;
    }
    const { rowCount } = await pgPool.query(
      'DELETE FROM donors WHERE id = $1',
      [id]
    );
    return { affectedRows: rowCount };
  },

  async getDashboardSummary() {
    const [allTime, thisWeek, lastMonth, thisMonth, donors] = await Promise.all(
      [
        pgPool.query(
          `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM donations`
        ),
        pgPool.query(`
        SELECT COALESCE(SUM(amount), 0) AS week_amount, COUNT(*) AS week_count
        FROM donations
        WHERE donation_date >= NOW() - INTERVAL '7 days'
      `),
        pgPool.query(`
        SELECT COALESCE(SUM(amount), 0) AS last_month_amount
        FROM donations
        WHERE donation_date >= DATE_TRUNC('month', NOW() - INTERVAL '2 months')
          AND donation_date < DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      `),
        pgPool.query(`
        SELECT COALESCE(SUM(amount), 0) AS this_month_amount
        FROM donations
        WHERE donation_date >= DATE_TRUNC('month', NOW())
      `),
        pgPool.query(`SELECT COUNT(*) AS total_donors FROM donors`),
      ]
    );
    const lastMonthAmount = parseFloat(lastMonth.rows[0].last_month_amount);
    const thisMonthAmount = parseFloat(thisMonth.rows[0].this_month_amount);
    const growthRate =
      lastMonthAmount === 0
        ? null
        : (
            ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) *
            100
          ).toFixed(1);
    return {
      total_amount: parseFloat(allTime.rows[0].total_amount),
      week_amount: parseFloat(thisWeek.rows[0].week_amount),
      week_count: parseInt(thisWeek.rows[0].week_count),
      total_donors: parseInt(donors.rows[0].total_donors),
      growth_rate: growthRate,
    };
  },

  async getDonationTrend() {
    const { rows } = await pgPool.query(`
      SELECT
        EXTRACT(YEAR FROM donation_date)::int AS year,
        COALESCE(SUM(amount), 0) AS amount
      FROM donations
      WHERE EXTRACT(YEAR FROM donation_date) >= EXTRACT(YEAR FROM NOW()) - 2
      GROUP BY year
      ORDER BY year
    `);
    return rows;
  },

  async getLast6MonthsDonations() {
    const { rows } = await pgPool.query(`
      SELECT
        TO_CHAR(donation_date, 'Mon YYYY') AS month,
        TO_CHAR(donation_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount), 0) AS amount
      FROM donations
      WHERE donation_date >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
      GROUP BY month_key, month
      ORDER BY month_key
    `);
    return rows;
  },

  async setLastSync(key) {
    await pgPool.query(
      'INSERT INTO sync_meta (key, synced_at) VALUES ($1, NOW()) ON CONFLICT (key) DO UPDATE SET synced_at = EXCLUDED.synced_at',
      [key]
    );
  },

  async getLastSync(key) {
    const { rows } = await pgPool.query(
      'SELECT synced_at FROM sync_meta WHERE key = $1',
      [key]
    );
    return rows[0]?.synced_at ?? null;
  },
};
