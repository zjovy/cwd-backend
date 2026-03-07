import { pool } from '../config/database.js';

const donationRepository = {

  async getDonations({ search, status, minAmount, maxAmount }) {
    let sql = `
      SELECT id, donor_name, donor_email, amount, donation_date, receipt_status
      FROM donations
      WHERE 1=1
    `
    const params = []
  
    if (search) {
      sql += ` AND (donor_name LIKE ? OR donor_email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
  
    if (status) {
      sql += ` AND receipt_status = ?`
      params.push(status)
    }
  
    if (minAmount) {
      sql += ` AND amount >= ?`
      params.push(minAmount)
    }
  
    if (maxAmount) {
      sql += ` AND amount <= ?`
      params.push(maxAmount)
    }
  
    sql += ` ORDER BY donation_date DESC`
  
    const [rows] = await pool.execute(sql, params)
  
    return rows
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
  
    const sql = `
      UPDATE donations
      SET donor_name = ?, donor_email = ?, amount = ?, donation_date = ?, receipt_status = ?
      WHERE id = ?
    `
  
    const [result] = await pool.execute(sql, [
      donor_name,
      donor_email,
      amount,
      donation_date,
      receipt_status,
      id
    ])
  
    return result
  },
  
  async deleteDonation(id) {
    const sql = `
      DELETE FROM donations
      WHERE id = ?
    `
  
    const [result] = await pool.execute(sql, [id])
  
    return result
  },

  async createDonation() {

  }

};

export default donationRepository;