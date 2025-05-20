// ccd-main/features/clipboard/index.js
// 메인 프로세스 클립보드 모듈 초기화 및 이벤트 처리

const { app, ipcMain, globalShortcut } = require('electron');
const monitor = require('./monitor');
const uploader = require('./uploader');
const dbmgr = require('../db_models/dbmgr');

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
  const shortcut = 'Control+Alt+K';
  if (globalShortcut.isRegistered(shortcut)) {
    console.log(`${shortcut} already registered, skipping.`);
    return;
  }
  const ok = globalShortcut.register(shortcut, () => {
    cloudUploadEnabled = !cloudUploadEnabled;
    console.log(`Cloud upload ${cloudUploadEnabled ? 'enabled' : 'disabled'}`);
    notifyRenderer();
  });
  console.log('Shortcut registered:', ok);
  if (!ok) console.error(`Failed to register shortcut: ${shortcut}`);
}



/**
 * 1초 폴링 기반 클립보드 모니터링 시작
 */
function startMonitoring() {
  monitor.start(async (payload) => {
    try {
      // 1) 로컬 DB 저장: addClipboard 사용
      const type = payload.metadata.type === 'text' ? 'txt' : 'img';
      const format = payload.metadata.type === 'text' ? 'text/plain' : 'image/png';
      const newId = dbmgr.addClipboard(type, format, payload.content);

      // 2) payload ID 갱신
      payload.id = newId;

      // 3) 클라우드 업로드 (옵션 ON)
      if (cloudUploadEnabled) {
        await uploader.upload([payload]);
      }
    } catch (err) {
      console.error('Clipboard handling error:', err);
    }
  });
}

/**
 * 렌더러에 현재 클라우드 업로드 상태 전송
 */
function notifyRenderer() {
  ipcMain.emit('clipboard-upload-status', cloudUploadEnabled);
}


module.exports = { initClipboardModule };
