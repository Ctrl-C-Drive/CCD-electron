const { ipcMain } = require("electron");
const dataRepo = require("./db_models/initModule").dataRepo;

/**
 * 선택한 항목 클라우드 업로드
 * itemIds: 업로드할 항목 ID 목록
 */
ipcMain.handle("upload-selected-items", async (_, itemIds) => {
  try {
    const result = await dataRepo.uploadSelectedItems(itemIds); // 내부에서 자동 판별
    return result;
  } catch (err) {
    console.error("업로드 실패:", err);
    return { uploadResult: false };
  }
});

/**
 * 선택한 항목 클라우드에서 다운로드
 * itemIds: 다운로드할 항목 ID 목록
 */
ipcMain.handle("download-selected-items", async (_, itemIds) => {
  try {
    const result = await dataRepo.downloadSelectedItems(itemIds); // 내부에서 자동 처리
    return result;
  } catch (err) {
    console.error("다운로드 실패:", err);
    return { downloadResult: false };
  }
});
