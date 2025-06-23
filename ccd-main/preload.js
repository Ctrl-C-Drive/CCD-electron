window.addEventListener("DOMContentLoaded", () => {
  console.log("Preload loaded.");
});

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
  // 회원가입
  registerUser: (userId, password) =>
    ipcRenderer.invoke("user-register", { userId, password }),

  // 로그인
  loginUser: (userId, password) =>
    ipcRenderer.invoke("user-login", { userId, password }),
 logoutUser: () => ipcRenderer.invoke('user-logout'),
  //로그인 상태 불러오기
  getLoginState: () => ipcRenderer.invoke("get-login-state"),

  // 드래그앤 드랍 복사
  addDroppedFile: (filePath) =>
    ipcRenderer.invoke("add-dropped-file", { filePath }),

  // 붙여넣기
  pasteItem: (itemId) => ipcRenderer.invoke("paste-item", { itemId }),
  //클립보드의 실시간 업데이트되는 데이터
  onClipboardUpdated: (callback) =>
    ipcRenderer.on("clipboard-updated", (_, args) => callback(args)),

  offClipboardUpdated: (callback) =>
    ipcRenderer.removeListener("clipboard-updated", callback),
  // 검색
  searchKeyword: (keyword, model) =>
    ipcRenderer.invoke("search-keyword", { keyword, model }),

  // 기록 보기
  loadClipboardRecords: (isLogin) =>
    ipcRenderer.invoke("load-clipboard-records", isLogin),

  // 삭제
  deleteItem: (dataId, deleteOption) =>
    ipcRenderer.invoke("delete-item", { dataId, deleteOption }),

  // 환경설정 저장
  updateSettings: (settings) =>
    ipcRenderer.invoke("update-settings", settings),

  // 클라우드 업로드
  uploadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("upload-selected-items", itemIds),

  // 클라우드 다운로드
  downloadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("download-selected-items", itemIds),

  // 클라우드 업로드 상태 수신 (예: 단축키 토글 등)
  onCloudUploadStatusChange: (callback) =>
    ipcRenderer.on("clipboard-upload-status", (_, status) => callback(status)),

  toggleCloudUpload: () => ipcRenderer.send("toggle-cloud-upload"),
});

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
});

