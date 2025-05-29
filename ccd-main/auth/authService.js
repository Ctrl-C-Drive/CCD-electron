require("dotenv").config();
const crypto = require("crypto");
const CCDError = require("../CCDError");
const CloudDataModule = require("../db_models/CloudData");

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

const cloudDB = new CloudDataModule({ apiBaseURL: CLOUD_SERVER_URL });
// AES-256-CBC 복호화 함수
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

    return { success: true, JoinResult: result?.JoinResult ?? true };
  } catch (err) {
    const code = err.response?.data?.errorCode || err.code || "E632";

    const errorDetail = {
      module: "authService",
      context: "회원가입",
      details: err.message || err,
    };

    if (code === "E409") {
      errorDetail.message = "이미 존재하는 사용자입니다.";
    }

    return CCDError.create(code, errorDetail).toJSON();
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
