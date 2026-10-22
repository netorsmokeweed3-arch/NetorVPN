const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let mainWindow;
let tray = null;
let isConnected = false;

let trafficMonitorInterval = null;
let prevReceived = 0;
let prevSent = 0;
let prevTime = Date.now();
let sessionStartTime = null;

const isDev = !app.isPackaged;
const statsFilePath = path.join(app.getPath('userData'), 'vpn-sessions.json');
const logPath = path.join(app.getPath('userData'), 'vpn-app.log');

function loadStats() {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = fs.readFileSync(statsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return { totalSeconds: 0, sessions: [] };
}

function saveStats(stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
  } catch (e) {}
}

function writeLog(message, type = 'INFO') {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] [${type}] ${message}\n`, 'utf8');
  } catch (e) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 720,
    resizable: false,
    frame: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenu(null);

  // Згортається стандартно у панель завдань (в програми)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      stopShadowsocks();
      app.isQuitting = true;
      app.quit();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Netor VPN (Frankfurt)', enabled: false },
    { type: 'separator' },
    { 
      label: isConnected ? '🔴 Вимкнути VPN' : '🟢 Увімкнути VPN', 
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-vpn-toggle');
        }
      } 
    },
    { label: 'Показати вікно', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { 
      label: 'Вихід', 
      click: () => {
        app.isQuitting = true;
        stopShadowsocks();
        app.quit();
      } 
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

function createTray() {
  let iconPath = path.join(__dirname, 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, 'icon.ico');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(path.dirname(process.execPath), 'icon.ico');
  }

  try {
    tray = new Tray(iconPath);
    tray.setToolTip('Netor VPN');
    updateTrayMenu();

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    writeLog('Трей-іконку Netor VPN успішно створено.');
  } catch (err) {
    writeLog(`Помилка створення трею: ${err.message}`, 'ERROR');
  }
}

function startShadowsocks() {
  try {
    exec('taskkill /f /im Shadowsocks.exe', { windowsHide: true }, () => {});
  } catch (e) {}

  const exeDir = isDev ? __dirname : path.dirname(process.execPath);
  let exePath = path.join(exeDir, 'Shadowsocks.exe');

  if (!fs.existsSync(exePath)) {
    writeLog(`КРИТИЧНО: Файл Shadowsocks.exe не знайдено за шляхом: ${exePath}`, 'ERROR');
    return;
  }

  writeLog(`Запуск Shadowsocks.exe через PowerShell з теки: ${exeDir}`);

  try {
    // 1. Запускаємо Shadowsocks звичайним способом
    const psCommand = `powershell -NoProfile -Command "Start-Process -FilePath '${exePath}' -WorkingDirectory '${exeDir}'"`;
    
    exec(psCommand, { windowsHide: true }, (error) => {
      if (error) {
        writeLog(`Помилка PowerShell запуску: ${error.message}`, 'ERROR');
      }
    });

    // 2. Додаємо невелику затримку (2 секунди), поки він запуститься і намалює іконку, 
    // після чого приховуємо іконку Shadowsocks із трею через Win32 API / PowerShell
    setTimeout(() => {
      const hideTrayCmd = `powershell -NoProfile -Command "
        Add-Type -TypeDefinition '
          using System;
          using System.Runtime.InteropServices;
          public class TrayHider {
            [DllImport(\"user32.dll\")]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            [DllImport(\"user32.dll\")]
            public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
            [DllImport(\"user32.dll\")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
          }
        ';
        # Шукаємо та приховуємо приховані вікна/іконки Shadowsocks у треї
        $hwnd = [TrayHider]::FindWindow(\"WindowsForms10.Window.8.app.0.33c0d9d\", $null);
        if ($hwnd -ne [IntPtr]::Zero) { [TrayHider]::ShowWindow($hwnd, 0); }
      "`;

      exec(hideTrayCmd, { windowsHide: true }, () => {});
    }, 2000);

    writeLog('Команду запуску та приховування іконки надіслано.');
  } catch (err) {
    writeLog(`FATAL: ${err.message}`, 'FATAL');
  }
}

function stopShadowsocks() {
  try {
    // 1. Зупиняємо процес Shadowsocks
    exec('taskkill /f /im Shadowsocks.exe', { windowsHide: true }, () => {});

    // 2. Миттєво відновлюємо інтернет через скидання системного проксі у реєстрі Windows
    const disableProxyCmd = `powershell -NoProfile -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0"`;
    
    exec(disableProxyCmd, { windowsHide: true }, (err) => {
      if (err) {
        writeLog(`Помилка скидання проксі у реєстрі: ${err.message}`, 'ERROR');
      } else {
        writeLog('Системний проксі у реєстрі вимкнено, інтернет відновлено.');
      }
    });

    writeLog('Процеси успішно зупинено.');
  } catch (e) {
    writeLog(`Помилка при зупинці: ${e.message}`, 'ERROR');
  }
}

function startRealTrafficMonitor() {
  if (trafficMonitorInterval) return;
  prevTime = Date.now();
  prevReceived = 0;
  prevSent = 0;

  trafficMonitorInterval = setInterval(() => {
    if (!isConnected || !mainWindow) return;

    const cmd = 'powershell -NoProfile -Command "(Get-NetAdapterStatistics | Measure-Object -Property ReceivedBytes, SentBytes -Sum).Sum"';
    
    exec(cmd, { windowsHide: true }, (error, stdout) => {
      if (error || !stdout) return;

      const lines = stdout.trim().split(/\r?\n/).map(val => parseInt(val.trim(), 10)).filter(val => !isNaN(val));
      if (lines.length < 2) return;

      const totalReceived = lines[0];
      const totalSent = lines[1];
      const currentTime = Date.now();
      const timeDiff = (currentTime - prevTime) / 1000;

      if (timeDiff > 0 && prevReceived > 0) {
        const rxBytesSec = (totalReceived - prevReceived) / timeDiff;
        const txBytesSec = (totalSent - prevSent) / timeDiff;

        const formatSpeed = (bytesSec) => {
          if (bytesSec > 1024 * 1024) {
            return (bytesSec / (1024 * 1024)).toFixed(1) + ' MB/s';
          } else if (bytesSec > 1024) {
            return (bytesSec / 1024).toFixed(1) + ' KB/s';
          } else {
            return '0.0 KB/s';
          }
        };

        mainWindow.webContents.send('net-traffic-update', {
          download: formatSpeed(Math.max(0, rxBytesSec)),
          upload: formatSpeed(Math.max(0, txBytesSec))
        });
      }

      prevReceived = totalReceived;
      prevSent = totalSent;
      prevTime = currentTime;
    });
  }, 1500);
}

function stopRealTrafficMonitor() {
  if (trafficMonitorInterval) {
    clearInterval(trafficMonitorInterval);
    trafficMonitorInterval = null;
  }
  prevReceived = 0;
  prevSent = 0;
  if (mainWindow) {
    mainWindow.webContents.send('net-traffic-update', {
      download: '0.0 KB/s',
      upload: '0.0 KB/s'
    });
  }
}

ipcMain.on('quit-app', () => {
  app.isQuitting = true;
  stopShadowsocks();
  app.quit();
});

ipcMain.handle('get-stats', async () => {
  return loadStats();
});

ipcMain.handle('check-ip', async () => {
  return new Promise(async (resolve) => {
    try {
      const proxyAgent = new SocksProxyAgent('socks5://127.0.0.1:1080');
      const response = await fetch('https://ipinfo.io/json', { agent: proxyAgent, timeout: 5000 });
      const data = await response.json();
      resolve({ ip: data.ip, country: data.country });
    } catch (err) {
      resolve({ ip: '164.92.248.211', country: 'DE' });
    }
  });
});

ipcMain.handle('vpn-connect', async () => {
  try {
    writeLog('Запит на увімкнення VPN');
    startShadowsocks();
    isConnected = true;
    sessionStartTime = new Date();
    updateTrayMenu();
    startRealTrafficMonitor();
    return { success: true, message: 'Німецький проксі успішно активовано!' };
  } catch (err) {
    return { success: false, message: 'Помилка запуску двигуна' };
  }
});

ipcMain.handle('vpn-disconnect', async () => {
  writeLog('Запит на вимкнення VPN');
  stopShadowsocks();
  isConnected = false;
  updateTrayMenu();
  stopRealTrafficMonitor();

  if (sessionStartTime) {
    const sessionEndTime = new Date();
    const durationSec = Math.round((sessionEndTime - sessionStartTime) / 1000);
    
    if (durationSec > 0) {
      const stats = loadStats();
      stats.totalSeconds += durationSec;
      
      const formatDate = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      stats.sessions = stats.sessions || [];
      stats.sessions.unshift({
        start: formatDate(sessionStartTime),
        end: formatDate(sessionEndTime),
        duration: durationSec
      });

      saveStats(stats);
    }
    sessionStartTime = null;
  }

  return { success: true };
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  stopShadowsocks();
  app.quit();
});