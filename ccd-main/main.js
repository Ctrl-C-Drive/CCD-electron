// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const { initClipboardModule } = require("./clipboard");
const path = require("path");

const isDev = !app.isPackaged;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 417,
    height: 646,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    const rendererPath = path.join(__dirname, "../ccd-renderer/dist/index.html");
    win.loadFile(rendererPath);
  }
};

app.whenReady().then(() => {
  initClipboardModule();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.on("close-window", () => {
  BrowserWindow.getFocusedWindow()?.close();
});
