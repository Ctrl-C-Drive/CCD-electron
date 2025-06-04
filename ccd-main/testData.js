const dataRepo = require("./db_models/DataRepository");
const { app } = require("electron");

app.whenReady().then(async () => {
  const dataRepo = require("./db_models/DataRepository");

  console.log("Running cache test...");
  await testCacheBehavior();
});

async function testCacheBehavior() {
  console.log("1. 캐시 초기화 상태 확인");
  dataRepo.invalidateCache("local"); // 캐시 무효화
  console.assert(!dataRepo.cache.local.valid, "✅ 캐시가 무효화되어야 함");

  console.log("2. 첫 번째 getLocalPreview() 호출");
  const firstResult = await dataRepo.getLocalPreview();
  console.assert(
    dataRepo.cache.local.valid,
    "✅ 캐시가 유효화되어야 함 (valid: true)"
  );
  console.assert(Array.isArray(firstResult), "✅ 결과는 배열이어야 함");
  console.assert(firstResult.length > 0, "❌ DB에서 데이터를 가져오지 못했음");
  console.log("📦 첫 번째 조회 결과 개수:", firstResult.length);
  console.log("🔍 예시 아이템:", firstResult[0]);

  console.log("3. 두 번째 getLocalPreview() 호출 (캐시에서 가져와야 함)");
  const secondResult = await dataRepo.getLocalPreview();
  console.assert(
    secondResult === firstResult,
    "✅ 동일한 캐시 객체가 반환되어야 함"
  );

  console.log("4. 캐시 무효화 후 다시 조회");
  dataRepo.invalidateCache("local");
  const thirdResult = await dataRepo.getLocalPreview();
  console.assert(thirdResult !== secondResult, "✅ 새로 쿼리된 객체여야 함");

  console.log("✅ 테스트 완료");
}

testCacheBehavior().catch((err) => {
  console.error("❌ 테스트 실패:", err);
});
