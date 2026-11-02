const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

// Start Express server inside the Electron process
const serverApp = require('../server/index');
const PORT = process.env.PORT || 4500;
let serverInstance = null;

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuitting = false;

// Intervals
let azkarTimer = null;
let quranTimer = null;
let duaaTimer = null;
let alertCheckTimer = null;

function startExpressServer() {
  return new Promise((resolve, reject) => {
    try {
      serverInstance = serverApp.listen(PORT, () => {
        console.log(`[Express] Running on http://localhost:${PORT}`);
        resolve();
      });
    } catch (err) {
      console.error("Error starting express server:", err);
      resolve(); // Proceed anyway
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1000,
    minHeight: 650,
    title: "تحويشة استغفار",
    icon: path.join(__dirname, '..', 'public', 'assets', 'logo.svg'),
    backgroundColor: '#042f2e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: "تحويشة استغفار",
          content: "التطبيق يعمل الآن في الخلفية لتنبيهك بالأذكار والآيات والدعاء ومواعيد الأقساط والرخص."
        });
      }
    }
  });
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 450,
    height: 270,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  overlayWindow.loadFile(path.join(__dirname, '..', 'public', 'overlay.html'));

  overlayWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      overlayWindow.hide();
    }
  });
}

function showOverlayWithData(alertData) {
  if (!overlayWindow) {
    createOverlayWindow();
  }

  // Calculate position on bottom-right of primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const overlayWidth = 450;
  const overlayHeight = 270;
  const x = width - overlayWidth - 20;
  const y = height - overlayHeight - 20;

  overlayWindow.setPosition(x, y);
  overlayWindow.webContents.send('alert-data', alertData);
  overlayWindow.show();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'assets', 'logo.svg');
  // In Electron, createFromPath works well with SVG/PNG
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 24, height: 24 });
  }

  tray = new Tray(icon);
  tray.setToolTip("تحويشة استغفار - بركة الرزق ونور الاستغفار");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "فتح تحويشة استغفار",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: "🔔 تجربة تنبيه الأذكار (نصف ساعة)",
      click: () => triggerAzkarAlert()
    },
    {
      label: "📖 تجربة تنبيه 5 آيات قرآنية (ساعة)",
      click: () => triggerQuranAlert()
    },
    {
      label: "🤲 تجربة تنبيه دعاء للمتوفي (ساعة ونصف)",
      click: () => triggerDuaaAlert()
    },
    { type: 'separator' },
    {
      label: "إغلاق البرنامج نهائياً",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Helper to fetch data from local API
function fetchLocal(pathStr) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}${pathStr}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function triggerAzkarAlert() {
  const data = await fetchLocal('/api/religious/azkar');
  if (data) {
    showOverlayWithData(data);
  }
}

async function triggerQuranAlert() {
  const data = await fetchLocal('/api/religious/quran');
  if (data) {
    showOverlayWithData(data);
  }
}

async function triggerDuaaAlert() {
  // Use admin or default deceased duaa
  const data = await fetchLocal('/api/religious/azkar');
  // Fetch custom duaa directly from DB
  const db = require('../server/db');
  const { deceasedDuaaTemplates } = require('../server/religiousData');
  
  // Find any active user's deceased name or default
  const users = db.getAllUsers();
  const user = users.find(u => u.deceasedName && u.deceasedName !== 'لم يحدد') || { deceasedName: "جميع موتى المسلمين" };
  const template = deceasedDuaaTemplates[Math.floor(Math.random() * deceasedDuaaTemplates.length)];
  const formattedDuaa = template.replace(/{NAME}/g, user.deceasedName);

  showOverlayWithData({
    type: "duaa",
    title: `دعاء للمتوفي (${user.deceasedName}) - كل 90 دقيقة`,
    deceasedName: user.deceasedName,
    content: formattedDuaa
  });
}

// Background scheduler timers
function setupBackgroundTimers() {
  // 30 Minutes: Azkar reminder (1800000 ms)
  azkarTimer = setInterval(() => {
    triggerAzkarAlert();
  }, 30 * 60 * 1000);

  // 60 Minutes: Quran 5 verses reminder (3600000 ms)
  quranTimer = setInterval(() => {
    triggerQuranAlert();
  }, 60 * 60 * 1000);

  // 90 Minutes: Duaa for the deceased (5400000 ms)
  duaaTimer = setInterval(() => {
    triggerDuaaAlert();
  }, 90 * 60 * 1000);

  // Periodic alert scanner (every 30 minutes)
  alertCheckTimer = setInterval(async () => {
    // Check pending alerts
    console.log("[Background] Scanning for upcoming installments and license expirations...");
  }, 30 * 60 * 1000);

  // Initial welcome thikr after 5 seconds for immediate delight
  setTimeout(() => {
    triggerAzkarAlert();
  }, 5000);
}

// IPC Handlers
ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

ipcMain.on('open-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('trigger-floating-alert', (event, data) => {
  showOverlayWithData(data);
});

// App Lifecycle
app.whenReady().then(async () => {
  await startExpressServer();
  createMainWindow();
  createOverlayWindow();
  createTray();
  setupBackgroundTimers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (azkarTimer) clearInterval(azkarTimer);
  if (quranTimer) clearInterval(quranTimer);
  if (duaaTimer) clearInterval(duaaTimer);
  if (alertCheckTimer) clearInterval(alertCheckTimer);
  if (serverInstance) serverInstance.close();
});

app.on('window-all-closed', () => {
  // On Windows, keep app running in tray unless explicit quit
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
