const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") }); // ✅ 수정

const crypto = require("crypto");
const fs = require("fs");
const CloudDataModule = require("../db_models/initModule").cloudData;

if (!process.env.AES_KEY || !process.env.AES_IV) {
  console.error(
    "❌ .env 파일에서 AES_KEY 또는 AES_IV가 불러와지지 않았습니다."
  );
  process.exit(1);
}

const AES_KEY = Buffer.from(process.env.AES_KEY, "hex");
const AES_IV = Buffer.from(process.env.AES_IV, "hex");
const API_URL = process.env.CLOUD_SERVER_URL || "http://localhost:8000";

function encryptAES(text) {
  const cipher = crypto.createCipheriv("aes-256-cbc", AES_KEY, AES_IV);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

async function testUploadImage() {
  const encryptedId = encryptAES("testuser1");
  const encryptedPwd = encryptAES("testpass1");

  // 로그인
  const axios = require("axios");
  const loginRes = await axios.post(`${API_URL}/login`, {
    user_id: encryptedId,
    password: encryptedPwd,
  });
  const accessToken = loginRes.data.access_token;
  const refreshToken = loginRes.data.refresh_token;
  console.log("✅ 로그인 성공");

  // CloudDataModule 초기화 및 토큰 주입
  const cloud = new CloudDataModule({ apiBaseURL: API_URL });
  cloud.updateTokenStorage({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // 업로드할 이미지 준비
  const samplePath = path.join(__dirname, "sample.png");
  if (!fs.existsSync(samplePath)) {
    console.error("❌ sample.png 파일이 tests 폴더에 없습니다.");
    return;
  }

  // 업로드 시도
  const id = crypto.randomUUID();
  const format = "png";
  const created_at = Math.floor(Date.now() / 1000);

  try {
    const result = await cloud.uploadImage(id, samplePath, format, created_at);
    console.log("✅ 업로드 성공:", result);
  } catch (err) {
    console.error("❌ 업로드 실패:", err.message, err.details || "");
  }
}

testUploadImage();
