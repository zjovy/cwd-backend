import mysqlProvider from '../providers/mysqlProvider.js';

const provider = mysqlProvider;

const dashboardRepository = {
  getDashboardSummary: () => provider.getDashboardSummary(),
  getDonationTrend: () => provider.getDonationTrend(),
  getLast6MonthsDonations: () => provider.getLast6MonthsDonations(),
};

export default dashboardRepository;
