// main process
const { ipcMain } = require("electron");
const dataRepo = require("./db_models/DataRepository");

ipcMain.handle("load-clipboard-records", async (_, isLogin) => {
  try {
    const merged = dataRepo.getPreviewData();
    return { success: true, data: merged };
  } catch (err) {
    console.error("기록 보기 로딩 오류:", err);
    return { success: false, message: err.message };
  }
});
