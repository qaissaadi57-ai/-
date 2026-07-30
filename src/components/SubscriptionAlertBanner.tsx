import React from 'react';
import { DataRecord, SheetType } from '../types';
import { getSubscriptionAlerts } from '../utils/subscriptionUtils';
import { AlertTriangle, Bell, Clock, ArrowRightLeft, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface SubscriptionAlertBannerProps {
  records: DataRecord[];
  onOpenAlertsModal: () => void;
  lang: 'ar' | 'en';
  activeSheet?: SheetType;
}

export const SubscriptionAlertBanner: React.FC<SubscriptionAlertBannerProps> = ({
  records,
  onOpenAlertsModal,
  lang,
  activeSheet = 'stations',
}) => {

  const { totalAlerts, expiringSoonCount, expiredCount } = getSubscriptionAlerts(records, activeSheet as SheetType);

  if (totalAlerts === 0) return null;

  const titleAr = activeSheet === 'stations' ? 'تنبيهات انتهاء اشتراك المحطات' : 'تنبيهات انتهاء اشتراك وكلاء الغاز';
  const titleEn = activeSheet === 'stations' ? 'Stations Subscription Expiry Alerts' : 'Gas Agents Subscription Expiry Alerts';

  return (
    <div className="w-full max-w-5xl mx-auto mb-5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 p-0.5 shadow-lg shadow-amber-500/10 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-[15px] p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Banner Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {lang === 'ar' ? titleAr : titleEn}
              </span>
              
              {expiredCount > 0 && (
                <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-300/40">
                  {lang === 'ar' ? `🚨 ${expiredCount} منتهية` : `🚨 ${expiredCount} Expired`}
                </span>
              )}

              {expiringSoonCount > 0 && (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300/40">
                  {lang === 'ar' ? `⚠️ ${expiringSoonCount} ينتهي خلال 3 أيام` : `⚠️ ${expiringSoonCount} Expiring Soon`}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              {lang === 'ar'
                ? `يوجد ${totalAlerts} سجلات تتطلب التجديد والتنبيه الفوري`
                : `${totalAlerts} records require renewal attention`}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenAlertsModal}
          className="self-stretch sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white text-xs font-black shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{lang === 'ar' ? 'استعراض التنبيهات' : 'View Alerts'}</span>
          <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
        </button>

      </div>
    </div>
  );
};

