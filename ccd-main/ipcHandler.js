const { ipcMain } = require("electron");
const { searchData } = require("./DataSearch");
const { authenticate } = require("./auth/authService");
const { registerUser } = require("./auth/authService");
const notifyRenderer = require("./notifyRenderer");
const {
  getCloudUploadEnabled,
  setCloudUploadEnabled,
} = require("./cloudUploadState");
const { pasteById } = require("./paste");
const CCDError = require("./CCDError");

const dataRepo = require("./db_models/DataRepository");
let isLogin = false;
function setupIPC() {
  // 회원가입
  ipcMain.handle("user-register", async (_, { userId, password }) => {
    try {
      const { JoinResult } = await registerUser(userId, password);
      return { joinResultMsg: JoinResult ? "success" : "fail" };
    } catch (err) {
      const error = CCDError.create(err.code || "E632", {
        module: "ipcHandler",
        context: "회원가입 처리",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  // 로그인
  ipcMain.handle("user-login", async (_, { userId, password }) => {
    try {
      const { loginResult, access_token, refresh_token } = await authenticate(
        userId,
        password
      );
      if (loginResult && access_token) isLogin = true;

      // 토큰 저장은 authService 내부 cloudDB 인스턴스에서 처리됨
      return {
        tokenMsg: loginResult === true,
        accessToken: !!access_token,
      };
    } catch (err) {
      const error = CCDError.create(err.code || "E610", {
        module: "ipcHandler",
        context: "로그인 처리",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  ipcMain.handle("get-login-state", () => isLogin);

  // 드래그앤드랍으로 들어온 파일 처리
  ipcMain.handle("add-dropped-file", async (_, { filePath }) => {
    try {
      const ext = path.extname(filePath).replace(".", "").toLowerCase();
      const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
      const textExtensions = ["txt", "md", "csv", "log"];

      let item;

      if (imageExtensions.includes(ext)) {
        item = {
          type: "img",
          content: filePath,
          format: ext,
        };
      } else if (textExtensions.includes(ext)) {
        const text = await fs.promises.readFile(filePath, "utf-8");
        item = {
          type: "txt",
          content: text,
          format: ext,
        };
      } else {
        throw CCDError.create("E643", {
          module: "ipcHandler",
          context: "드래그 파일 확장자 검사",
          message: `지원되지 않는 파일 형식입니다. (${ext})`,
        });
      }

      await dataRepo.addItem(item, "local");
      return { success: true, message: "파일이 추가되었습니다." };
    } catch (err) {
      const error =
        err instanceof CCDError
          ? err
          : CCDError.create("E631", {
              module: "ipcHandler",
              context: "드래그 파일 처리",
              details: err.message,
            });
      console.error(error);
      return error.toJSON();
    }
  });

  // 붙여넣기
  // ipcMain.handle("paste-item", async (_, { itemId }) => {
  //   try {
  //     const item = await dataRepo.localDB.getClipboardItem(itemId);
  //     if (!item) {
  //       throw CCDError.create("E655", {
  //         module: "ipcHandler",
  //         context: "붙여넣기",
  //         message: "해당 item을 찾을 수 없습니다.",
  //       });
  //     }

  //     if (item.type === "txt") {
  //       clipboard.writeText(item.content);
  //     } else if (item.type === "img") {
  //       const { nativeImage } = require("electron");
  //       const image = nativeImage.createFromPath(item.content);
  //       clipboard.writeImage(image);
  //     }

  //     return { paste: true };
  //   } catch (err) {
  //     const error =
  //       err instanceof CCDError
  //         ? err
  //         : CCDError.create("E630", {
  //           module: "ipcHandler",
  //           context: "붙여넣기",
  //           details: err.message,
  //         });
  //     console.error(error);
  //     return error.toJSON();
  //   }
  // });
  ipcMain.handle("paste-item", async (_, { itemId }) => {
    try {
      await pasteById(itemId); // ← 핵심 연결
      return { paste: true };
    } catch (err) {
      const error =
        err instanceof CCDError
          ? err
          : CCDError.create("E630", {
              module: "ipcHandler",
              context: "붙여넣기",
              details: err.message,
            });
      console.error(error);
      return error.toJSON();
    }
  });

  // 검색어 전송
  ipcMain.handle("search-keyword", async (_, { keyword, model }) => {
    let temp = await searchData(keyword, model); // 내부에서 CCDError 처리
    console.log(temp);
    return temp;
  });

  // 기록 보기
  ipcMain.handle("load-clipboard-records", async (_, isLogin) => {
    try {
      const merged = await dataRepo.getPreviewData();
      return { success: true, data: merged };
    } catch (err) {
      const error = CCDError.create("E655", {
        module: "ipcHandler",
        context: "기록 보기 로딩",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  ipcMain.handle(
    "update-settings",
    async (_, { localLimit, cloudLimit, retentionDays }) => {
      console.log(" 받은 원본 값:", { localLimit, cloudLimit, retentionDays });
      const toInt = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null; // '' · undefined · NaN → null
      };

      const parsedLocal = toInt(localLimit);
      const parsedCloud = toInt(cloudLimit);
      const parsedDays = toInt(retentionDays);

      console.log(" 파싱된 값:", {
        parsedLocal,
        parsedCloud,
        parsedDays,
      });
      // 필수값(로컬 제한·보관기간) 둘 다 빠졌으면 오류
      if (parsedLocal === null && parsedDays === null) {
        throw CCDError.create("E611", {
          module: "ipcHandler",
          context: "update-settings",
          message: "숫자값이 필요합니다.",
        });
      }

      await dataRepo.updateConfig({
        local_limit: parsedLocal,
        day_limit: parsedDays,
      });
      await dataRepo.updateMaxCountCloud(parsedCloud);
      return { success: true };
    }
  );

  // 삭제
  ipcMain.handle("delete-item", async (_, { dataId, deleteOption }) => {
    try {
      await dataRepo.deleteItem(dataId, deleteOption);
      return { deletionResult: true, refreshReq: true };
    } catch (err) {
      const error = CCDError.create("E650", {
        module: "ipcHandler",
        context: "데이터 삭제",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  //

  // 클라우드 업로드
  ipcMain.handle("upload-selected-items", async (_, itemIds) => {
    try {
      const result = await dataRepo.uploadSelectedItems(itemIds);
      return result;
    } catch (err) {
      const error = CCDError.create("E653", {
        module: "ipcHandler",
        context: "선택 항목 업로드",
        details: err.message,
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
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

  ipcMain.on("toggle-cloud-upload", () => {
    const newState = !getCloudUploadEnabled();
    setCloudUploadEnabled(newState);
    console.log(`Cloud upload ${newState ? "enabled" : "disabled"}`);
    notifyRenderer("clipboard-upload-status", newState);
  });
}

module.exports = { setupIPC };
