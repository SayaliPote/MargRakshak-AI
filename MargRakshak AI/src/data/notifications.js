// Mock notification feed — static demo data for now.
// status: 'past' = already happened, 'upcoming' = expected / scheduled ahead.
// severity drives the colored dot: CRITICAL | HIGH | MODERATE | LOW | INFO
// Notifications are driver-only — the admin dashboard does not use a bell.
// title/message now use i18n keys resolved by NotificationBell via t().

export const driverNotifications = [
  {
    id: 'd1',
    titleKey: 'common.notifications.criticalWarning',
    messageKey: 'common.notifications.criticalWarningDesc',
    timeKey: 'common.notifications.time8MinAgo',
    status: 'past',
    severity: 'CRITICAL',
  },
  {
    id: 'd2',
    titleKey: 'common.notifications.highRiskWarning',
    messageKey: 'common.notifications.highRiskWarningDesc',
    timeKey: 'common.notifications.time15MinAgo',
    status: 'past',
    severity: 'HIGH',
  },
  {
    id: 'd3',
    titleKey: 'common.notifications.tripCompleted',
    messageKey: 'common.notifications.tripCompletedDesc',
    timeKey: 'common.notifications.timeYesterday',
    status: 'past',
    severity: 'INFO',
  },
  {
    id: 'd4',
    titleKey: 'common.notifications.upcomingRiskZone',
    messageKey: 'common.notifications.upcomingPanchavati',
    timeKey: 'common.notifications.timeOnRoute',
    status: 'upcoming',
    severity: 'MODERATE',
  },
  {
    id: 'd5',
    titleKey: 'common.notifications.upcomingRiskZone',
    messageKey: 'common.notifications.upcomingCanadaCorner',
    timeKey: 'common.notifications.timeOnRoute',
    status: 'upcoming',
    severity: 'LOW',
  },
];
