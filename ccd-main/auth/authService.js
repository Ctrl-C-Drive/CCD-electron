require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const { AES_KEY, AES_IV, CLOUD_SERVER_URL } = process.env;
if (!AES_KEY || !AES_IV) throw new Error('환경 변수 AES_KEY 또는 AES_IV가 설정되지 않았습니다.');
if (!CLOUD_SERVER_URL) throw new Error('환경 변수 CLOUD_SERVER_URL이 설정되지 않았습니다.');

// AES-256-CBC 복호화 함수
function decryptAES(encrypted) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(AES_KEY, 'hex'),
    Buffer.from(AES_IV, 'hex')
  );
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 사용자 회원가입
 * @param {string} encryptedId AES 암호화된 userId
 * @param {string} encryptedPwd AES 암호화된 password
 * @returns {Promise<{JoinResult: boolean}>}
 */
async function registerUser(encryptedId, encryptedPwd) {
  try {
    // 1) AES 복호화
    const userId = decryptAES(encryptedId);
    const password = decryptAES(encryptedPwd);
    // 2) 비밀번호 bcrypt 해싱
    const hashedPwd = await bcrypt.hash(password, 10);
    // 3) CloudServerModule 호출
    const res = await axios.post(
      `${CLOUD_SERVER_URL}/auth/signup`,
      { userId, password: hashedPwd }
    );
    return { JoinResult: res.data.JoinResult ?? res.data.joinResult ?? true };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code;
    switch (code) {
      case 'E409': err.code = 'E409'; err.message = '이미 존재하는 사용자입니다.'; break;
      case 'E611': err.code = 'E611'; break;
      default: err.code = 'E632'; err.message = '회원가입 처리 중 오류가 발생했습니다.';
    }
    throw err;
  }
}

/**
 * 사용자 로그인
 * @param {string} encryptedId AES 암호화된 userId
 * @param {string} encryptedPwd AES 암호화된 password
 * @returns {Promise<{loginResult: boolean, accessToken: string}>}
 */
async function authenticate(encryptedId, encryptedPwd) {
  try {
    // 1) AES 복호화
    const userId = decryptAES(encryptedId);
    const password = decryptAES(encryptedPwd);
    // 2) 비밀번호 bcrypt 해싱
    const res = await axios.post(`${CLOUD_SERVER_URL}/auth/login`, { userId, password });
    return { loginResult: true, accessToken: res.data.accessToken };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code;
    switch (code) {
      case 'E401': err.code = 'E401'; err.message = '인증에 실패했습니다. 아이디 또는 비밀번호를 확인하세요.'; break;
      case 'E611': err.code = 'E611'; break;
      default: err.code = 'E610'; err.message = '로그인 처리 중 오류가 발생했습니다.';
    }
    throw err;
  }
}

module.exports = { registerUser, authenticate };
