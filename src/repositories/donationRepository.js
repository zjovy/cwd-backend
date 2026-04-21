import { pool } from '../config/database.js';

/** Trim + lowercase so donations/donors rows match even if casing/spacing differs. */
function donorEmailMatchKey(email) {
  if (email == null || email === '') {
    return null;
  }
  const trimmed = String(email).trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed.toLowerCase();
}

/**
 * Recalculate total_donations, donation_count, most_recent on donors from donations rows.
 * No-op if email is missing; safe if no matching donor row exists.
 */
async function syncDonorStatsForEmail(donorEmail) {
  const key = donorEmailMatchKey(donorEmail);
  if (!key) {
    return;
  }

  const sql = `
    UPDATE donors
    SET
      total_donations = (
        SELECT COALESCE(SUM(amount), 0)
        FROM donations
        WHERE LOWER(TRIM(COALESCE(donor_email, ''))) = ?
      ),
      donation_count = (
        SELECT COUNT(*)
        FROM donations
        WHERE LOWER(TRIM(COALESCE(donor_email, ''))) = ?
      ),
      most_recent = (
        SELECT MAX(donation_date)
        FROM donations
        WHERE LOWER(TRIM(COALESCE(donor_email, ''))) = ?
      )
    WHERE LOWER(TRIM(COALESCE(email, ''))) = ?
  `;

  await pool.execute(sql, [key, key, key, key]);
}

/**
 * After a new donation row exists: ensure a donor row exists, then sync totals from donations.
 */
async function ensureDonorForNewDonation({ donor_name, donor_email }) {
  const key = donorEmailMatchKey(donor_email);
  if (!key) {
    return;
  }

  const [existing] = await pool.execute(
    `SELECT id FROM donors WHERE LOWER(TRIM(COALESCE(email, ''))) = ? LIMIT 1`,
    [key]
  );

  if (existing.length > 0) {
    await syncDonorStatsForEmail(donor_email);
    return;
  }

  const storedEmail =
    donor_email == null ? '' : String(donor_email).trim();

  await pool.execute(
    `
      INSERT INTO donors (name, email, address, phone, total_donations, donation_count, most_recent)
      VALUES (?, ?, NULL, NULL, 0, 0, NULL)
    `,
    [donor_name ?? '', storedEmail]
  );

  await syncDonorStatsForEmail(donor_email);
}

const donationRepository = {

  async getDonations({ search, status, minAmount, maxAmount, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT)
    const safePage = Math.max(parseInt(page) || 1, 1)
    const offset = (safePage - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      where += ` AND (donor_name LIKE ? OR donor_email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    if (status) {
      where += ` AND receipt_status = ?`
      params.push(status)
    }

    if (minAmount) {
      where += ` AND amount >= ?`
      params.push(minAmount)
    }

    if (maxAmount) {
      where += ` AND amount <= ?`
      params.push(maxAmount)
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM donations ${where}`,
        params
      ),
      pool.execute(
        `SELECT id, donor_name, donor_email, amount, donation_date, receipt_status
         FROM donations ${where} ORDER BY donation_date DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ])

    return { rows, total: parseInt(countRows[0].total) }
  },

  async getById(id) {
    const sql = `
        SELECT
        d.id,
        d.donor_name,
        d.donor_email,
        d.amount,
        d.donation_date,
        d.payment_method,
        dn.phone,
        dn.address
        FROM donations d
        LEFT JOIN donors dn
        ON d.donor_email = dn.email
        WHERE d.id = ?
    `
    const [rows] = await pool.execute(sql, [id])
    return rows[0] || null
  },

  async updateDonation(id, body) {
    const { donor_name, donor_email, amount, donation_date, receipt_status } = body

    const [beforeRows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const previousEmail = beforeRows[0]?.donor_email;

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

    const [afterRows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const nextEmail = afterRows[0]?.donor_email;

    const emails = new Set(
      [previousEmail, nextEmail].filter((e) => e != null && e !== '')
    );
    for (const email of emails) {
      await syncDonorStatsForEmail(email);
    }

    return result;
  },
  
  async deleteDonation(id) {
    const [rows] = await pool.execute(
      `SELECT donor_email FROM donations WHERE id = ?`,
      [id]
    );
    const donorEmail = rows[0]?.donor_email;

    const sql = `
      DELETE FROM donations
      WHERE id = ?
    `;

    const [result] = await pool.execute(sql, [id]);

    if (result.affectedRows > 0 && donorEmail) {
      await syncDonorStatsForEmail(donorEmail);
    }

    return result;
  },

  async createDonation({ donor_name, donor_email, amount, donation_date, receipt_status }) {
    const sql = `
      INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status)
      VALUES (?, ?, ?, ?, ?)
    `

    const donorEmailNormalized =
      donor_email != null && donor_email !== ''
        ? String(donor_email).trim()
        : donor_email;

    const [result] = await pool.execute(sql, [
      donor_name,
      donorEmailNormalized,
      amount,
      donation_date,
      receipt_status ?? 'pending',
    ]);

    await ensureDonorForNewDonation({
      donor_name,
      donor_email: donorEmailNormalized,
    });

    return result;
  },

};

export default donationRepository;