require('dotenv').config();
const crypto = require('crypto');
const { registerUser } = require('./auth/authService'); // 예: cloud-auth.js

const AES_KEY = Buffer.from(process.env.AES_KEY, 'hex');
const AES_IV = Buffer.from(process.env.AES_IV, 'hex');

function encryptAES(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

(async () => {
  const userId = 'testuser123';
  const password = 'testpassword123';

  const encryptedId = encryptAES(userId);
  const encryptedPwd = encryptAES(password);


  try {
    console.log(encryptedId)
    const result = await registerUser(encryptedId, encryptedPwd);
    console.log('✅ 로그인 성공:', result);
  } catch (err) {
    console.error('❌ 로그인 실패:', err.code, err.message);
  }
})();
