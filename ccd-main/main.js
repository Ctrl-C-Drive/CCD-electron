// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const { initClipboardModule } = require("./clipboard");
const { registerUser } = require("./auth/authService");
const { setupIPC } = require("./ipcHandler");
const { loadModel } = require("./imageTagger");
const { globalShortcut, Tray, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
// const chokidar = require("chokidar"); 


const isDev = !app.isPackaged;

// const dotenvPath = isDev
//   ? path.join(__dirname, "..", ".env")
//   : path.join(process.resourcesPath, "app.asar.unpacked", ".env");

// require("dotenv").config({ path: dotenvPath });

// chokidar.watch(dotenvPath).on("change", () => {
//   console.log(".env changed – reloading");
//   require("dotenv").config({ path: dotenvPath, override: true });
//   // 필요하면 렌더러에 IPC로 새 값 알리기
//   // win && win.webContents.send("env-updated");
// });

let win;
let tray;
let isAlwaysOnTop = false;

const createWindow = () => {
  win = new BrowserWindow({
    width: 417,
    height: 646,
    frame: false, 
    titleBarStyle: 'hidden', 
    resizable: false,
    show: true,
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
