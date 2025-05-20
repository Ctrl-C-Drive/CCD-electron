const { registerUser, authenticate } = require("./auth/authService"); // 경로 수정 필수
const crypto = require("crypto");

const { AES_KEY, AES_IV } = process.env;

if (!AES_KEY || !AES_IV) {
  throw new Error("AES_KEY, AES_IV 환경 변수가 필요합니다.");
}

// AES-256-CBC 암호화 함수 (테스트용)
function encryptAES(text) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(AES_KEY, "hex"),
    Buffer.from(AES_IV, "hex")
  );
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

// 테스트 유저
const testUserId = "testuser1234";
const testPassword = "testpass123";

async function test() {
  try {
    const encryptedId = encryptAES(testUserId);
    const encryptedPwd = encryptAES(testPassword);

    console.log("▶ 회원가입 테스트 중...");
    const regRes = await registerUser(encryptedId, encryptedPwd);
    console.log("✅ 회원가입 결과:", regRes);

    console.log("▶ 로그인 테스트 중...");
    const loginRes = await authenticate(encryptedId, encryptedPwd);
    console.log("✅ 로그인 결과:", loginRes);
  } catch (err) {
    console.error("❌ 테스트 실패:", err.message, err.code);
    if (err.response?.data) {
      console.error("응답 데이터:", err.response.data);
    }
  }
}

test();
