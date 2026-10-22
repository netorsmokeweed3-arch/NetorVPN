const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  connect: () => ipcRenderer.invoke('vpn-connect'),
  disconnect: () => ipcRenderer.invoke('vpn-disconnect'),
  checkIp: () => ipcRenderer.invoke('check-ip'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onToggleVpnFromTray: (callback) => ipcRenderer.on('trigger-vpn-toggle', () => callback()),
  onTrafficUpdate: (callback) => ipcRenderer.on('net-traffic-update', (event, data) => callback(data))
});