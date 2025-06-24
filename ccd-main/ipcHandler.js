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
const { join } = require("./mobilenetv3/Classes");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const https = require("https");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");


const agent = new https.Agent({
  rejectUnauthorized: false, // 인증서 검증 비활성화 (선택)
});

const dataRepo = require("./db_models/initModule").dataRepo;
let isLogin = false;
function setupIPC() {
  // 회원가입
  ipcMain.handle("user-register", async (_, { userId, password }) => {
    try {
      const result = await registerUser(userId, password);

      if (!result.success) {
        if (result.code === "E409") {
          return { joinResultMsg: "duplication" };
        }
        return { joinResultMsg: "fail", error: result.message };
      }

      return { joinResultMsg: "success" };
    } catch (err) {
      const error = CCDError.create(err.code || "E632", {
        module: "ipcHandler",
        context: "회원가입 처리",
        details: err.message,
      });
      console.error(error);
      return { joinResultMsg: "fail", error: error.message };
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
  ipcMain.handle("save-dropped-web-text", async (_, { content }) => {
    try {
      const item = {
        id: uuidv4(),
        type: "txt",
        content,
        format: "plain",
        created_at: Math.floor(Date.now() / 1000),
      };

      const savedItem = await dataRepo.addItem(item, getCloudUploadEnabled() ? "both" : "local");
      return { success: true, item: savedItem };
    } catch (err) {
      return CCDError.create("E631", {
        module: "ipcHandler",
        context: "웹 텍스트 저장",
        details: err.message,
      }).toJSON();
    }
  });
  ipcMain.handle("save-dropped-web-image", async (_, { url }) => {
    try {
      const res = await axios.get(url, {
        httpsAgent: agent,
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const contentType = res.headers["content-type"] || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`이미지가 아닙니다: ${contentType}`);
      }

      const ext = contentType.split("/")[1].split(";")[0] || "jpg";
      const id = uuidv4();
      const tempPath = path.join(app.getPath("temp"), `${id}.${ext}`);
      await fs.promises.writeFile(tempPath, res.data);

      const item = {
        id,
        type: "img",
        content: tempPath,
        format: ext,
        created_at: Math.floor(Date.now() / 1000),
      };

      const savedItem = await dataRepo.addItem(item, getCloudUploadEnabled() ? "both" : "local");
      return { success: true, item: savedItem };
    } catch (err) {
      return CCDError.create("E631", {
        module: "ipcHandler",
        context: "웹 이미지 저장",
        details: err.message || "fetch failed",
      }).toJSON();
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
    return temp;
  });

  // 로그아웃
  ipcMain.handle("user-logout", async () => {
    try {
      isLogin = false;
      await dataRepo.logoutAndCleanupCloudData();
      dataRepo.cloudDB.logout();

      return { success: true, message: "로그아웃 완료" };
    } catch (err) {
      const error = CCDError.create("E610", {
        module: "ipcHandler",
        context: "로그아웃 처리",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
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

  // 설정값 조회
  ipcMain.handle("get-settings", async () => {
    try {
      const config = dataRepo.localDB.getConfig();
      return { success: true, settings: config };
    } catch (err) {
      const error = CCDError.create("E652", {
        module: "ipcHandler",
        context: "환경설정 조회",
        details: err.message,
      });
      console.error(error);
      return error.toJSON();
    }
  });

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
