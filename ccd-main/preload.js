window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload loaded.');
});

// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
});
