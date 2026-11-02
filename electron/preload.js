const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  openMainWindow: () => ipcRenderer.send('open-main-window'),
  triggerFloatingAlert: (alertData) => ipcRenderer.send('trigger-floating-alert', alertData),
  onAlertData: (callback) => {
    ipcRenderer.on('alert-data', (event, data) => callback(data));
  }
});
