import { SheetType } from '../types';

export type SubscriptionStatus = 'expired' | 'expiring_soon' | 'active' | 'none';

export interface SubscriptionInfo {
  daysLeft: number;
  status: SubscriptionStatus;
  endDateStr: string;
  badgeTextAr: string;
  badgeTextEn: string;
}

export interface SubscriptionAlertItem {
  record: any;
  info: SubscriptionInfo;
  target: 'owner' | 'agent';
  targetTitleAr: string;
  targetTitleEn: string;
  targetPersonName: string;
}

/**
 * Calculates days left and status for a given subscription end date string (YYYY-MM-DD).
 */
export function getSubscriptionInfo(endDateStr?: string): SubscriptionInfo {

  if (!endDateStr) {
    return {
      daysLeft: 0,
      status: 'none',
      endDateStr: '',
      badgeTextAr: 'غير محدد',
      badgeTextEn: 'N/A',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(endDateStr);
  if (isNaN(target.getTime())) {
    return {
      daysLeft: 0,
      status: 'none',
      endDateStr,
      badgeTextAr: 'تاريخ غير صالح',
      badgeTextEn: 'Invalid date',
    };
  }
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft);
    return {
      daysLeft,
      status: 'expired',
      endDateStr,
      badgeTextAr: absDays === 1 ? 'منتهي منذ يوم' : `منتهي منذ ${absDays} أيام`,
      badgeTextEn: `Expired ${absDays}d ago`,
    };
  }

  if (daysLeft <= 3) {
    return {
      daysLeft,
      status: 'expiring_soon',
      endDateStr,
      badgeTextAr: daysLeft === 0 ? 'ينتهي اليوم!' : daysLeft === 1 ? 'ينتهي غداً (يوم واحد)' : `ينتهي خلال ${daysLeft} أيام`,
      badgeTextEn: daysLeft === 0 ? 'Expires today!' : `Expires in ${daysLeft}d`,
    };
  }

  return {
    daysLeft,
    status: 'active',
    endDateStr,
    badgeTextAr: `نشط (متبقي ${daysLeft} يوم)`,
    badgeTextEn: `Active (${daysLeft}d left)`,
  };
}

/**
 * Get count and list of records requiring subscription alerts (<= 3 days remaining or expired).
 * Evaluates Station Subscriptions & Gas Agent Subscriptions independently.
 */
export function getSubscriptionAlerts(records: any[], activeSheet?: SheetType) {

  const alertRecords: SubscriptionAlertItem[] = [];

  records.forEach((record) => {
    const isStationRecord = record.recordType === 'stations' || (!record.recordType && (record.stationName || record.ownerName));
    const isAgentRecord = record.recordType === 'agents' || (!record.recordType && record.gasAgentName);

    // 1. Check Station Subscription End Date (when sheet is 'stations' or not specified)
    if ((!activeSheet || activeSheet === 'stations') && (isStationRecord || record.subscriptionEndDate)) {
      if (record.subscriptionEndDate) {
        const ownerInfo = getSubscriptionInfo(record.subscriptionEndDate);
        if (ownerInfo.status === 'expired' || ownerInfo.status === 'expiring_soon') {
          alertRecords.push({
            record,
            info: ownerInfo,
            target: 'owner',
            targetTitleAr: 'اشتراك المحطة',
            targetTitleEn: 'Station Subscription',
            targetPersonName: record.ownerName || record.stationName || 'صاحب المحطة',
          });
        }
      }
    }

    // 2. Check Gas Agent Subscription End Date (when sheet is 'agents' or not specified)
    if ((!activeSheet || activeSheet === 'agents') && (isAgentRecord || record.gasAgentSubscriptionEndDate)) {
      if (record.gasAgentSubscriptionEndDate) {
        const agentInfo = getSubscriptionInfo(record.gasAgentSubscriptionEndDate);
        if (agentInfo.status === 'expired' || agentInfo.status === 'expiring_soon') {
          alertRecords.push({
            record,
            info: agentInfo,
            target: 'agent',
            targetTitleAr: 'اشتراك وكيل الغاز',
            targetTitleEn: 'LPG Agent Subscription',
            targetPersonName: record.gasAgentName || 'وكيل الغاز',
          });
        }
      }
    }
  });

  // Sort by days left (urgency)
  alertRecords.sort((a, b) => a.info.daysLeft - b.info.daysLeft);

  const expiringSoonCount = alertRecords.filter((r) => r.info.status === 'expiring_soon').length;
  const expiredCount = alertRecords.filter((r) => r.info.status === 'expired').length;

  return {
    alertRecords,
    totalAlerts: alertRecords.length,
    expiringSoonCount,
    expiredCount,
  };
}

