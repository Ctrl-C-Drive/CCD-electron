// ccd-main/features/clipboard/index.js
// 메인 프로세스 클립보드 모듈 초기화 및 이벤트 처리
require("dotenv").config();
const { app, ipcMain, globalShortcut } = require("electron");
const monitor = require("./monitor");
const uploader = require("./uploader");
const DataRepositoryModule = require("../db_models/DataRepository");
const { CLOUD_SERVER_URL } = process.env;
if (!CLOUD_SERVER_URL)
  throw new Error("환경 변수 CLOUD_SERVER_URL이 설정되지 않았습니다.");
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
  const shortcut = "Control+Alt+K";
  if (globalShortcut.isRegistered(shortcut)) {
    console.log(`${shortcut} already registered, skipping.`);
    return;
  }
  const ok = globalShortcut.register(shortcut, () => {
    cloudUploadEnabled = !cloudUploadEnabled;
    console.log(`Cloud upload ${cloudUploadEnabled ? "enabled" : "disabled"}`);
    notifyRenderer();
  });
  console.log("Shortcut registered:", ok);
  if (!ok) console.error(`Failed to register shortcut: ${shortcut}`);
}

/**
 * 1초 폴링 기반 클립보드 모니터링 시작
 */
function addClipboard(id, type, format, content, timestamp) {
  // 1) 아이템 데이터 생성
  const itemData = {
    id: id,
    type: type === "text" ? "txt" : "img",
    format,
    content,
    created_at: timestamp,
    // 이미지 메타데이터 초기화
    ...(type === "img" && {
      imageMeta: {
        file_path: content,
      },
    }),
  };
  console.log("addClipboard called with content:", content);

  // 2) DataRepository에 추가
  return dbmgr.addItem(itemData, cloudUploadEnabled ? "both" : "local");
}

// 모니터링 콜백 수정
function startMonitoring() {
  monitor.start(async (payload) => {
    try {
      // 1) 타입 & 포맷 설정
      const type = payload.metadata.type;
      const format = type === "text" ? "text/plain" : "image/png";
      const timestamp = payload.metadata.timestamp;

      // 2) DataRepository에 추가
      const newItem = await addClipboard(
        payload.id,
        type,
        format,
        payload.content,
        timestamp
      );

      // 3) 클라우드 업로드 (옵션에 따라 자동 처리됨)
      payload.id = newItem.id;
    } catch (err) {
      console.error("Clipboard handling error:", err);
    }
  });
}
/**
 * 렌더러에 현재 클라우드 업로드 상태 전송
 */
function notifyRenderer() {
  ipcMain.emit("clipboard-upload-status", cloudUploadEnabled);
}

module.exports = { initClipboardModule };
