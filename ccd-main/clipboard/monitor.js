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
      const text = clipboard.readText();
      let contentType, content;
      if (text && text !== lastData) {
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
        if (currentHash === lastImageHash) return;

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

module.exports = { start, stop };
