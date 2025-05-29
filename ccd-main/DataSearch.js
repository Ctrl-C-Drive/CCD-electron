// ccd-main/modules/DataSearchModule.js
const DataRepositoryModule = require("../db_models/DataRepository");
const CCDError = require("./CCDError");
const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || "http://localhost:8000";

if (!CLOUD_SERVER_URL) {
  throw CCDError.create("E611", {
    module: "DataSearchModule",
    context: "환경 변수 확인",
    message: "CLOUD_SERVER_URL이 설정되지 않았습니다.",
  });
}

const dataRepo = new DataRepositoryModule({ apiBaseURL: CLOUD_SERVER_URL });

/**
 * 검색 요청 처리 함수
 * @param {string} keyword - 사용자 검색어
 * @param {"mobilenet" | "clip"} model - 사용할 AI 모델
 * @returns {Promise<{ sendResult: boolean, sendData: Array } | { success: false, error: object }>}
 */
async function searchData(keyword, model) {
  try {
    if (!keyword || !model) {
      const error = CCDError.create("E611", {
        module: "DataSearchModule",
        context: "검색 요청 유효성 검사",
        message: "검색어 또는 모델 정보가 없습니다.",
      });
      console.error(error);
      return error.toJSON();
    }

    let resultItems = [];

    if (model === "mobilenet") {
      const [localData, cloudData] = await Promise.all([
        dataRepo.getLocalPreview(),
        dataRepo.getCloudPreview(),
      ]);

      const allItems = dataRepo.mergeItems(localData, cloudData);

      resultItems = allItems.filter(item =>
        item.tags?.some(tag => tag.name?.includes(keyword))
      );
    }

    if (model === "clip") {
      resultItems = await dataRepo.cloudDB.searchByCLIP(keyword);
    }

    const sendData = resultItems.map(item => ({
      fileType: item.format,
      source: item.source,
      date: item.createdAt,
      imgURL: item.content,
      thumbnailURL: item.thumbnailUrl || null,
    }));

    return { sendResult: true, sendData };
  } catch (error) {
    const wrapped = error instanceof CCDError
      ? error
      : CCDError.create("E621", {
          module: "DataSearchModule",
          context: "검색 처리 중",
          details: error,
        });

    console.error("searchData 오류:", wrapped);
    return wrapped.toJSON();
  }
}

module.exports = { searchData };
