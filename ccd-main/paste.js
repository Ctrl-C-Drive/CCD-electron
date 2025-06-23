// paste.js
const { clipboard, nativeImage } = require("electron");
const http = require("http");
const https = require("https");
const { Buffer } = require("buffer");
const DataRepository = require("./db_models/initModule").dataRepo; // 경로는 실제 위치에 맞게 수정
const CCDError = require("./CCDError");
const monitor = require("./clipboard/monitor");

/**
 * 이미지 URL을 읽어 클립보드에 복사
 */
function copyImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const buffer = Buffer.concat(chunks);
            const image = nativeImage.createFromBuffer(buffer);
            clipboard.writeImage(image);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

/**
 * 데이터 ID를 받아 클립보드에 복사
 */
async function pasteById(dataId) {
  try {
    const item = await DataRepository.getClipboardItem(dataId);
    if (!item) throw new Error("해당 ID의 데이터를 찾을 수 없습니다.");

    const type =
      item.type === "txt" ? "text" : item.type === "img" ? "image" : item.type;

    if (type === "text") {
      clipboard.writeText(item.content);
      monitor.skipNextCopy(item.content, "text"); // 예외 등록
    } else if (type === "image") {
      if (item.shared === "cloud" && item.content.startsWith("http")) {
        await copyImageFromUrl(item.content);
        // URL로 복사된 이미지는 해시값을 구해 예외 등록
        const image = clipboard.readImage();
        const hash = require("crypto")
          .createHash("sha256")
          .update(image.toPNG())
          .digest("hex");
        monitor.skipNextCopy(hash, "image");
      } else {
        const image = nativeImage.createFromPath(item.content);
        clipboard.writeImage(image);
        const hash = require("crypto")
          .createHash("sha256")
          .update(image.toPNG())
          .digest("hex");
        monitor.skipNextCopy(hash, "image");
      }
    } else {
      throw new Error(`지원하지 않는 타입: ${type}`);
    }
  } catch (error) {
    throw CCDError.create("E655", {
      module: "pasteById",
      context: "붙여넣기 실패",
      message: error,
    });
  }
}

module.exports = { pasteById };
