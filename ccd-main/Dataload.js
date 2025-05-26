// main process
const { ipcMain } = require("electron");
const DataRepositoryModule = require("./db_models/DataRepository");
const { CLOUD_SERVER_URL } = process.env;

const dataRepo = new DataRepositoryModule({ apiBaseURL: CLOUD_SERVER_URL });

ipcMain.handle("load-clipboard-records", async (_, isLogin) => {
  try {
    const localData = await dataRepo.getLocalPreview();
    let cloudData = [];

    if (isLogin) {
      cloudData = await dataRepo.getCloudPreview();
    }

    const merged = dataRepo.mergeItems(localData, cloudData);
    return { success: true, data: merged };
  } catch (err) {
    console.error("기록 보기 로딩 오류:", err);
    return { success: false, message: err.message };
  }
});
