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
  // 윈도우
  closeWindow: () => ipcRenderer.send("close-window"),

  // 인증
  registerUser: (userId, password) =>
    ipcRenderer.invoke("user-register", { userId, password }),

  loginUser: (userId, password) =>
    ipcRenderer.invoke("user-login", { userId, password }),

  logoutUser: () => ipcRenderer.invoke('user-logout'),

  getLoginState: () => ipcRenderer.invoke("get-login-state"),

  // 붙여넣기
  pasteItem: (itemId) => ipcRenderer.invoke("paste-item", { itemId }),

  // 실시간 클립보드 업데이트 감지
  onClipboardUpdated: (callback) =>
    ipcRenderer.on("clipboard-updated", (_, args) => callback(args)),

  offClipboardUpdated: (callback) =>
    ipcRenderer.removeListener("clipboard-updated", callback),

  // 검색
  searchKeyword: (keyword, model) =>
    ipcRenderer.invoke("search-keyword", { keyword, model }),

  // 클립보드 기록
  loadClipboardRecords: (isLogin) =>
    ipcRenderer.invoke("load-clipboard-records", isLogin),

  // 삭제
  deleteItem: (dataId, deleteOption) =>
    ipcRenderer.invoke("delete-item", { dataId, deleteOption }),

  // 설정
  updateSettings: (settings) =>
    ipcRenderer.invoke("update-settings", settings),

  getSettings: () => ipcRenderer.invoke("get-settings"),

  // 클라우드
  uploadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("upload-selected-items", itemIds),
  downloadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("download-selected-items", itemIds),

  onCloudUploadStatusChange: (callback) =>
    ipcRenderer.on("clipboard-upload-status", (_, status) => callback(status)),

  toggleCloudUpload: () => ipcRenderer.send("toggle-cloud-upload"),

  //웹 콘텐츠 드래그앤드랍
  saveDroppedWebText: (data) =>
    ipcRenderer.invoke("save-dropped-web-text", data),

  saveDroppedWebImage: (data) =>
    ipcRenderer.invoke("save-dropped-web-image", data),
});


window.addEventListener("dragover", (e) => {
  e.preventDefault();
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
});

