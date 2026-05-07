/**
 * SoftShopping Desktop — Electron Main Process
 *
 * Responsibilities:
 * - BrowserWindow lifecycle
 * - IPC handlers (ÖKC serial port bridge, print receipts)
 * - JWT token management (stored in electron-store)
 * - WebSocket reconnection logic
 *
 * Platform-specific:
 * - Windows: COM port access for ÖKC
 * - macOS/Linux: serial port via node-serialport
 */

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import log from 'electron-log';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        title: 'SoftShopping',
    });

    // Load the web app URL (configure for local dev or production)
    const isDev = process.env.NODE_ENV === 'development';
    const entryUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../web/out/index.html')}`;

    mainWindow.loadURL(entryUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    log.info(`SoftShopping Desktop started (dev=${isDev})`);
};

const createMenu = () => {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'Dosya',
            submenu: [
                { label: 'Yeni Satış', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-sale') },
                { type: 'separator' },
                { label: 'Çıkış', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
            ],
        },
        {
            label: 'Görünüm',
            submenu: [
                { label: 'Tam Ekran', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
                { type: 'separator' },
                { label: 'Geliştirici Araçları', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

// IPC: ÖKC serial port communication bridge
ipcMain.handle('okc:send', async (_event, command: string) => {
    log.info(`[ÖKC] Sending command: ${command}`);
    // TODO: Serial port implementation (node-serialport or @serialport/node)
    // Placeholder — returns empty response until hardware integration
    return { success: true, response: '' };
});

ipcMain.handle('okc:status', async () => {
    // Placeholder: returns mock ÖKC status
    return { connected: false, fiscal: false, paper: true };
});

// IPC: Print receipt
ipcMain.handle('print:receipt', async (_event, receiptData: object) => {
    log.info('[Print] Printing receipt', receiptData);
    // TODO: Rawbt/ESC/POS print driver integration per platform
    return { success: true };
});

app.whenReady().then(() => {
    log.info('Electron app ready');
    createMenu();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});