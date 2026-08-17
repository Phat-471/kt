const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onNavigate: (callback) => ipcRenderer.on('nav-to', (_event, value) => callback(value)),
  onOpenModal: (callback) => ipcRenderer.on('open-modal', (_event, value) => callback(value)),
  
  // Auto Updater APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  startDownloadUpdate: (downloadUrl) => ipcRenderer.invoke('download-update', downloadUrl),
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  installUpdate: (options) => ipcRenderer.invoke('install-update', options)
});
