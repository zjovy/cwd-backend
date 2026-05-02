import { pool } from '../config/database.js';

const donorRepository = {

  async getDonors({ search, page = 1, limit = 25 }) {
    const MAX_LIMIT = 100
    const pageSize = Math.min(Math.max(parseInt(limit) || 25, 1), MAX_LIMIT)
    const safePage = Math.max(parseInt(page) || 1, 1)
    const offset = (safePage - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []

    if (search) {
      where += ` AND (name LIKE ? OR email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    
    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM donors ${where}`,
        params
      ),
      pool.execute(
        `SELECT id, name, email, address, phone, total_donations, donation_count, most_recent
         FROM donors ${where} ORDER BY most_recent DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ),
    ])

    return { rows, total: parseInt(countRows[0].total) }
  },

  async getById(id) {
    const sql = `
        SELECT
        dn.id,
        dn.name,
        dn.email,
        dn.address,
        dn.phone,
        dn.total_donations,
        dn.donation_count,
        dn.most_recent,
        d.amount,
        d.donation_date
        FROM donors dn
        LEFT JOIN donations d
        ON dn.email = d.donor_email
        WHERE dn.id = ?
    `
    const [rows] = await pool.execute(sql, [id])
    return rows[0] || null
  },

  async updateDonor(id, body){
    const { name, email, address, phone, total_donations, donation_count, most_recent } = body
  
    const sql = `
      UPDATE donors
      SET name = ?, email = ?, address = ?, phone = ?, total_donations = ?, donation_count = ?, most_recent = ?
      WHERE id = ?
    `
  
    const [result] = await pool.execute(sql, [
      name,
      email,
      address,
      phone,
      total_donations, 
      donation_count, 
      most_recent,
      id
    ])
  
    return result
  },

  async sendThankYouEmail(donorId){
    throw new Error('Not implemented');
  },
  async getThankYouTemplate(donorId) {
    throw new Error('Not implemented');
  },

  async deleteDonor(donorId){
    const sql = `
      DELETE FROM donors
      WHERE id = ?
    `
    const [result] = await pool.execute(sql, [donorId]);
    return result
  },

  async createDonor({ name, email, address, phone, total_donations, donation_count, most_recent }) {
    const sql = `
      INSERT INTO donors (name, email, address, phone, total_donations, donation_count, most_recent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await pool.execute(sql, [
      name,
      email,
      address,
      phone,
      total_donations, 
      donation_count, 
      most_recent
    ])

    return result
  }
};

export default donorRepository;