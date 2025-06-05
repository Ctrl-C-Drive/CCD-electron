const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs-extra");
const CCDError = require("./CCDError");
// const DataRepository = require("./db_models/DataRepository");

const mobilenetModelPath = path.join(__dirname, "mobilenetv3", "mobilenetv3.onnx");

/**
 * MobileNetV3 모델 로드
 */
async function loadModel() {
  try {
    const session = await ort.InferenceSession.create(mobilenetModelPath);
    console.log("MobileNetV3 모델이 성공적으로 로드되었습니다.");
    return session;
  } catch (error) {
    const ccdError = CCDError.create("E669", {
      module: "imageTagger",
      context: "MobileNetV3 모델 로드",
      details: error.message || error,
    });
    console.error(ccdError);
    throw ccdError;
  }
}

/**
 * 이미지를 처리하고 태그를 생성
 * @param {string} imagePath - 이미지 파일 경로
 * @returns {Promise<string[]>} - 태그 리스트
 */
async function generateTags(imagePath) {
  try {
    const model = await loadModel();

    // 이미지 전처리 (224x224로 리사이즈 및 정규화)
    const imageBuffer = await sharp(imagePath)
      .resize(224, 224)
      .toFormat("png")
      .toBuffer();

    const inputTensor = new ort.Tensor("float32", new Float32Array(imageBuffer), [1, 3, 224, 224]);

    // 추론 실행
    const results = await model.run({ input: inputTensor });

    // 모델 출력에서 태그 추출
    const output = results.output.data;
    const tags = output.map((value, index) => `Tag_${index}: ${value.toFixed(2)}`);
    return tags;
  } catch (error) {
    const ccdError = CCDError.create("E660", {
      module: "imageTagger",
      context: "태그 생성",
      details: error.message || error,
    });
    console.error(ccdError);
    throw ccdError;
  }
}

/**
 * 이미지 처리 및 태그 저장
 * @param {string} imagePath - 이미지 파일 경로
 * @param {string} imageId - 이미지 ID
 */
async function processImage(imagePath, imageId) {
  try {
    const tags = await generateTags(imagePath);
    // await saveTagsToDatabase(imageId, tags);
    console.log("이미지가 처리되고 태그가 생성되었습니다.");
  } catch (error) {
    const ccdError = CCDError.create("E661", {
      module: "imageTagger",
      context: "이미지 처리",
      details: error.message || error,
    });
    console.error(ccdError);
    throw ccdError;
  }
}

module.exports = { processImage };

/**
 * 태그를 데이터베이스에 저장
 * @param {string} imageId - 이미지 ID
 * @param {string[]} tags - 태그 리스트
 */
// async function saveTagsToDatabase(imageId, tags) {
//   try {
//     for (const tag of tags) {
//       await DataRepository.addDataTag(imageId, tag, "local");
//     }
//     console.log("태그가 데이터베이스에 성공적으로 저장되었습니다.");
//   } catch (error) {
//     console.error("태그 저장 실패:", error);
//     throw error;
//   }
// }

module.exports = { processImage };