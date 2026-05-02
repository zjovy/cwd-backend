import { pgPool } from '../config/database.js';

function emailKey(email) {
  if (email == null) return null;
  const t = String(email).trim().toLowerCase();
  return t || null;
}

async function syncDonorStats(donorEmail) {
  const key = emailKey(donorEmail);
  if (!key) return;
  await pgPool.query(
    `UPDATE donors
     SET total_donations = stats.total,
         donation_count  = stats.cnt,
         most_recent     = stats.recent
     FROM (
       SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt, MAX(donation_date) AS recent
       FROM donations
       WHERE LOWER(TRIM(COALESCE(donor_email, ''))) = $1
     ) stats
     WHERE LOWER(TRIM(COALESCE(donors.email, ''))) = $1`,
    [key]
  );
}

async function ensureDonor(donor_name, donor_email) {
  const key = emailKey(donor_email);
  if (!key) return;
  const storedEmail = String(donor_email).trim() || null;
  await pgPool.query(
    `INSERT INTO donors (name, email, total_donations, donation_count)
     VALUES ($1, $2, 0, 0)
     ON CONFLICT (email) DO NOTHING`,
    [donor_name ?? '', storedEmail]
  );
  await syncDonorStats(donor_email);
}

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
      [uid, email, firstname, lastname],
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
    await pgPool.query(`UPDATE users SET role = $1 WHERE firebase_uid = $2`, [role, uid]);
    return this.findByUid(uid);
  },

  async getDonations({ search, status, minAmount, maxAmount, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100;
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 1;

    if (search) {
      where += ` AND (d.donor_name ILIKE $${i} OR d.donor_email ILIKE $${i + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      i += 2;
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
      pgPool.query(`SELECT COUNT(*) AS total FROM donations d ${where}`, params),
      pgPool.query(
        `SELECT d.id, d.donor_name, d.donor_email, d.amount, d.donation_date,
                d.receipt_status, dn.id AS donor_id
         FROM donations d
         LEFT JOIN donors dn ON d.donor_email = dn.email
         ${where}
         ORDER BY d.donation_date DESC LIMIT $${i} OFFSET $${i + 1}`,
        [...params, pageSize, offset]
      ),
    ]);

    return { rows: rowsResult.rows, total: parseInt(countResult.rows[0].total) };
  },

  async getById(id) {
    const { rows } = await pgPool.query(
      `SELECT d.id, d.donor_name, d.donor_email, d.amount, d.donation_date,
              d.receipt_status, dn.phone, dn.address
       FROM donations d
       LEFT JOIN donors dn ON d.donor_email = dn.email
       WHERE d.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async createDonation({ donor_name, donor_email, amount, donation_date, receipt_status }) {
    const donorEmailNormalized =
      donor_email != null && donor_email !== ''
        ? String(donor_email).trim()
        : donor_email;

    const { rows } = await pgPool.query(
      `INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [donor_name, donorEmailNormalized, amount, donation_date, receipt_status ?? 'pending']
    );

    await ensureDonor(donor_name, donorEmailNormalized);
    return { insertId: rows[0].id, affectedRows: 1 };
  },

  async updateDonation(id, body) {
    const { donor_name, donor_email, amount, donation_date, receipt_status } = body;

    const client = await pgPool.connect();
    let rowCount;
    let previousEmail;
    try {
      await client.query('BEGIN');
      const { rows: beforeRows } = await client.query(
        `SELECT donor_email FROM donations WHERE id = $1 FOR UPDATE`,
        [id]
      );
      previousEmail = beforeRows[0]?.donor_email;
      ({ rowCount } = await client.query(
        `UPDATE donations
         SET donor_name = $1, donor_email = $2, amount = $3, donation_date = $4, receipt_status = $5
         WHERE id = $6`,
        [donor_name, donor_email, amount, donation_date, receipt_status, id]
      ));
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const emails = new Set(
      [previousEmail, donor_email].filter((e) => e != null && e !== '')
    );
    for (const email of emails) {
      await syncDonorStats(email);
    }

    return { affectedRows: rowCount };
  },

  async deleteDonation(id) {
    const { rows: beforeRows } = await pgPool.query(
      `SELECT donor_email FROM donations WHERE id = $1`,
      [id]
    );
    const donorEmail = beforeRows[0]?.donor_email;

    const { rowCount } = await pgPool.query(
      `DELETE FROM donations WHERE id = $1`,
      [id]
    );

    if (rowCount > 0 && donorEmail) {
      await syncDonorStats(donorEmail);
    }

    return { affectedRows: rowCount };
  },
};
