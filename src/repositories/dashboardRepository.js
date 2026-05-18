import { databaseClient } from '../config/database.js';
import mysqlProvider from '../providers/mysqlProvider.js';
import postgresProvider from '../providers/postgresProvider.js';

const provider = databaseClient === 'mysql' ? mysqlProvider : postgresProvider;

const dashboardRepository = {
  getDashboardSummary: () => provider.getDashboardSummary(),
  getDonationTrend: () => provider.getDonationTrend(),
  getLast6MonthsDonations: () => provider.getLast6MonthsDonations(),
  getRangeSummary: (opts) => provider.getRangeSummary(opts),
  getRangeTrend: (opts) => provider.getRangeTrend(opts),
};

export default dashboardRepository;
