const { app, BrowserWindow, shell, dialog, ipcMain, clipboard } = require('electron');
const { listFreeCloudProviders, openFreeCloudProvider } = require('./lib/freeCloudProviders');
const path = require('path');
const { register: registerLocalInference } = require('./lib/localInference');
const { register: registerWan2gp } = require('./lib/wan2gpProvider');

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    try {
        dialog.showErrorBox('Open Generative AI — Unexpected Error', err && err.stack ? err.stack : String(err));
    } catch (_) {
        // dialog unavailable this early; the console log above is the fallback
    }
});

// Ubuntu 24.04+ sets kernel.apparmor_restrict_unprivileged_userns=1 which
// blocks Chromium's user namespace sandbox. The .deb package ships an AppArmor
// profile that grants the permission cleanly. When running the AppImage on an
// affected system, run once: sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
// or pass --no-sandbox on the command line.
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('disable-dev-shm-usage');
}

let mainWindow;

function createWindow() {
    const isMac = process.platform === 'darwin';

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        webPreferences: {
            webSecurity: true,
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
        ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}),
        backgroundColor: '#0d0d0d',
        show: false,
        title: 'Open Generative AI',
    });

    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
        console.error('Failed to load index.html:', err);
        mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', (event, code, desc) => {
        console.error('did-fail-load:', code, desc);
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Zero-cost cloud handoff: no automatic uploads or billable requests.
    ipcMain.handle('free-cloud:list', () => listFreeCloudProviders());
    ipcMain.handle('free-cloud:open', (_event, providerId) => openFreeCloudProvider(providerId, url => shell.openExternal(url)));
    ipcMain.handle('free-cloud:copy-prompt', (_event, prompt) => {
        if (typeof prompt !== 'string' || prompt.length > 12000) throw new Error('Prompt invalid or too long');
        clipboard.writeText(prompt);
        return { ok: true };
    });

    try {
        registerLocalInference();
        registerWan2gp();
    } catch (err) {
        console.error('Failed to register local-ai/wan2gp handlers:', err);
        dialog.showErrorBox(
            'Local AI features unavailable',
            `Open Generative AI started, but local model support failed to initialize:\n\n${err.message}`
        );
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
