// ccd-main/clipboard/monitor.js
// 1초 단위로 클립보드를 폴링해서 변경된 내용이 있으면 콜백 호출

const { clipboard } = require('electron');
const { v4: uuidv4 } = require('uuid');

let lastData = null;
let intervalId = null;

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
        contentType = 'text';
        content = text;
      } else {
        // 텍스트가 없거나 변경 없으면 이미지 체크
        const image = clipboard.readImage();
        // PNG 포맷으로 인코딩
        const pngBase64 = image.toPNG().toString('base64');
        if (pngBase64 && pngBase64 !== lastData) {
          contentType = 'image';
          content = pngBase64;
        }
      }

      if (content && content !== lastData) {
        lastData = content;
        const payload = {
          id: uuidv4(),
          content,
          metadata: {
            type: contentType,
            timestamp: Date.now(),
          },
        };
        onData(payload);
      }
    } catch (err) {
      console.error('Clipboard monitor error:', err);
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
