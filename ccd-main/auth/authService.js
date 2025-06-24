// require("dotenv").config();
const crypto = require("crypto");
const CCDError = require("../CCDError");

const cloudDB = require("../db_models/initModule").cloudData;

const { AES_KEY, AES_IV, CLOUD_SERVER_URL } = process.env;

if (!AES_KEY || !AES_IV || !CLOUD_SERVER_URL) {
  const err = CCDError.create("E611", {
    module: "authService",
    context: "환경 변수 확인",
    message: "AES_KEY, AES_IV 또는 CLOUD_SERVER_URL이 설정되지 않았습니다.",
  });
  module.exports = {
    registerUser: async () => err.toJSON(),
    authenticate: async () => err.toJSON(),
  };
  return;
}

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
    return { success: true, data: decrypted };
  } catch (err) {
    return CCDError.create("E611", {
      module: "authService",
      context: "AES 복호화 실패",
      details: err.message,
    }).toJSON();
  }
}

/**
 * 사용자 회원가입
 */
async function registerUser(encryptedId, encryptedPwd) {
  const idResult = decryptAES(encryptedId);
  const pwResult = decryptAES(encryptedPwd);

  if (!idResult.success) return idResult;
  if (!pwResult.success) return pwResult;

  try {
    const result = await cloudDB.signup({
      user_id: idResult.data,
      password: pwResult.data,
    });

    // signup 성공 여부 검사
    if (!result.success) {
      const reason = result.reason || "";
      const code = reason === "duplicate" ? "E409" : "E632";

      return {
        success: false,
        code,
        reason,
        message: result.message,
      };
    }
    return { success: true, JoinResult: true };
    
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code || "E632";

    return CCDError.create(code, {
      module: "authService",
      context: "회원가입",
      details: err.message || err,
    }).toJSON();
  }
}

/**
 * 사용자 로그인
 */
async function authenticate(encryptedId, encryptedPwd) {
  const idResult = decryptAES(encryptedId);
  const pwResult = decryptAES(encryptedPwd);

  if (!idResult.success) return idResult;
  if (!pwResult.success) return pwResult;

  try {
    const result = await cloudDB.login({
      user_id: idResult.data,
      password: pwResult.data,
    });

    return {
      success: true,
      loginResult: true,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
    };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code || "E610";

    const errorDetail = {
      module: "authService",
      context: "로그인",
      details: err.message || err,
    };

    if (code === "E401") {
      errorDetail.message = "아이디 또는 비밀번호가 잘못되었습니다.";
    }

    return CCDError.create(code, errorDetail).toJSON();
  }
}

module.exports = { registerUser, authenticate };
