window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload loaded.');
});

// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeWindow: () => ipcRenderer.send("close-window"),
  // 회원가입
  registerUser: (userId, password) =>
    ipcRenderer.invoke("user-register", { userId, password }),

  // 로그인
  loginUser: (userId, password) =>
    ipcRenderer.invoke("user-login", { userId, password }),

  // 붙여넣기
  pasteItem: (itemId) =>
    ipcRenderer.invoke("paste-item", { itemId }),

  // 검색
  searchKeyword: (keyword, model) =>
    ipcRenderer.invoke("search-keyword", { keyword, model }),

  // 기록 보기
  loadClipboardRecords: (isLogin) =>
    ipcRenderer.invoke("load-clipboard-records", isLogin),

  // 삭제
  deleteItem: (dataId, deleteOption) =>
    ipcRenderer.invoke("delete-item", { dataId, deleteOption }),

  // 필터링
  filterItems: (filterType, filterValue) =>
    ipcRenderer.invoke("filter-items", { filterType, filterValue }),

  // 클라우드 업로드
  uploadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("upload-selected-items", itemIds),

  // 클라우드 다운로드
  downloadSelectedItems: (itemIds) =>
    ipcRenderer.invoke("download-selected-items", itemIds),

  // 클라우드 업로드 상태 수신 (예: 단축키 토글 등)
  onCloudUploadStatusChange: (callback) =>
    ipcRenderer.on("clipboard-upload-status", (_, status) => callback(status)),
});
