// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const { initClipboardModule } = require("./clipboard");
const { registerUser } = require("./auth/authService");
const { setupIPC } = require("./ipcHandler");
const { loadModel } = require("./imageTagger");
const { globalShortcut, Tray, Menu } = require("electron");

const path = require("path");

const isDev = !app.isPackaged;
let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 617,
    height: 646,
    resizable: false,
    show: false,
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
    const rendererPath = path.join(
      __dirname,
      "../ccd-renderer/dist/index.html"
    );
    win.loadFile(rendererPath);
  }

  win.on("close", (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
};

setupIPC();

app.whenReady().then(async () => {
  try {
    await loadModel();
  } catch (err) {
    console.error("모델 로딩 실패:", err);
  }

  initClipboardModule();
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+C", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.on("close-window", () => {
  BrowserWindow.getFocusedWindow()?.close();
});
