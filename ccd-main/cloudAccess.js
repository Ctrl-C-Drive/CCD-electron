const { ipcMain } = require("electron");
const DataRepositoryModule = require("./db_models/DataRepository");

const { CLOUD_SERVER_URL } = process.env.CLOUD_SERVER_URL || "http://localhost:8000"; // 기본값 설정
if (!CLOUD_SERVER_URL) throw new Error("환경 변수 CLOUD_SERVER_URL이 설정되지 않았습니다.");

const dataRepo = new DataRepositoryModule({ apiBaseURL: CLOUD_SERVER_URL });

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
