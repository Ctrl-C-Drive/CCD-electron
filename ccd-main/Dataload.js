// main process
const { ipcMain } = require("electron");
const dataRepo = require("./db_models/DataRepository");

ipcMain.handle("load-clipboard-records", async (_, isLogin) => {
  try {
    console.log("dataload called ");
    // const localData = await dataRepo.getLocalPreview();
    // let cloudData = [];

    // if (isLogin) {
    //   cloudData = await dataRepo.getCloudPreview();
    // }

    // const merged = dataRepo.mergeItems(localData, cloudData);
    const merged = await dataRepo.getPreviewData();

    return { success: true, data: merged };
  } catch (err) {
    console.error("기록 보기 로딩 오류:", err);
    return { success: false, message: err.message };
  }
});
