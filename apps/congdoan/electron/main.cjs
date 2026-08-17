const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Phần Mềm Kế Toán Tài Chính Công Đoàn Cơ Sở - v1.1.0',
    icon: path.join(__dirname, '../public/favicon.ico'),
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
          label: 'Kiểm Tra Cập Nhật (v1.1.0)...',
          click: () => mainWindow.webContents.send('open-modal', 'UPDATE')
        },
        {
          label: 'Gửi Báo Cáo Lỗi & Hỗ Trợ Trực Tiếp...',
          click: () => mainWindow.webContents.send('open-modal', 'FEEDBACK')
        },
        { type: 'separator' },
        {
          label: 'Thông Tin Phần Mềm (v1.1.0)',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Kế Toán Tài Chính Công Đoàn Cơ Sở',
              message: 'Phần Mềm Kế Toán Tài Chính Công Đoàn Cơ Sở v1.1.0',
              detail: 'Áp dụng Quyết định số 61/QĐ-TLĐ (Mức đóng ĐP 0.5%) & Thông tư 107/2017/TT-BTC.\nTính năng mới: Nhập/Xuất Excel thực tế từ Thu chi 2025, Phi cong doan 2026, BCQT 2026.\nPhát triển bởi đội ngũ kỹ thuật phần mềm kế toán.',
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
