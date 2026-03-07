import { pool } from '../config/database.js';

const donorRepository = {
  async getDonors() {
    let sql = `
      SELECT name, email, address, total_doations, donation_count, most_recent
      FROM donors
      ORDER BY most_recent DESC
    `;
    if (search) {
        sql += ` WHERE name LIKE ? OR email LIKE ?`
        const [rows] = await pool.execute(sql, [`%${search}%`, `%${search}%`])
        return rows
      }
    
    const [rows] = await pool.execute(sql)
    return rows
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
        dn.donation_counts,
        dn.most_recent,
        d.amount,
        d.donation_date,
        FROM donors dn
        LEFT JOIN donations d
        ON dn.email = d.donor_email
        WHERE dn.id = ?
    `
    const [rows] = await pool.execute(sql, [id])
    return rows[0] || null
  },

  async updateDonor(id, body){
    const { name, email, address, phone } = body
  
    const sql = `
      UPDATE donations
      SET name = ?, email = ?, address = ?, phone = ?
      WHERE id = ?
    `
  
    const [result] = await pool.execute(sql, [
      name,
      email,
      address,
      phone,
      id
    ])
  
    return result
  },

  async sendThankYouEmail(donorId){

  },
  async getThankYouTemplate(donorId) {
    
  },

  async deleteDonor(donorId){
    const sql = `
      DELETE FROM donors
      WHERE id = ?
    `
    const [result] = await pool.execute(sql, [donorId]);
    return result
  },

  async createDonor(){

  },
};

export default donorRepository;