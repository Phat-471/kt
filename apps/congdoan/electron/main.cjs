const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow;
let downloadedInstallerPath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Phần Mềm Kế Toán Tài Chính Công Đoàn Cơ Sở - v' + app.getVersion(),
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
    autoHideMenuBar: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Tùy chỉnh Menu
  const template = [
    {
      label: 'Hệ Thống',
      submenu: [
        { label: 'Tải Lại Trang', role: 'reload' },
        { label: 'Toàn Màn Hình', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Thoát', role: 'quit' }
      ]
    },
    {
      label: 'Chức Năng',
      submenu: [
        { label: 'Phiếu Thu / Chi (C40-C41)', click: () => mainWindow.webContents.send('nav-to', 'VOUCHERS') },
        { label: 'Trích Nộp KPCĐ (2%) & Đoàn Phí', click: () => mainWindow.webContents.send('nav-to', 'CONTRIBUTIONS') },
        { label: 'Sổ Quỹ & Quyết Toán (B07-TLĐ)', click: () => mainWindow.webContents.send('nav-to', 'REPORTS_BOOKS') },
        { label: 'Cài Đặt & Danh Mục Nhân Viên', click: () => mainWindow.webContents.send('nav-to', 'SETTINGS') },
      ]
    },
    {
      label: 'Trợ Giúp & Cập Nhật',
      submenu: [
        {
          label: 'Kiểm Tra Cập Nhật Online...',
          click: () => mainWindow.webContents.send('open-modal', 'UPDATE')
        },
        {
          label: 'Gửi Báo Cáo Lỗi & Hỗ Trợ Trực Tiếp...',
          click: () => mainWindow.webContents.send('open-modal', 'FEEDBACK')
        },
        { type: 'separator' },
        {
          label: `Thông Tin Phần Mềm (v${app.getVersion()})`,
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Kế Toán Tài Chính Công Đoàn Cơ Sở',
              message: `Phần Mềm Kế Toán Tài Chính Công Đoàn Cơ Sở v${app.getVersion()}`,
              detail: 'Áp dụng Quyết định số 61/QĐ-TLĐ & Thông tư 107/2017/TT-BTC.\nTự động cập nhật online một chạm.\nPhát triển bởi đội ngũ kỹ thuật phần mềm kế toán.',
              buttons: ['Đóng']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper: Download file with redirect handling and progress
function downloadFileWithProgress(fileUrl, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const request = (url) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'KeToanCongDoan-App' } }, (res) => {
        // Handle HTTP redirects (GitHub releases redirect to AWS S3)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Tải file thất bại (HTTP ${res.statusCode})`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
          onProgress({
            percent,
            receivedBytes,
            totalBytes
          });
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destPath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    request(fileUrl);
  });
}

// Helper: Validate installer file integrity
function validateInstallerFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { valid: false, error: 'File không tồn tại.' };
    const stats = fs.statSync(filePath);
    // Installer của app thường > 50MB, nếu < 20MB là file tải dở hoặc lỗi 404
    if (stats.size < 20 * 1024 * 1024) {
      return { valid: false, error: `File tải về không đầy đủ (chỉ có ${(stats.size / 1024 / 1024).toFixed(1)} MB). Vui lòng thử lại.` };
    }
    // Kiểm tra Windows PE Header "MZ"
    const buffer = Buffer.alloc(2);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);
    if (buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
      return { valid: false, error: 'File tải về không phải là bộ cài đặt Windows hợp lệ.' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Backup current version info before update
function createPreUpdateBackup() {
  try {
    const backupDir = path.join(app.getPath('userData'), 'version_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupInfo = {
      previousVersion: app.getVersion(),
      timestamp: new Date().toISOString(),
      appPath: app.getAppPath(),
    };
    fs.writeFileSync(path.join(backupDir, 'last_known_stable.json'), JSON.stringify(backupInfo, null, 2));
  } catch (e) {
    console.error('Failed to create pre-update backup', e);
  }
}

// IPC Handlers for Auto-Update & Safe Rollback
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('download-update', async (_event, downloadUrl) => {
  try {
    const tempDir = app.getPath('temp');
    const targetFile = path.join(tempDir, 'KeToanCongDoan-Update.exe');
    downloadedInstallerPath = targetFile;

    await downloadFileWithProgress(downloadUrl, targetFile, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });

    // Kiểm tra tính toàn vẹn file ngay sau khi tải xong
    const validation = validateInstallerFile(targetFile);
    if (!validation.valid) {
      try { fs.unlinkSync(targetFile); } catch (e) {}
      return { success: false, error: validation.error };
    }

    return { success: true, filePath: targetFile };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-update', async (_event, options = {}) => {
  try {
    const installerPath = downloadedInstallerPath || path.join(app.getPath('temp'), 'KeToanCongDoan-Update.exe');
    
    // Kiểm tra tính toàn vẹn trước khi chạy installer
    const validation = validateInstallerFile(installerPath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Tạo bản snapshot phiên bản hiện tại trước khi ghi đè
    createPreUpdateBackup();

    // Mặc định chạy ở chế độ Silent /S (cài đặt ngầm không hiện popup hỏi han)
    const isSilent = options.silent !== false;
    const args = isSilent ? ['/S'] : [];

    const child = spawn(installerPath, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Thoát ứng dụng ngay để bộ cài tiến hành ghi đè và tự khởi động lại app mới
    setTimeout(() => {
      app.quit();
    }, 500);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Khôi phục về phiên bản trước (Rollback)
ipcMain.handle('rollback-version', async (_event, targetVersion) => {
  try {
    // Tải trực tiếp bộ cài của phiên bản chỉ định từ GitHub Releases
    const targetUrl = `https://github.com/Phat-471/kt/releases/download/${targetVersion}/KeToanCongDoan-Setup-${targetVersion}.exe`;
    const tempDir = app.getPath('temp');
    const rollbackFile = path.join(tempDir, `KeToanCongDoan-Rollback-${targetVersion}.exe`);
    
    downloadedInstallerPath = rollbackFile;

    await downloadFileWithProgress(targetUrl, rollbackFile, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });

    const validation = validateInstallerFile(rollbackFile);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const child = spawn(rollbackFile, ['/S'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    setTimeout(() => {
      app.quit();
    }, 500);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
