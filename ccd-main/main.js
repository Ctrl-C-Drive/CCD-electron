// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const { initClipboardModule } = require("./clipboard");
const { registerUser } = require("./auth/authService");
const { setupIPC } = require("./ipcHandler");
const { loadModel } = require("./imageTagger");
const { globalShortcut, Tray, Menu } = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = !app.isPackaged;
let win;
let tray;
let isAlwaysOnTop = false;

const createWindow = () => {
  win = new BrowserWindow({
    width: 617,
    height: 646,
    resizable: false,
    show: false,
    icon: path.join(__dirname, "icon.png"),
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
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    isAlwaysOnTop = !isAlwaysOnTop;
    win.setAlwaysOnTop(isAlwaysOnTop);
    console.log(`창 고정 상태: ${isAlwaysOnTop ? "고정됨" : "해제됨"}`);

    // 트레이 메뉴 상태 갱신
    updateTrayMenu();
  });

  tray = new Tray(path.join(__dirname, "icon.png"));
  tray.setToolTip("CCD");
  updateTrayMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.on("close-window", () => {
  BrowserWindow.getFocusedWindow()?.close();
});
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "항상 위에 고정",
      type: "checkbox",
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        isAlwaysOnTop = menuItem.checked;
        win.setAlwaysOnTop(isAlwaysOnTop);
        console.log(`창 고정 상태 (트레이): ${isAlwaysOnTop}`);
      },
    },
    { type: "separator" },
    { label: "창 열기", click: () => win.show() },
    { label: "종료", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}
