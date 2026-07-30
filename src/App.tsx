import React, { useState, useEffect } from 'react';
import { ProgramConfig, DataRecord, SheetType } from './types';
import { defaultProgramConfig, sampleRecords } from './data/defaultConfig';
import { FormCard } from './components/FormCard';
import { RecordTable } from './components/RecordTable';
import { HeaderBar } from './components/HeaderBar';
import { CustomizeFieldsModal } from './components/CustomizeFieldsModal';
import { SubscriptionAlertBanner } from './components/SubscriptionAlertBanner';
import { SubscriptionAlertsModal } from './components/SubscriptionAlertsModal';
import { getSubscriptionAlerts } from './utils/subscriptionUtils';
import {
  loadRecordsOffline,
  saveRecordsOffline,
  loadConfigOffline,
  saveConfigOffline,
  exportDatabaseBackupJSON,
  importDatabaseBackupJSON,
} from './utils/db';
import { Building2, Flame, HardDrive } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ProgramConfig>(defaultProgramConfig);
  const [records, setRecords] = useState<DataRecord[]>(sampleRecords);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const [activeSheet, setActiveSheet] = useState<SheetType>('stations');
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isDark, setIsDark] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Capture PWA beforeinstallprompt and appinstalled events
  useEffect(() => {
    // Check if app is already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome automatic prompt banner and store event for custom trigger
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    try {
      // Trigger Chrome's native install prompt window
      await deferredPrompt.prompt();
      // Wait for user choice response
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
        showTempMessage(lang === 'ar' ? 'تم تثبيت التطبيق بنجاح!' : 'PWA App Installed Successfully!');
      } else {
        // User dismissed the prompt, clear stored prompt as it cannot be reused
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('Error calling PWA install prompt:', err);
      setDeferredPrompt(null);
    }
  };

  // Initial Offline Load from IndexedDB & LocalStorage
  useEffect(() => {
    async function initOfflineData() {
      try {
        const loadedConfig = await loadConfigOffline();
        setConfig(loadedConfig);

        const loadedRecords = await loadRecordsOffline();
        setRecords(loadedRecords);
      } catch (e) {
        console.error('Error initializing offline database', e);
      } finally {
        setIsDbLoaded(true);
      }
    }
    initOfflineData();
  }, []);

  // Sync config to local IndexedDB & LocalStorage
  useEffect(() => {
    if (isDbLoaded) {
      saveConfigOffline(config);
    }
  }, [config, isDbLoaded]);

  // Sync records to local IndexedDB & LocalStorage
  useEffect(() => {
    if (isDbLoaded) {
      saveRecordsOffline(records);
    }
  }, [records, isDbLoaded]);

  // Calculate total active subscription alerts for current sheet
  const { totalAlerts } = getSubscriptionAlerts(records, activeSheet);

  // Count records per sheet
  const stationCount = records.filter(
    (r) => r.recordType === 'stations' || (!r.recordType && (r.stationName || r.ownerName))
  ).length;
  const agentCount = records.filter(
    (r) => r.recordType === 'agents' || (!r.recordType && r.gasAgentName)
  ).length;

  // Handle Dark mode class on html tag
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Add Record handler (Direct Offline Auto-Save)
  const handleAddRecord = (formData: Record<string, any>) => {
    const newRecord: DataRecord = {
      id: 'rec_' + Date.now(),
      recordType: activeSheet,
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRecords((prev) => [newRecord, ...prev]);
    setSelectedRecord(null);
    showTempMessage(lang === 'ar' ? 'تم الحفظ تلقائياً في قاعدة البيانات المحلية!' : 'Saved to local database!');
  };

  // Update Record handler
  const handleUpdateRecord = (id: string, formData: Record<string, any>) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...formData, recordType: activeSheet, updatedAt: new Date().toISOString() } : r))
    );
    setSelectedRecord(null);
    showTempMessage(lang === 'ar' ? 'تم تحديث السجل وحفظه محلياً!' : 'Record updated locally!');
  };

  // Delete Record handler
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
    showTempMessage(lang === 'ar' ? 'تم حذف السجل من القاعدة المحلية!' : 'Record deleted locally!');
  };

  // Import Records handler
  const handleImportRecords = (newRecords: DataRecord[]) => {
    setRecords((prev) => [...newRecords, ...prev]);
    showTempMessage(lang === 'ar' ? `تم استيراد ${newRecords.length} سجل بنجاح!` : `Imported ${newRecords.length} records!`);
  };

  // Export Offline Backup JSON
  const handleExportBackup = () => {
    exportDatabaseBackupJSON(records, config);
    showTempMessage(lang === 'ar' ? 'تم تصدير ملف النسخة الاحتياطية بنجاح!' : 'Exported offline backup!');
  };

  // Import Offline Backup JSON
  const handleImportBackup = (file: File) => {
    importDatabaseBackupJSON(
      file,
      (importedRecords, importedConfig) => {
        setRecords(importedRecords);
        if (importedConfig) setConfig(importedConfig);
        showTempMessage(lang === 'ar' ? 'تمت استعادة قاعدة البيانات بنجاح!' : 'Restored database successfully!');
      },
      (err) => {
        alert(err);
      }
    );
  };

  const showTempMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const isRtl = config.dir === 'rtl';

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors ${isRtl ? 'rtl' : 'ltr'}`}>
      
      {/* Header Bar */}
      <HeaderBar
        config={config}
        recordCount={records.length}
        alertCount={totalAlerts}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        canInstallPWA={!!deferredPrompt && !isInstalled}
        onInstallPWA={handleInstallPWA}
      />

      {/* Prominent PWA Install Callout Banner - Shows ONLY when native beforeinstallprompt is ready */}
      {deferredPrompt && !isInstalled && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500 text-slate-950 rounded-lg font-black text-[10px]">PWA</span>
            <span>
              {lang === 'ar'
                ? 'تطبيق محلي كامل يثبت على جهاز الأندرويد والتابلت ويعمل 100% بدون إنترنت'
                : 'Standalone local PWA app works 100% offline on Android and tablet'}
            </span>
          </div>
          <button
            onClick={handleInstallPWA}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-sm"
          >
            {lang === 'ar' ? 'تثبيت التطبيق على الجهاز' : 'Install Standalone App'}
          </button>
        </div>
      )}

      {/* Floating Temp Status Toast */}
      {statusMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold border border-slate-700 flex items-center gap-2 animate-bounce">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        
        {/* Independent Sheets Tab Selector */}
        <div className="flex items-center justify-center sm:justify-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          
          <button
            onClick={() => {
              setActiveSheet('stations');
              setSelectedRecord(null);
            }}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center gap-2.5 cursor-pointer ${
              activeSheet === 'stations'
                ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Building2 className="w-5 h-5 text-amber-300" />
            <span>المحطات</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeSheet === 'stations' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {stationCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSheet('agents');
              setSelectedRecord(null);
            }}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center gap-2.5 cursor-pointer ${
              activeSheet === 'agents'
                ? 'bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <span>وكلاء الغاز</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeSheet === 'agents' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {agentCount}
            </span>
          </button>

        </div>

        {/* Subscription Expiry Alert Banner (Specific to active sheet) */}
        <SubscriptionAlertBanner
          records={records}
          activeSheet={activeSheet}
          onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          lang={lang}
        />

        {/* Form Card Section */}
        <section className="space-y-4">
          <FormCard
            config={config}
            activeSheet={activeSheet}
            selectedRecord={selectedRecord}
            onAddRecord={handleAddRecord}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onClearSelection={() => setSelectedRecord(null)}
            records={records}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            lang={lang}
          />
        </section>

        {/* Sheet Records Table Section */}
        <section className="pt-2">
          <RecordTable
            config={config}
            activeSheet={activeSheet}
            records={records}
            selectedRecord={selectedRecord}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onDeleteRecord={handleDeleteRecord}
            onImportRecords={handleImportRecords}
            lang={lang}
          />
        </section>

      </main>

      {/* Customize Fields & Program Name Modal */}
      <CustomizeFieldsModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => setConfig(newConfig)}
        lang={lang}
      />

      {/* Subscription Expiry Alerts Modal */}
      <SubscriptionAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        records={records}
        activeSheet={activeSheet}
        onSelectRecord={(rec) => {
          setSelectedRecord(rec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        lang={lang}
      />

    </div>
  );
}

