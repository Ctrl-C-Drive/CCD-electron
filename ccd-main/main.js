const { app, BrowserWindow } = require('electron');
const { initClipboardModule } = require('./clipboard');
const path = require('path');

const isDev = !app.isPackaged; // 개발 모드인지 확인

const createWindow = () => {
  const win = new BrowserWindow({
    width: 417,
    height: 646,
    resizable: false,
    autoHideMenuBar: true,
  })

// //   win.loadFile('index.html')
//   const rendererPath = path.join(__dirname, '../ccd-renderer/dist/index.html');
//     console.log("이것은 renderPAth", rendererPath)
//     win.loadFile(rendererPath);
// }

if(isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  }
  else {
    const rendererPath = path.join(__dirname, '../ccd-renderer/dist/index.html');
    win.loadFile(rendererPath);
  }
};

app.whenReady().then(() => {
  initClipboardModule();
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})