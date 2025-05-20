// ccd-main/clipboard/uploader.js
// 클라우드 업로드를 담당하는 모듈

// TODO: 실제 클라우드 업로드 로직을 구현하거나, API 서비스를 연결하세요.
// 여기서는 예시로 cloudUpload 함수를 외부 서비스에서 임포트한다고 가정합니다.

let cloudUpload;
try {
  // 실제 서비스 모듈 경로에 맞춰 수정하세요
  cloudUpload = require('../cloudUploadService').cloudUpload;
} catch (e) {
  console.warn('cloudUploadService 모듈을 찾을 수 없습니다. 클라우드 업로드 기능이 동작하지 않을 수 있습니다.');
  cloudUpload = async () => { throw new Error('cloudUploadService 모듈 없음'); };
}

/**
 * payload 배열을 받아 클라우드에 업로드합니다.
 * @param {Array<{id: string, content: string, metadata: object}>} payloads
 * @returns {Promise<boolean>} 업로드 성공 여부
 */
async function upload(payloads) {
  try {
    const result = await cloudUpload(payloads);
    console.log(`Uploaded ${payloads.length} items successfully.`);
    return result;
  } catch (err) {
    console.error('Cloud upload failed:', err);
    throw err;
  }
}

module.exports = { upload };
