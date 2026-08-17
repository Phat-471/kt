const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onNavigate: (callback) => ipcRenderer.on('nav-to', (_event, value) => callback(value)),
  onOpenModal: (callback) => ipcRenderer.on('open-modal', (_event, value) => callback(value)),
});
