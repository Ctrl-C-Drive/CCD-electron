// ccd-main/features/clipboard/index.js
// 메인 프로세스 클립보드 모듈 초기화 및 이벤트 처리
require("dotenv").config();

const { app, ipcMain, globalShortcut, BrowserWindow } = require("electron");
const monitor = require("./monitor");
const CCDError = require("../CCDError");
const notifyRenderer = require("../notifyRenderer");
const dbmgr = require("../db_models/DataRepository");

const {
  getCloudUploadEnabled,
  toggleCloudUploadEnabled,
} = require("../cloudUploadState");

/**
 * 클립보드 기능 모듈 초기화
 */
function initClipboardModule() {
  setupToggleShortcut();
  startMonitoring();
  notifyRenderer("clipboard-upload-status", getCloudUploadEnabled());
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
    toggleCloudUploadEnabled();
    console.log(`Cloud upload ${getCloudUploadEnabled() ? "enabled" : "disabled"}`);
    notifyRenderer("clipboard-upload-status", getCloudUploadEnabled());
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
    return dbmgr.addItem(itemData, getCloudUploadEnabled() ? "both" : "local");
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

      // 🟡 중요: 렌더러에 "새 클립보드 항목이 추가됨"을 알림
      notifyRenderer("clipboard-updated", {
        id: newItem?.id ?? payload.id,
      });

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

module.exports = { initClipboardModule };
