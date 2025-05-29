// ccd-main/features/clipboard/index.js
// 메인 프로세스 클립보드 모듈 초기화 및 이벤트 처리
require("dotenv").config();

const { app, ipcMain, globalShortcut, BrowserWindow } = require("electron");
const monitor = require("./monitor");
const DataRepositoryModule = require("../db_models/DataRepository");
const CCDError = require("../CCDError");

const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || "http://localhost:8000";

if (!CLOUD_SERVER_URL) {
  throw CCDError.create("E611", {
    module: "index",
    context: "환경 변수 확인",
    message: "CLOUD_SERVER_URL이 설정되지 않았습니다!",
  });
}

const dbmgr = new DataRepositoryModule({
  apiBaseURL: CLOUD_SERVER_URL,
});

let cloudUploadEnabled = false;

/**
 * 클립보드 기능 모듈 초기화
 */
function initClipboardModule() {
  setupToggleShortcut();
  startMonitoring();
  notifyRenderer();
}

/**
 * 단축키(Control+Alt+U) 등록하여 클라우드 업로드 토글
 */
function setupToggleShortcut() {
  const shortcut = "Control+Alt+U";
  if (globalShortcut.isRegistered(shortcut)) {
    console.log(`${shortcut} already registered, skipping.`);
    return;
  }
  const ok = globalShortcut.register(shortcut, () => {
    cloudUploadEnabled = !cloudUploadEnabled;
    console.log(`Cloud upload ${cloudUploadEnabled ? "enabled" : "disabled"}`);
    notifyRenderer();
  });
  if (!ok) {
    const error = CCDError.create("E611", {
      module: "index",
      context: "단축키 등록 실패",
      message: `단축키 등록에 실패했습니다: ${shortcut}`,
    });
    console.error(error);
    return error.toJSON();
  }
}

/**
 * 1초 폴링 기반 클립보드 모니터링 시작
 */
function addClipboard(id, type, format, content, timestamp) {
  const itemData = {
    id: id,
    type: type === "text" ? "txt" : "img",
    format,
    content,
    created_at: timestamp,
    ...(type === "img" && {
      imageMeta: { file_path: content },
    }),
  };

  try {
    return dbmgr.addItem(itemData, cloudUploadEnabled ? "both" : "local");
  } catch (err) {
    const error = CCDError.create("E631", {
      module: "index",
      context: "클립보드 아이템 추가 실패",
      details: err,
    });
    console.error(error);
    return error.toJSON();
  }
}

function startMonitoring() {
  monitor.start(async (payload) => {
    try {
      const type = payload.metadata.type;
      const format = type === "text" ? "text/plain" : "image/png";
      const timestamp = payload.metadata.timestamp;

      const newItem = await addClipboard(
        payload.id,
        type,
        format,
        payload.content,
        timestamp
      );

      payload.id = newItem?.id;
    } catch (err) {
      const error = CCDError.create("E630", {
        module: "index",
        context: "클립보드 감지/저장 실패",
        details: err,
      });
      console.error(error);
      return error.toJSON();
    }
  });
}

/**
 * 렌더러에 현재 클라우드 업로드 상태 전송
 */
function notifyRenderer() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && win.webContents) {
    win.webContents.send("clipboard-upload-status", cloudUploadEnabled);
  }
}

module.exports = { initClipboardModule };
