import { pool } from '../config/database.js';

const dashboardRepository = {

  async getDashboardSummary() {
    const [allTime] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) AS total_amount
      FROM donations
    `);

    const [thisWeek] = await pool.execute(`
      SELECT
        COALESCE(SUM(amount), 0) AS week_amount,
        COUNT(*) AS week_count
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

    const [donors] = await pool.execute(`
      SELECT COUNT(*) AS total_donors FROM donors
    `);

    const lastMonthAmount = parseFloat(lastMonth[0].last_month_amount);
    const thisMonthAmount = parseFloat(thisMonth[0].this_month_amount);
    const growthRate = lastMonthAmount === 0
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

  // Year-over-year: total per year for the last 3 years
  async getDonationTrend() {
    const [rows] = await pool.execute(`
      SELECT
        YEAR(donation_date) AS year,
        COALESCE(SUM(amount), 0) AS amount
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
      SELECT id, donor_name, amount, donation_date, receipt_status
      FROM donations
      ORDER BY donation_date DESC
      LIMIT 5
    `);
    return rows;
  },

};

export default dashboardRepository;
