const { ipcMain } = require("electron");
const { searchData } = require("./DataSearchModule");
const DataRepositoryModule = require("./db_models/DataRepository");
const CCDError = require("./CCDError");

const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || "http://localhost:8000";
if (!CLOUD_SERVER_URL) {
  throw CCDError.create("E611", {
    module: "ipcHandler",
    context: "환경 변수 확인",
    message: "CLOUD_SERVER_URL이 설정되지 않았습니다!",
  });
}

const dataRepo = new DataRepositoryModule({ apiBaseURL: CLOUD_SERVER_URL });

function setupIPC() {
  // 검색어 전송
  ipcMain.handle("search-keyword", async (_, { keyword, model }) => {
    return await searchData(keyword, model); // 내부에서 CCDError 처리
  });

  // 기록 보기
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
      const error = CCDError.create("E655", {
        module: "ipcHandler",
        context: "기록 보기 로딩",
        details: err,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  // 클라우드 업로드
  ipcMain.handle("upload-selected-items", async (_, itemIds) => {
    try {
      const result = await dataRepo.uploadSelectedItems(itemIds);
      return result;
    } catch (err) {
      const error = CCDError.create("E653", {
        module: "ipcHandler",
        context: "선택 항목 업로드",
        details: err,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  // 클라우드 다운로드
  ipcMain.handle("download-selected-items", async (_, itemIds) => {
    try {
      const result = await dataRepo.downloadSelectedItems(itemIds);
      return result;
    } catch (err) {
      const error = CCDError.create("E653", {
        module: "ipcHandler",
        context: "선택 항목 다운로드",
        details: err,
      });
      console.error(error);
      return error.toJSON();
    }
  });
}

module.exports = { setupIPC };
