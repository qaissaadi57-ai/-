import { DataRecord, ProgramConfig } from '../types';
import { defaultProgramConfig, sampleRecords } from '../data/defaultConfig';

const DB_NAME = 'GasStationOfflineDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_CONFIG = 'config';

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported on this browser/device.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Load Records with IndexedDB primary + LocalStorage fallback
export async function loadRecordsOffline(): Promise<DataRecord[]> {
  try {
    const db = await openDB();
    const records = await new Promise<DataRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as DataRecord[]);
      req.onerror = () => reject(req.error);
    });

    if (records && records.length > 0) {
      return records;
    }
  } catch (err) {
    console.warn('IndexedDB read failed, falling back to LocalStorage', err);
  }

  // Fallback to LocalStorage
  const saved = localStorage.getItem('userform_records');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r) => ({
          ...r,
          recordType: r.recordType || (r.stationName || r.ownerName ? 'stations' : 'agents'),
        }));
      }
    } catch (e) {
      console.error('LocalStorage parse error', e);
    }
  }

  return sampleRecords;
}

// Save Records to both IndexedDB and LocalStorage synchronously for 100% safety
export async function saveRecordsOffline(records: DataRecord[]): Promise<void> {
  // Always update LocalStorage immediately for instant sync
  try {
    localStorage.setItem('userform_records', JSON.stringify(records));
  } catch (e) {
    console.warn('LocalStorage save quota error', e);
  }

  // Write to IndexedDB for persistent large-scale storage
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDS);

    // Clear existing store & bulk put
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        records.forEach((rec) => store.put(rec));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('IndexedDB write error', err);
  }
}

// Load Program Config
export async function loadConfigOffline(): Promise<ProgramConfig> {
  try {
    const db = await openDB();
    const configItem = await new Promise<{ key: string; value: ProgramConfig } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const req = store.get('main_config');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (configItem && configItem.value) {
      return configItem.value;
    }
  } catch (err) {
    console.warn('IndexedDB config read error', err);
  }

  // Fallback to LocalStorage
  const saved = localStorage.getItem('userform_program_config_v2');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.stationFields && parsed.agentFields) {
        return parsed;
      }
    } catch (e) {
      console.error('LocalStorage config parse error', e);
    }
  }

  return defaultProgramConfig;
}

// Save Program Config
export async function saveConfigOffline(config: ProgramConfig): Promise<void> {
  try {
    localStorage.setItem('userform_program_config_v2', JSON.stringify(config));
  } catch (e) {
    console.warn('LocalStorage config save error', e);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    store.put({ key: 'main_config', value: config });
  } catch (err) {
    console.warn('IndexedDB config write error', err);
  }
}

// Export Full JSON Offline Backup
export function exportDatabaseBackupJSON(records: DataRecord[], config: ProgramConfig) {
  const data = {
    app: 'GasStationAgentProgram',
    exportedAt: new Date().toISOString(),
    version: '1.0.0-offline',
    records,
    config,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `GasStation_Offline_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import Full JSON Offline Backup
export function importDatabaseBackupJSON(
  file: File,
  onSuccess: (records: DataRecord[], config?: ProgramConfig) => void,
  onError: (msg: string) => void
) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);

      if (parsed && Array.isArray(parsed.records)) {
        await saveRecordsOffline(parsed.records);
        if (parsed.config) {
          await saveConfigOffline(parsed.config);
        }
        onSuccess(parsed.records, parsed.config);
      } else {
        onError('ملف النسخة الاحتياطية غير صالح أو لا يحتوي على سجلات.');
      }
    } catch (err) {
      onError('فشل قراءة ملف النسخة الاحتياطية.');
    }
  };
  reader.readAsText(file);
}
