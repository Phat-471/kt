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

// IPC Handlers for Auto-Update
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

    return { success: true, filePath: targetFile };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-update', async (_event, options = {}) => {
  try {
    const installerPath = downloadedInstallerPath || path.join(app.getPath('temp'), 'KeToanCongDoan-Update.exe');
    if (!fs.existsSync(installerPath)) {
      throw new Error('Không tìm thấy file cài đặt đã tải.');
    }

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
