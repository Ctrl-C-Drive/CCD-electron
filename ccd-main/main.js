const { app, BrowserWindow } = require('electron')
const path = require('path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

//   win.loadFile('index.html')
  const rendererPath = path.join(__dirname, '../ccd-renderer/dist/index.html');
    console.log("이것은 renderPAth", rendererPath)
    win.loadFile(rendererPath);
}

app.whenReady().then(() => {
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