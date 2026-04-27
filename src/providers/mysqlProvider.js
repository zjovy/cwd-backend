import { pool } from '../config/database.js';

function emailKey(email) {
  if (email == null) return null;
  const t = String(email).trim().toLowerCase();
  return t || null;
}

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

    const [beforeRows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const previousEmail = beforeRows[0]?.donor_email;

    const [result] = await pool.execute(
      `UPDATE donations
       SET donor_name = ?, donor_email = ?, amount = ?, donation_date = ?, receipt_status = ?
       WHERE id = ?`,
      [donor_name, donor_email, amount, donation_date, receipt_status, id]
    );

    const [afterRows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const nextEmail = afterRows[0]?.donor_email;

    const emails = new Set(
      [previousEmail, nextEmail].filter((e) => e != null && e !== '')
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
};
