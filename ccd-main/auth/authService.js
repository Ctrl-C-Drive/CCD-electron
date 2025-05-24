require("dotenv").config();
const crypto = require("crypto");
const CCDError = require("./CCDError");
const CloudDataModule = require("../db_models/CloudData");

const { AES_KEY, AES_IV, CLOUD_SERVER_URL } = process.env;

if (!AES_KEY || !AES_IV || !CLOUD_SERVER_URL) {
  throw CCDError.create("E611", {
    module: "authService",
    context: "환경 변수 확인",
    message: "AES_KEY, AES_IV 또는 CLOUD_SERVER_URL이 설정되지 않았습니다.",
  });
}

const cloudDB = new CloudDataModule({ apiBaseURL: CLOUD_SERVER_URL });

//AES-256-CBC 복호화 함수
function decryptAES(encrypted) {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(AES_KEY, "hex"),
      Buffer.from(AES_IV, "hex")
    );
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    throw CCDError.create("E611", {
      module: "authService",
      context: "AES 복호화 실패",
      details: err,
    });
  }
}

/**
 * 사용자 회원가입
 * @param {string} encryptedId AES 암호화된 userId
 * @param {string} encryptedPwd AES 암호화된 password
 * @returns {Promise<{JoinResult: boolean}>}
 */
async function registerUser(encryptedId, encryptedPwd) {
  try {
    const userId = decryptAES(encryptedId);
    const password = decryptAES(encryptedPwd);

    const result = await cloudDB.signup({ user_id: userId, password });
    return { JoinResult: result?.JoinResult ?? true };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code || "E632";

    switch (code) {
      case "E409":
        throw CCDError.create("E409", {
          module: "authService",
          context: "회원가입",
          message: "이미 존재하는 사용자입니다.",
        });
      case "E611":
        throw CCDError.create("E611", {
          module: "authService",
          context: "입력값 오류",
          details: err,
        });
      default:
        throw CCDError.create(code, {
          module: "authService",
          context: "회원가입 처리 중 오류",
          details: err,
        });
    }
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
    const userId = decryptAES(encryptedId);
    const password = decryptAES(encryptedPwd);

    const result = await cloudDB.login({ user_id: userId, password });

    return {
      loginResult: true,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
    };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code || "E610";

    switch (code) {
      case "E401":
        throw CCDError.create("E401", {
          module: "authService",
          context: "로그인 인증 실패",
          message: "아이디 또는 비밀번호가 잘못되었습니다.",
        });
      case "E611":
        throw CCDError.create("E611", {
          module: "authService",
          context: "입력값 오류",
          details: err,
        });
      default:
        throw CCDError.create(code, {
          module: "authService",
          context: "로그인 처리 중 오류",
          details: err,
        });
    }
  }
}

module.exports = { registerUser, authenticate };
