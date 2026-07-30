import React, { useState } from 'react';
import { DataRecord, SheetType } from '../types';
import { getSubscriptionAlerts } from '../utils/subscriptionUtils';
import { Bell, AlertTriangle, X, CheckCircle2, Clock, ExternalLink, Calendar, Building2, User, Phone, MapPin } from 'lucide-react';

interface SubscriptionAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DataRecord[];
  onSelectRecord: (record: DataRecord) => void;
  lang: 'ar' | 'en';
  activeSheet?: SheetType;
}

export const SubscriptionAlertsModal: React.FC<SubscriptionAlertsModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  lang,
  activeSheet = 'stations',
}) => {

  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'expired'>('all');

  if (!isOpen) return null;

  const { alertRecords, totalAlerts, expiringSoonCount, expiredCount } = getSubscriptionAlerts(records, activeSheet as SheetType);

  const filteredAlerts = alertRecords.filter(({ info }) => {
    if (filterType === 'expiring') return info.status === 'expiring_soon';
    if (filterType === 'expired') return info.status === 'expired';
    return true;
  });

  const headerTitleAr = activeSheet === 'stations' ? 'تنبيهات انتهاء اشتراك المحطات' : 'تنبيهات انتهاء اشتراك وكلاء الغاز';
  const headerSubtitleAr = activeSheet === 'stations'
    ? 'إشعارات تلقائية قبل 3 أيام من انتهاء الاشتراك لكل محطة'
    : 'إشعارات تلقائية قبل 3 أيام من انتهاء الاشتراك لكل وكيل غاز';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <span>{lang === 'ar' ? headerTitleAr : (activeSheet === 'stations' ? 'Stations Expiry Alerts' : 'Gas Agents Expiry Alerts')}</span>
                <span className="bg-white text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                  {totalAlerts}
                </span>
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                {lang === 'ar' ? headerSubtitleAr : 'Automatic notifications 3 days prior to subscription expiry'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Quick Filter Tabs */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {lang === 'ar' ? `الكل (${totalAlerts})` : `All (${totalAlerts})`}
          </button>
          <button
            onClick={() => setFilterType('expiring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'expiring'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? `تنتهي قريباً - خلال 3 أيام (${expiringSoonCount})` : `Expiring Soon (${expiringSoonCount})`}</span>
          </button>
          <button
            onClick={() => setFilterType('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'expired'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? `منتهية الاشتراك (${expiredCount})` : `Expired (${expiredCount})`}</span>
          </button>
        </div>

        {/* List of Alert Records */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(({ record, info, target, targetTitleAr, targetTitleEn, targetPersonName }) => {
              const isExpired = info.status === 'expired';

              return (
                <div
                  key={`${record.id}_${target}`}
                  className={`p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isExpired
                      ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        {record.stationName || (lang === 'ar' ? 'محطة بدون اسم' : 'Unnamed Station')}
                      </span>

                      {record.stationCode && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {record.stationCode}
                        </span>
                      )}

                      {/* Subscription Type Badge (صاحب المحطة / وكيل الغاز) */}
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {lang === 'ar' ? targetTitleAr : targetTitleEn}
                      </span>

                      {/* Expiry Pill */}
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm ${
                          isExpired
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isExpired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {lang === 'ar' ? info.badgeTextAr : info.badgeTextEn}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'ar' ? (target === 'agent' ? 'الوكيل:' : 'المالك:') : (target === 'agent' ? 'Agent:' : 'Owner:')} {targetPersonName}</span>
                      </span>

                      {target === 'agent' && record.gasAgentPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.gasAgentPhone}</span>
                        </span>
                      )}

                      {target === 'owner' && record.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.phone}</span>
                        </span>
                      )}

                      {record.governorate && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.governorate} {record.city ? `(${record.city})` : ''}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'ar' ? 'تاريخ الانتهاء:' : 'End Date:'} {info.endDateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Button to Select / Edit Record */}
                  <button
                    onClick={() => {
                      onSelectRecord(record);
                      onClose();
                    }}
                    className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>{lang === 'ar' ? 'عرض السجل وتجديده' : 'View & Renew'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'ممتاز! لا توجد اشتراكات منتهية أو قريبة من الانتهاء حالياً.' : 'Great! No expired or expiring subscriptions.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-extrabold transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
