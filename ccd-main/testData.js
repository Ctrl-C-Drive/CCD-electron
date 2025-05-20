const CloudDataModule = require("./db_models/CloudData");

async function testSignup() {
  // API 기본 설정 예시
  const config = {
    apiBaseURL: "http://localhost:8000",
    authToken: null,
    refreshToken: null,
  };

  const cloudModule = new CloudDataModule(config);

  // 회원가입이 없다면 로그인 테스트 (예시)
  try {
    const credentials = {
      user_id: "testuser",
      password: "password123",
    };
    const result = await cloudModule.login(credentials);
    console.log("로그인 성공:", result);
  } catch (err) {
    console.error("로그인 실패:", err);
  }
}

testSignup();
