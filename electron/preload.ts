import { ipcRenderer, contextBridge } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  saveBackupDialog: (defaultName: string) => ipcRenderer.invoke('dialog:saveBackup', defaultName),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', { filePath, content }),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  isElectron: true,
});
