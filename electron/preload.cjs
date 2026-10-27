const { contextBridge, ipcRenderer } = require('electron');

let fileListener = null;
const queuedFiles = [];

ipcRenderer.on('pdf:open', (_event, payload) => {
  if (fileListener) fileListener(payload);
  else queuedFiles.push(payload);
});

contextBridge.exposeInMainWorld('arcDesktop', {
  isDesktop: true,
  platform: process.platform,
  openPdf: () => ipcRenderer.invoke('dialog:open-pdf'),
  getInitialFile: () => ipcRenderer.invoke('pdf:get-initial-file'),
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  setWindowOpacity: (opacity) => ipcRenderer.invoke('window:set-opacity', opacity),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('window:set-always-on-top', enabled),
  onOpenFile: (callback) => {
    fileListener = callback;
    while (queuedFiles.length) callback(queuedFiles.shift());
    return () => {
      if (fileListener === callback) fileListener = null;
    };
  },
});
