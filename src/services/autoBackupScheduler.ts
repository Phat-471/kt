import { getSafeStorageConfig, executeSyncToSafeDrive } from './persistentStorageService';

let autoBackupTimer: any = null;

export const startAutoBackupScheduler = (onSuccessCallback?: (timestamp: string) => void) => {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
  }

  const config = getSafeStorageConfig();
  if (!config.isAutoBackupEnabled) return;

  const intervalMs = config.autoBackupIntervalMinutes * 60 * 1000;

  autoBackupTimer = setInterval(async () => {
    try {
      const res = await executeSyncToSafeDrive();
      if (res.success && onSuccessCallback) {
        onSuccessCallback(res.timestamp);
      }
    } catch (e) {
      console.error('Auto Backup Failed', e);
    }
  }, intervalMs);
};

export const stopAutoBackupScheduler = () => {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
};
