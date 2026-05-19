import mysqlProvider from '../providers/mysqlProvider.js';

const provider = mysqlProvider;

const dashboardRepository = {
  getDashboardSummary: () => provider.getDashboardSummary(),
  getDonationTrend: () => provider.getDonationTrend(),
  getLast6MonthsDonations: () => provider.getLast6MonthsDonations(),
  getRangeSummary: (opts) => provider.getRangeSummary(opts),
  getRangeTrend: (opts) => provider.getRangeTrend(opts),
};

export default dashboardRepository;
