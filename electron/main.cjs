const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

let mainWindow = null;
let pendingPdfPath = findPdfArgument(process.argv);

function findPdfArgument(argv) {
  return argv.find((argument, index) => index > 0 && argument.toLowerCase().endsWith('.pdf') && !argument.startsWith('--')) || null;
}

async function readPdf(filePath) {
  const data = await fs.readFile(filePath);
  const stats = await fs.stat(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

async function openPdfInWindow(filePath) {
  if (!mainWindow) {
    pendingPdfPath = filePath;
    return;
  }
  try {
    const payload = await readPdf(filePath);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('pdf:open', payload);
  } catch (error) {
    dialog.showErrorBox('无法打开 PDF', `ArcReader 无法读取此文件：\n${filePath}\n\n${error.message}`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'ArcReader',
    width: 1320,
    height: 900,
    minWidth: 860,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const filePath = findPdfArgument(argv);
    if (filePath) void openPdfInWindow(filePath);
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (app.isReady()) void openPdfInWindow(filePath);
    else pendingPdfPath = filePath;
  });

  app.whenReady().then(() => {
    ipcMain.handle('pdf:get-initial-file', async () => {
      if (!pendingPdfPath) return null;
      const filePath = pendingPdfPath;
      pendingPdfPath = null;
      return readPdf(filePath);
    });

    ipcMain.handle('dialog:open-pdf', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window, {
        title: '打开 PDF',
        properties: ['openFile'],
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }],
      });
      if (result.canceled || !result.filePaths[0]) return null;
      return readPdf(result.filePaths[0]);
    });

    ipcMain.handle('window:control', (event, action) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return;
      if (action === 'minimize') window.minimize();
      if (action === 'maximize') {
        if (window.isMaximized()) window.unmaximize();
        else window.maximize();
      }
      if (action === 'close') window.close();
    });

    ipcMain.handle('window:set-opacity', (event, opacity) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return 1;
      const safeOpacity = Math.min(1, Math.max(0.3, Number(opacity) || 1));
      window.setOpacity(safeOpacity);
      return window.getOpacity();
    });

    ipcMain.handle('window:set-always-on-top', (event, enabled) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return false;
      window.setAlwaysOnTop(Boolean(enabled));
      return window.isAlwaysOnTop();
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
