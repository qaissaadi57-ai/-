import React from 'react';
import { ProgramConfig } from '../types';
import { SlidersHorizontal, Sun, Moon, Globe, CheckCircle, Bell, Download, Upload, Smartphone } from 'lucide-react';

interface HeaderBarProps {
  config: ProgramConfig;
  recordCount: number;
  alertCount?: number;
  onOpenAlertsModal?: () => void;
  onOpenCustomizer: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  canInstallPWA?: boolean;
  onInstallPWA?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  config,
  recordCount,
  alertCount = 0,
  onOpenAlertsModal,
  onOpenCustomizer,
  lang,
  onToggleLang,
  isDark,
  onToggleDark,
  onExportBackup,
  onImportBackup,
  canInstallPWA,
  onInstallPWA,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackup) {
      onImportBackup(file);
    }
  };

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Program Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 font-black text-xl">
            إ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg sm:text-xl tracking-tight">
                {config.title || 'إدارة'}
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1 shadow-sm">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'ar' ? 'تطبيق محلي 100% بدون إنترنت' : '100% Offline Local App'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'ar' ? 'تخزين محلي مباشر على ذاكرة التابلت / الجهاز' : 'Direct local database on tablet memory'}
            </p>
          </div>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Direct Native PWA Install Button */}
          {canInstallPWA && onInstallPWA && (
            <button
              onClick={onInstallPWA}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 animate-bounce transition-all transform active:scale-95 cursor-pointer"
              title="تثبيت التطبيق مباشرة على جهاز الأندرويد أو التابلت"
            >
              <Smartphone className="w-4 h-4 text-emerald-200" />
              <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
            </button>
          )}

          {/* Notification Bell Button */}
          {onOpenAlertsModal && (
            <button
              onClick={onOpenAlertsModal}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all transform active:scale-95 cursor-pointer ${
                alertCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-md shadow-red-500/20 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
              }`}
              title={lang === 'ar' ? 'تنبيهات انتهاء الاشتراك' : 'Subscription Expiry Alerts'}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'التنبيهات' : 'Alerts'}</span>
              {alertCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-red-600 font-black text-[11px] flex items-center justify-center shadow-sm">
                  {alertCount}
                </span>
              )}
            </button>
          )}

          {/* Offline Backup Export */}
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="تصدير نسخة احتياطية من قاعدة البيانات المحلية"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">نسخة احتياطية</span>
            </button>
          )}

          {/* Offline Backup Restore */}
          {onImportBackup && (
            <label
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="استعادة قاعدة البيانات المحلية من ملف"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">استعادة البيانات</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          )}

          {/* Customize Fields Button */}
          <button
            onClick={onOpenCustomizer}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-sm transition-all transform active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تخصيص الحقول' : 'Customize'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDark}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="تغيير المظهر"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

        </div>

      </div>
    </header>
  );
};

