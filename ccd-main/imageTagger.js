const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs-extra");
const CCDError = require("./CCDError");
const CLASSES = require("./mobilenetv3/Classes.js");
// const DataRepository = require("./db_models/DataRepository");

const mobilenetModelPath = path.join(
  __dirname,
  "mobilenetv3",
  "mobilenetv3_trained_new.onnx"
);

let modelSession = null;

/**
 * MobileNetV3 모델 로드
 */
async function loadModel() {
  if (modelSession) return modelSession;
  try {
    modelSession = await ort.InferenceSession.create(mobilenetModelPath);
    console.log("MobileNetV3 모델이 성공적으로 로드되었습니다.");
    return modelSession;
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
      .raw()
      .toBuffer();

    if (imageBuffer.length !== 150528) {
      throw new Error(
        `Invalid image buffer size: expected 150528, got ${imageBuffer.length}`
      );
    }

    // 픽셀 값을 [0, 1]로 정규화하고 학습 시 사용한 평균 및 표준편차로 다시 정규화
    const normalizedBuffer = new Float32Array(imageBuffer.length);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // reshape: HWC → CHW
    for (let i = 0; i < 224 * 224; i++) {
      const r = imageBuffer[i * 3];
      const g = imageBuffer[i * 3 + 1];
      const b = imageBuffer[i * 3 + 2];

      normalizedBuffer[0 * 224 * 224 + i] = (r / 255.0 - mean[0]) / std[0]; // R
      normalizedBuffer[1 * 224 * 224 + i] = (g / 255.0 - mean[1]) / std[1]; // G
      normalizedBuffer[2 * 224 * 224 + i] = (b / 255.0 - mean[2]) / std[2]; // B
    }

    const inputTensor = new ort.Tensor(
      "float32",
      normalizedBuffer,
      [1, 3, 224, 224]
    );

    // 추론 실행
    const results = await model.run({ input: inputTensor });
    // console.log(Object.keys(results)); // 결과 확인용

    // 모델 출력에서 태그 추출
    const outputkey = Object.keys(results)[0];
    const output = results[outputkey].data;
    const THRESHOLD = 0.5; // 확률 0.5 이상만 태그로 선택

    const tags = [];
    for (let i = 0; i < output.length; i++) {
      if (output[i] >= THRESHOLD) {
        tags.push(CLASSES[i]);
      }
    }
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
 */
async function processImage(imagePath) {
  try {
    const tags = await generateTags(imagePath);
    // await saveTagsToDatabase(imageId, tags);
    console.log("이미지가 처리되고 태그가 생성되었습니다.");
    console.log(tags);
    return tags;
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

module.exports = { processImage, loadModel };

// /**
//  * 태그를 데이터베이스에 저장
//  * @param {string} imageId - 이미지 ID
//  * @param {string[]} tags - 태그 리스트
//  */
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
