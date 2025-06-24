const { clipboard, app } = require("electron");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const CCDError = require("../CCDError");

const documentsDir = app.getPath("documents");
const imageDir = path.join(documentsDir, "CCD", "original");
fs.ensureDirSync(imageDir);

let lastData = null;
let intervalId = null;
let isProcessingImage = false;
let lastImageHash = null;

let skipCopyContent = new Set();
let skipContentType = null;
let skipTimestamp = 0;
let recentImageHashes = new Set();
let recentImageTimestamps = new Map();


function saveImageToDisk(nativeImage, id) {
  try {
    const filePath = path.join(imageDir, `${id}.png`);
    const buffer = nativeImage.toPNG();
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (err) {
    const error = CCDError.create("E670", {
      module: "monitor",
      context: "이미지 저장",
      message: "클립보드 이미지를 디스크에 저장하지 못했습니다.",
      details: err,
    });
    console.error(error);
    return error.toJSON();
  }
}

function getImageHash(nativeImage) {
  const buffer = nativeImage.toPNG();
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * 폴링을 시작합니다.
 * @param {(payload: {id: string, content: string, metadata: object}) => void} onData
 */
function start(onData) {
  if (intervalId) return;

  intervalId = setInterval(() => {
    try {
      const now = Date.now();
      const text = clipboard.readText();
      let contentType, content;
      if (text && text !== lastData) {
        if (
          skipContentType === "text" &&
          skipCopyContent.has(text) &&
          now - skipTimestamp < 3000
        ) {
          // 복사 예외 처리: 기록에 반영하지 않음
          lastData = text;
          return;
        }
        contentType = "text";
        content = text;
        lastData = content;

        const payload = {
          id: uuidv4(),
          content,
          metadata: {
            type: contentType,
            timestamp: Math.floor(Date.now() / 1000),
          },
        };
        onData(payload);
        return;
      }

      const image = clipboard.readImage();
      if (!image.isEmpty() && !isProcessingImage) {
        const currentHash = getImageHash(image);
        const now = Date.now();
        if (
          recentImageHashes.has(currentHash) &&
          now - (recentImageTimestamps.get(currentHash) || 0) < 3000
        ) {
          lastImageHash = currentHash;
          return;
        }

        // 등록: 중복 감지를 방지하기 위해 해시값을 임시 기억
        recentImageHashes.add(currentHash);
        recentImageTimestamps.set(currentHash, now);

        // 일정 시간 후 제거
        setTimeout(() => {
          recentImageHashes.delete(currentHash);
          recentImageTimestamps.delete(currentHash);
        }, 5000);
        if (currentHash === lastImageHash) return;
        if (
          skipContentType === "image" &&
          skipCopyContent.has(currentHash) &&
          now - skipTimestamp < 3000
        ) {
          // 복사 예외 처리: 기록에 반영하지 않음
          lastImageHash = currentHash;
          return;
        }

        lastImageHash = currentHash;
        isProcessingImage = true;

        const id = uuidv4();
        const filePath = saveImageToDisk(image, id);

        const payload = {
          id,
          content: filePath,
          metadata: {
            type: "image",
            timestamp: Math.floor(Date.now() / 1000),
          },
        };

        lastData = filePath;
        onData(payload);
        isProcessingImage = false;
      }
    } catch (err) {
      const error = CCDError.create("E670", {
        module: "monitor",
        context: "클립보드 감시 처리",
        details: err,
      });
      console.error(error);
      return error.toJSON();
    }
  }, 1000);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function skipNextCopy(content, type) {
  skipCopyContent.add(content);
  skipContentType = type;
  skipTimestamp = Date.now();
  setTimeout(() => {
    skipCopyContent.delete(content);
  }, 3000); // 3초간만 예외 처리
}

module.exports = { start, stop, skipNextCopy };
