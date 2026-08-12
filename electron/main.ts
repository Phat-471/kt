import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  const preloadPath = fs.existsSync(path.join(__dirname, 'preload.mjs'))
    ? path.join(__dirname, 'preload.mjs')
    : path.join(__dirname, 'preload.js');

  win = new BrowserWindow({
    title: 'AccoDesk - Trợ Lý Kế Toán Desktop',
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Setup IPC Handlers
  ipcMain.handle('dialog:openFile', async (_, options) => {
    const result = await dialog.showOpenDialog(win!, options || {
      properties: ['openFile'],
      filters: [{ name: 'Excel & CSV Files', extensions: ['xlsx', 'xls', 'csv'] }]
    });
    return result;
  });

  ipcMain.handle('dialog:saveBackup', async (_, defaultName: string) => {
    const result = await dialog.showSaveDialog(win!, {
      title: 'Lưu Tệp Sao Lưu Kế Toán (.accobak)',
      defaultPath: defaultName || `AccoDesk_Backup_${new Date().toISOString().slice(0,10)}.accobak`,
      filters: [{ name: 'AccoDesk Backup File', extensions: ['accobak', 'json'] }]
    });
    return result;
  });

  ipcMain.handle('file:write', async (_, { filePath, content }: { filePath: string; content: string }) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  createWindow();
});
