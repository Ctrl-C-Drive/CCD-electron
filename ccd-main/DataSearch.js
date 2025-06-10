const CCDError = require("./CCDError");
const dataRepo = require("./db_models/DataRepository");
const fs = require("fs");
const path = require("path");

// function transformForRenderer(item) {
//   return {
//     itemId: item.id || item.itemId,
//     type: item.type === "img" ? "image" : "text",
//     content: item.content || item.snippet || "",
//     thumbnail_path:
//       item.type === "img" && item.thumbnail_path && fs.existsSync(item.thumbnail_path)
//         ? `data:image/png;base64,${fs.readFileSync(item.thumbnail_path).toString("base64")}`
//         : undefined,
//     tags: Array.isArray(item.tags)
//       ? item.tags.map((t) => (typeof t === "string" ? t : t.name))
//       : [],
//     selected: false,
//     source: item.shared || item.source || "local",
//   };
// }

// function transformItem(item) {
//   console.log(item);
//   const isBase64 =
//     typeof item.thumbnail_path === "string" &&
//     item.thumbnail_path.startsWith("data:image/");

//   const encodedThumbnail =
//     item.thumbnail_path && !isBase64 && fs.existsSync(item.thumbnail_path)
//       ? `data:image/png;base64,${fs
//           .readFileSync(item.thumbnail_path)
//           .toString("base64")}`
//       : isBase64
//       ? item.thumbnail_path
//       : undefined;
//   return {
//     id: item.id,
//     type: item.type,
//     content: item.content,
//     format: item.format,
//     created_at: item.created_at,
//     tags: item.tags || [],
//     score: item.score || 0,
//     thumbnail_path: encodedThumbnail,
//   };
// }

async function searchData(keyword, model) {
  try {
    if (!keyword || !model) {
      const err = CCDError.create("E611", {
        module: "DataSearchModule",
        context: "검색 요청 유효성 검사",
        message: "검색어 또는 모델 정보가 없습니다.",
      });
      console.error(err);
      return err.toJSON();
    }

    let resultItems = [];

    if (model === "mobilenet") {
      resultItems = await dataRepo.searchItems(keyword, { includeCloud: true });
      // const rawResults = await dataRepo.searchItems(keyword, {
      //   includeCloud: true,
      // });
      // resultItems = rawResults.map(transformItem); // ✅ 이 경우에만 transform
    }

    if (model === "clip") {
      resultItems = await dataRepo.searchByCLIP(keyword); // 내부에서 transformItem 호출됨
    }

    return { success: true, data: resultItems };
  } catch (err) {
    const wrapped =
      err instanceof CCDError
        ? err
        : CCDError.create("E621", {
            module: "DataSearchModule",
            context: "검색 처리 중",
            details: err,
          });

    console.error("searchData 오류:", wrapped);
    return wrapped.toJSON();
  }
}

module.exports = { searchData };
