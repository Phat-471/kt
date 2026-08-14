import { exportFullDatabaseJSON } from './storage';

declare global {
  interface Window {
    electronAPI?: {
      writeFile: (args: { filePath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
      saveBackupDialog: (defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>;
      getAppVersion?: () => Promise<string>;
      checkForUpdates?: () => Promise<{ updateAvailable: boolean; version: string; releaseNotes?: string; message?: string; error?: string }>;
      openFileDialog?: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFile?: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    };
  }
}

export interface StorageLocationConfig {
  safePath: string; // VD: "D:\\KeToan_Data\\AccoDesk_MasterDB.accobak"
  autoBackupIntervalMinutes: number; // Mặc định 15 phút
  lastBackupTime: string | null;
  isAutoBackupEnabled: boolean;
  totalSnapshotsKeep: number; // Mặc định 30 bản
}

const DEFAULT_STORAGE_CONFIG_KEY = 'accodesk_safe_storage_config';

export const getSafeStorageConfig = (): StorageLocationConfig => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(DEFAULT_STORAGE_CONFIG_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse storage config', e);
      }
    }
  }

  return {
    safePath: 'D:\\KeToan_Data\\AccoDesk_MasterDB.accobak',
    autoBackupIntervalMinutes: 15,
    lastBackupTime: null,
    isAutoBackupEnabled: true,
    totalSnapshotsKeep: 30,
  };
};

export const saveSafeStorageConfig = (config: StorageLocationConfig): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEFAULT_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }
};

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  name: string;
  sizeBytes: number;
  txCount: number;
  clientCount: number;
  dataJson: string;
}

const SNAPSHOTS_KEY = 'accodesk_backup_snapshots_list';
let memorySnapshots: BackupSnapshot[] = [];

export const getBackupSnapshots = (): BackupSnapshot[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(SNAPSHOTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse snapshots', e);
      }
    }
    return [];
  }
  return memorySnapshots;
};

export const saveBackupSnapshots = (snapshots: BackupSnapshot[]): void => {
  memorySnapshots = snapshots.slice(0, 30);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(memorySnapshots));
  }
};

export const createLocalSnapshot = async (name?: string): Promise<BackupSnapshot> => {
  const dbJson = await exportFullDatabaseJSON();
  let parsed: any = {};
  try {
    parsed = JSON.parse(dbJson);
  } catch (e) {}

  const snapshot: BackupSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: new Date().toLocaleString('vi-VN'),
    name: name || `Bản sao lưu ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`,
    sizeBytes: new Blob([dbJson]).size,
    txCount: parsed.transactions?.length || 0,
    clientCount: parsed.clients?.length || 0,
    dataJson: dbJson,
  };

  const list = [snapshot, ...getBackupSnapshots()];
  saveBackupSnapshots(list);
  return snapshot;
};

export const deleteLocalSnapshot = (id: string): void => {
  const list = getBackupSnapshots().filter(s => s.id !== id);
  saveBackupSnapshots(list);
};

export const executeSyncToSafeDrive = async (customPath?: string): Promise<{ success: boolean; filePath: string; timestamp: string }> => {
  const config = getSafeStorageConfig();
  const targetPath = customPath || config.safePath;
  const dbJson = await exportFullDatabaseJSON();
  const timestamp = new Date().toLocaleString('vi-VN');

  // Lưu vào danh sách snapshot
  await createLocalSnapshot(`Sao lưu tự động ${timestamp}`);

  // Nếu môi trường Electron, lưu trực tiếp qua IPC File System
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.writeFile) {
    const res = await window.electronAPI.writeFile({ filePath: targetPath, content: dbJson });
    if (res.success) {
      config.lastBackupTime = timestamp;
      saveSafeStorageConfig(config);
      return { success: true, filePath: targetPath, timestamp };
    }
  }

  // Môi trường Browser / Fallback: Lưu vào LocalStorage Backup Cache & Tải File
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`accodesk_backup_safe_cache`, dbJson);
  }
  config.lastBackupTime = timestamp;
  saveSafeStorageConfig(config);

  return { success: true, filePath: targetPath, timestamp };
};
