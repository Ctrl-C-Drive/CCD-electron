const { BrowserWindow } = require("electron");

function notifyRenderer(channel, data) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && win.webContents) {
    win.webContents.send(channel, data);
  }
}

module.exports = notifyRenderer;
