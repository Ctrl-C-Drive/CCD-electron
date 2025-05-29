const { ipcMain } = require("electron");
const { searchData } = require("./DataSearch");
const { authenticate } = require("./auth/authService");
const { registerUser } = require("./auth/authService");

const CCDError = require("./CCDError");

const dataRepo = require("./db_models/DataRepository");
function setupIPC() {
  // 회원가입
  ipcMain.handle("user-register", async (_, { userId, password }) => {
    try {
      const { JoinResult } = await registerUser(userId, password);
      const joinResultMsg = JoinResult === true ? "success" : "fail";
      return { joinResultMsg };
    } catch (err) {
      const joinResultMsg = err.code === "E409" ? "duplication" : "fail";
      console.error("회원가입 실패:", err);
      return { joinResultMsg };
    }
  });

  // 로그인
  ipcMain.handle("user-login", async (_, { userId, password }) => {
    try {
      const { loginResult, access_token, refresh_token } = await authenticate(
        userId,
        password
      );

      // 토큰 저장은 authService 내부 cloudDB 인스턴스에서 처리됨
      return {
        tokenMsg: loginResult === true,
        accessToken: !!access_token,
      };
    } catch (err) {
      console.error("로그인 실패:", err);
      return {
        tokenMsg: false,
        accessToken: false,
      };
    }
  });

  //붙여넣기
  ipcMain.handle("paste-item", async (_, { itemId }) => {
    try {
      const item = await dataRepo.localDB.getClipboardItem(itemId);
      if (!item) {
        return {
          paste: false,
          error: {
            message: "해당 item을 찾을 수 없습니다.",
          },
        };
      }

      if (item.type === "txt") {
        clipboard.writeText(item.content);
      } else if (item.type === "img") {
        const { nativeImage } = require("electron");
        const image = nativeImage.createFromPath(item.content);
        clipboard.writeImage(image);
      }

      return { paste: true };
    } catch (err) {
      console.error("붙여넣기 실패:", err);
      return { paste: false };
    }
  });

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

  //삭제
  ipcMain.handle("delete-item", async (_, { dataId, deleteOption }) => {
    try {
      await dataRepo.deleteItem(dataId, deleteOption);
      return { deletionResult: true, refreshReq: true };
    } catch (err) {
      const error = CCDError.create("E650", {
        module: "ipcHandler",
        context: "데이터 삭제",
        details: err,
      });
      console.error(error);
      return { deletionResult: false, refreshReq: false };
    }
  });

  //filter
  ipcMain.handle("filter-items", async (_, { filterType, filterValue }) => {
    try {
      const filteredItems = await dataRepo.filterItems(filterType, filterValue);
      return { success: true, data: filteredItems };
    } catch (err) {
      const error = CCDError.create("E652", {
        module: "ipcHandler",
        context: "항목 필터링",
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
