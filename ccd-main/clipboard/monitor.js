// ccd-main/clipboard/monitor.js
// 1초 단위로 클립보드를 폴링해서 변경된 내용이 있으면 콜백 호출

const { clipboard, app } = require("electron");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");
const crypto = require("crypto");

const documentsDir = app.getPath("documents");
const imageDir = path.join(documentsDir, "CCD", "clipboard_images");
fs.ensureDirSync(imageDir);

let lastData = null;
let intervalId = null;
let isProcessingImage = false;
let lastImageHash = null;
function saveImageToDisk(nativeImage, id) {
  const filePath = path.join(imageDir, `${id}.png`);
  const buffer = nativeImage.toPNG();

  fs.promises
    .writeFile(filePath, buffer)
    .then(() => console.log(`Image saved: ${filePath}`))
    .catch((err) => console.error("Image save failed:", err));
  return filePath;
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
  // 이미 실행 중이면 중복 방지
  if (intervalId) return;

  intervalId = setInterval(() => {
    try {
      // 텍스트 우선 체크
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

      // 2. 이미지 체크 (동기 처리)
      const image = clipboard.readImage();
      if (!image.isEmpty() && !isProcessingImage) {
        const currentHash = getImageHash(image);
        if (currentHash === lastImageHash) {
          // 같은 이미지이므로 무시
          return;
        }
        lastImageHash = currentHash;
        isProcessingImage = true;
        const id = uuidv4();
        const filePath = saveImageToDisk(image, id);

        // 즉시 메타데이터 전달
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

      // if (content && content !== lastData) {
      //   lastData = content;
      //   const payload = {
      //     id: uuidv4(),
      //     content,
      //     metadata: {
      //       type: contentType,
      //       timestamp: Date.now(),
      //     },
      //   };
      //   onData(payload);
      // }
    } catch (err) {
      console.error("Clipboard monitor error:", err);
    }
  }, 1000);
}

/**
 * 폴링 중지를 원할 때 호출
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { start, stop };
