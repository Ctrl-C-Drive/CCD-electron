// src/modules/DataRepositoryModule.js
const { v4: uuidv4 } = require("uuid");
const EventEmitter = require("events");
const path = require("path");
const { promisify } = require("util");
const stream = require("stream");
const fetch = require("node-fetch");
const pipeline = promisify(stream.pipeline);
const sharp = require("sharp");
const fs = require("fs-extra");
const { app } = require("electron");
const LocalDataModule = require("./LocalData");
const { error } = require("console");
const CCDError = require("../CCDError");
const { processImage } = require("../imageTagger");
const notifyRenderer = require("../notifyRenderer");

class DataRepositoryModule extends EventEmitter {
  constructor() {
    super();
    this.localDB = require("./LocalData");
    this.cloudDB = null;
    this._loadConfig();
    this.initializeCleanup();
    this.cache = {
      all: { data: null, valid: false },
    };
    const documentsDir = app.getPath("documents");
    this.uploadDir = path.join(documentsDir, "CCD");

    // 업로드 폴더가 없으면uploadDir 생성
    fs.ensureDirSync(this.uploadDir);
  }
  _loadConfig() {
    try {
      const { local_limit, day_limit } = this.localDB.getConfig();
      this.config = {
        maxItems: local_limit,
        retentionDays: day_limit,
      };
    } catch (error) {
      console.error("설정 로드 실패, 기본값 사용:", error);
      this.config = { maxItems: 100, retentionDays: 30 };
    }
  }
  initializeCleanup() {
    // 앱 시작 시 초기 정리
    this.cleanup();

    // 24시간 주기로 정리
    setInterval(() => this.cleanup(), 86400000);
  }
  setCloudData(cloudDB) {
    this.cloudDB = cloudDB;
  }

  async cleanup() {
    try {
      const maxDeletedIds = this.localDB.enforceMaxClipboardItems(
        this.config.maxItems
      );
      const oldDeletedIds = this.localDB.deleteOldClipboardItems(
        this.config.retentionDays
      );
    } catch (error) {
      console.error("자동 정리 실패:", error);
    }
  }
  async updateConfig(newConfig) {
    await this.localDB.updateConfig(newConfig);
    this._loadConfig();
    console.log(
      "✅ 업데이트 전 캐시 수:",
      this.cache.all.data?.length ?? "없음"
    );
    await this.cleanup();

    await this.reloadCache(true);
    notifyRenderer("clipboard-updated");
    console.log("✅ 새로 로드된 캐시 수:", this.cache.all.data?.length);
  }

  async updateMaxCountCloud(limit) {
    if (this.isCloudLoggedIn()) {
      await this.cloudDB.updateMaxCountCloud(limit);
    } else {
      this.localDB.enqueuePendingSync({
        op: "updateMaxCount",
        op_args: { limit },
      });
    }
  }

  async invalidateCache() {
    this.cache.all.valid = false;
  }

  async getClipboardItem(dataId) {
    try {
      return this.cache.all.data?.find((item) => item.id === dataId) || null;
    } catch (error) {
      throw CCDError.create("E602", {
        module: "DataRepository",
        context: "getClipboardItem",
        message: `아이템 조회 실패`,
        details: error.message || error,
      });
    }
  }

  // 클립보드 항목 추가
  // 클립보드 항목 추가 (이미지 처리 포함)
  async addItem(itemData, target = "both") {
    try {
      const id = itemData.id || uuidv4();
      const newItem = {
        ...itemData,
        id,
        created_at: itemData.created_at || Math.floor(Date.now() / 1000),
      };
      console.log("addItem received:", newItem);

      // 로컬 저장
      if (target === "local" || target === "both") {
        const localItem = {
          ...newItem,
        };

        this.localDB.insertClipboardItem(localItem);
        this.cleanup();
      }

      // 클라우드 저장
      if (target === "cloud" || target === "both") {
        if (newItem.type === "txt") {
          await this.cloudDB.createTextItem(newItem);
        } else if (newItem.type === "img") {
          await this.cloudDB.uploadImage(
            newItem.id,
            newItem.content,
            newItem.format,
            newItem.created_at
          );
        }
      }
      // 이미지 처리
      if (newItem.type === "img") {
        await this.processImageFiles(newItem);
        let temp = await processImage(newItem.content);
        console.log(temp);
        for (const tagName of temp) {
          console.log(tagName);
          try {
            if (target === "local" || target === "both") {
              const tag = await this.addTag({
                name: tagName,
                source: "auto",
              });

              await this.addDataTag(newItem.id, tag.tag_id);
            }
            if (target === "cloud" || target === "both") {
              console.log("here!!");
              console.log(newItem.id, tagName);
              this.cloudDB.createTag({
                data_id: newItem.id,
                name: tagName,
                source: "auto",
              });
            }
          } catch (error) {
            console.error(`[${tagName}] 이미지 태그 처리 실패:`, error);
          }
        }
      }

      if (newItem.type === "txt") {
        const autoTagPatterns = [
          {
            name: "이메일 주소",
            regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
          },
          { name: "전화번호", regex: /\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/ },
          { name: "URL / 도메인", regex: /https?:\/\/[^\s/$.?#].[^\s]*/ },
          { name: "IPv4 주소", regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
          { name: "날짜", regex: /\b\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}\b/ },
          { name: "시간", regex: /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/ },
          { name: "우편번호", regex: /\b\d{5}(-\d{4})?\b/ },
          { name: "주민등록번호", regex: /\b\d{6}-\d{7}\b/ },
          { name: "신용카드 번호", regex: /\b(?:\d{4}[- ]?){3}\d{4}\b/ },
          { name: "HTML 태그", regex: /<[^>]+>/ },
          { name: "해시태그", regex: /#[\w가-힣]+/g },
          { name: "멘션", regex: /@\w+/ },
          {
            name: "MAC 주소",
            regex: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/,
          },
          {
            name: "UUID",
            regex:
              /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/,
          },
          {
            name: "ISBN",
            regex: /\b97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?\d\b/,
          },
          {
            name: "국제 전화번호",
            regex: /\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{3,4}[-\s]?\d{4}/,
          },
          {
            name: "통화 금액",
            regex: /[\₩\$\€\£]\s?\d{1,3}(,\d{3})*(\.\d{2})?/,
          },
          { name: "파일 경로", regex: /([A-Za-z]:)?(\\|\/)[\w\s.-]+(\\|\/)?/ },
          { name: "색상 코드", regex: /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/ },
        ];

        for (const { name, regex } of autoTagPatterns) {
          try {
            if (regex.test(newItem.content)) {
              if (target === "local" || target === "both") {
                const tag = await this.addTag({
                  name: name,
                  source: "auto",
                });

                await this.addDataTag(newItem.id, tag.tag_id);
              }
              if (target === "cloud" || target === "both") {
                this.cloudDB.createTag({
                  data_id: newItem.id,
                  name: name,
                  source: "auto",
                });
              }
            }
          } catch (error) {
            console.error(`[${name}] 텍스트 태그 처리 실패:`, error);
          }
        }
      }

      this.invalidateCache();
      notifyRenderer("clipboard-updated");
      this.localDB.cleanupImageFiles();
      return this.transformItem(newItem);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "항목 추가 실패",
        message: error.details,
      });
    }
  }

  // 이미지 파일 처리 메서드
  async processImageFiles(item) {
    // const originalDir = path.join(this.uploadDir, "original");
    const thumbnailDir = path.join(this.uploadDir, "thumbnail");

    // await fs.ensureDir(originalDir);
    await fs.ensureDir(thumbnailDir);

    const fileExt = path.extname(item.content);
    // const originalFileName = `${item.id}${fileExt}`;
    const thumbnailFileName = `${item.id}_thumb${fileExt}`;

    // 1. 원본 이미지 저장
    // const originalPath = path.join(originalDir, originalFileName);
    // await fs.copy(item.imageMeta.file_path, originalPath);

    // 2. 썸네일 생성 (300px width)
    const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
    await sharp(item.content)
      .resize({ width: 300, fit: "inside" })
      .toFile(thumbnailPath);

    // 3. 메타데이터 계산
    const metadata = await sharp(item.content).metadata();
    const stats = await fs.stat(item.content);

    const imageMeta = {
      data_id: item.id,
      width: metadata.width,
      height: metadata.height,
      file_size: stats.size,
      file_path: item.content,
      thumbnail_path: thumbnailPath,
      format: metadata.format,
    };

    // DB에 삽입
    this.localDB.insertImageMeta({
      data_id: item.id,
      width: imageMeta.width,
      height: imageMeta.height,
      file_size: imageMeta.file_size,
      file_path: imageMeta.file_path,
      thumbnail_path: imageMeta.thumbnail_path,
    });

    // item에 저장
    item.imageMeta = imageMeta;
  }
  isCloudLoggedIn() {
    return !!this.cloudDB?.tokenStorage?.accessToken;
  }

  // 클립보드 항목 삭제
  async deleteItem(itemId, target = "both") {
    try {
      if (target === "local" || target === "both") {
        this.localDB.deleteClipboardItem(itemId);
      }

      if (target === "cloud" || target === "both") {
        if (this.isCloudLoggedIn()) {
          await this.cloudDB.deleteItem(itemId);
        } else {
          this.localDB.enqueuePendingSync({ op: "delete", data_id: itemId });
        }
      }

      this.invalidateCache();
      notifyRenderer("clipboard-updated");
      this.localDB.cleanupImageFiles();

      return true;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "항목 삭제 실패",
        message: error.details,
      });
    }
  }

  // 태그 추가 및 동기화
  async addTag(tagData) {
    try {
      // name + source로 기존 태그 조회
      let tag = this.localDB.getTagByNameAndSource(
        tagData.name,
        tagData.source
      );

      if (tag) {
        return tag; // 이미 존재하면 그대로 반환
      }

      const tag_id = uuidv4();

      this.localDB.insertTag({
        tag_id,
        ...tagData,
      });

      return {
        tag_id,
      };
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "로컬 태그 추가 실패",
        message: error.message,
      });
    }
  }

  // 데이터-태그 매핑 추가
  async addDataTag(dataId, tagId) {
    try {
      this.localDB.insertDataTag(dataId, tagId);
      this.invalidateCache();
      notifyRenderer("clipboard-updated");

      return true;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "태그 매핑 추가 실패",
        message: error.details,
      });
    }
  }
  async reloadCache(force = false) {
    if (this.cache.all.valid && !force) return;

    try {
      const [localRaw, cloudRaw] = await Promise.all([
        this.getLocalPreviewDataOnly(),
        this.getCloudPreviewDataOnly(),
      ]);

      const merged = this.mergeItems(localRaw, cloudRaw);
      this.cache.all = { data: merged, valid: true };
    } catch (error) {
      console.error("캐시 재로드 실패:", error);
      this.cache.all = { data: [], valid: false };
    }
  }

  // 미리보기 데이터 가져오기 (분리된 캐시)
  async getPreviewData() {
    try {
      await this.reloadCache(true);
      return this.cache.all.data || [];
    } catch (error) {
      console.error("미리보기 데이터 조회 실패:", error);
      return [];
    }
  }

  async getLocalPreviewDataOnly() {
    const rawItems = this.localDB.getAllClipboardWithMetaAndTags();
    return rawItems.map((item) => {
      const tags = item.tag_names ? item.tag_names.split(",") : [];
      const thumbnail_path =
        item.type === "img" && item.file_path ? item.thumbnail_path : null;
      return this.transformItem({
        ...item,
        tags,
        thumbnail_path,
        shared: "local",
      });
    });
  }

  async getCloudPreviewDataOnly() {
    if (!this.isCloudLoggedIn()) return [];
    try {
      const cloudItems = await this.cloudDB.getClipboardData();
      return cloudItems.map((item) => ({
        ...item,
        shared: "cloud",
      }));
    } catch (error) {
      console.error("클라우드 데이터 조회 실패:", error);
      return [];
    }
  }

  async logoutAndCleanupCloudData() {
    try {
      // 클라우드 캐시도 무효화
      this.invalidateCache();
      notifyRenderer("clipboard-updated");

      console.log("클라우드 데이터 로컬 DB에서 정리 완료");
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "로그아웃 정리 실패",
        message: error.message || error,
      });
    }
  }
  async searchByCLIP(query) {
    try {
      // 1. 클라우드에서 ID 목록 검색
      const idList = await this.cloudDB.searchByCLIP(query);

      // 2. 캐시 유효성 검사 및 로드
      if (!this.cache.all?.valid) {
        await this.reloadCache();
      }
      const allItems = this.cache.all.data || [];
      const itemMap = new Map(allItems.map((item) => [String(item.id), item]));

      const results = idList
        .map((id) => itemMap.get(String(id)))
        .filter(Boolean);

      return results;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "CLIP 검색 처리",
        message: error.message || error,
      });
    }
  }

  async searchItems(query, options = {}) {
    try {
      const localIds = await this.localDB.searchItems(query, options);
      await this.reloadCache();
      const allItems = this.cache.all.data || [];
      const localResults = allItems.filter(
        (item) => item.shared !== "cloud" && localIds.includes(item.id)
      );

      const lowerQuery = query.toLowerCase();

      const cloudResults = allItems.filter((item) => {
        if (item.shared !== "cloud") return false;

        const text = item.content?.toLowerCase() || "";
        const tags = (item.tags || [])
          .map((t) => t.name?.toLowerCase() || "")
          .join(" ");

        return text.includes(lowerQuery) || tags.includes(lowerQuery);
      });

      // 병합을 통해 shared 상태 포함
      const merged = this.mergeItems(localResults, cloudResults);
      return merged;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "검색 오류",
        message: error.message || error,
      });
    }
  }

  mergeItems(localItems, cloudItems) {
    const mergedMap = new Map();

    localItems.forEach((item) => {
      mergedMap.set(item.id, {
        ...item,
        shared: item.shared || "local",
        thumbnailUrl: item.imageMeta?.thumbnail_path,
      });
    });

    cloudItems.forEach((item) => {
      if (mergedMap.has(item.id)) {
        const localItem = mergedMap.get(item.id);
        mergedMap.set(item.id, {
          ...localItem,
          thumbnailUrl: item.imageMeta?.thumbnail_path,
          shared: "both",
        });
      } else {
        mergedMap.set(item.id, {
          ...item,
          shared: item.shared || "cloud",
        });
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => b.created_at - a.created_at
    );
  }

  transformItem(item) {
    return {
      id: item.id,
      type: item.type,
      content: item.content,
      format: item.format,
      created_at: item.created_at,
      thumbnail_path:
        item.type === "img" &&
        item.thumbnail_path &&
        fs.existsSync(item.thumbnail_path)
          ? `data:image/png;base64,${fs
              .readFileSync(item.thumbnail_path)
              .toString("base64")}`
          : undefined,
      tags: item.tags || [],
      score: item.score || 0,
    };
  }

  //선택 업로드
  async uploadSelectedItems(itemIds) {
    console.log("업로드 호출");
    await this.reloadCache();

    const allItems = this.cache.all.data || [];

    // 2. shared === "local" && 선택된 ID인 항목만
    const targets = allItems.filter(
      (item) => item.shared === "local" && itemIds.includes(item.id)
    );

    const result = {
      successCount: 0,
      failCount: 0,
      errors: [],
    };

    await Promise.all(
      targets.map(async (item) => {
        console.log(`업로드 시작: ${item.id}, type: ${item.type}`);
        try {
          if (item.type === "txt") {
            console.log(`텍스트 업로드 시도: ${item.id}`);
            await this.cloudDB.createTextItem(item);
          } else if (item.type === "img") {
            console.log(`이미지 업로드 시도: ${item.id}`);
            await this.cloudDB.uploadImage(
              item.id,
              item.content,
              item.format,
              item.created_at
            );
          }
          if (Array.isArray(item.tags)) {
            for (const tag of item.tags) {
              try {
                const tagName =
                  typeof tag === "string" ? tag : tag.name || tag.tag_id;
                if (!tagName) continue;

                await this.cloudDB.createTag({
                  data_id: item.id,
                  name: tagName,
                  source: "auto",
                });
              } catch (err) {
                console.warn(`태그 연결 실패 [${tag.name || tag}]:`, err);
              }
            }
          }

          result.successCount++;
        } catch (err) {
          result.errors.push({
            id: item.id,
            type: item.type,
            error: err.message || err.toString(),
          });
          return CCDError.create("E610", {
            module: "DataRepository",
            context: "일괄 업로드 실패",
            message: err,
          });
        }
      })
    );

    this.invalidateCache();
    notifyRenderer("clipboard-updated");
    return result;
  }

  //선택 다운로드
  async downloadSelectedItems(itemIds) {
    try {
      this.invalidateCache();
      await this.reloadCache();
      const allItems = this.cache.all.data || [];

      const targets = allItems.filter(
        (item) => item.shared === "cloud" && itemIds.includes(item.id)
      );

      let downloadResult = true;

      await Promise.all(
        targets.map(async (item) => {
          try {
            let contentPath = item.content; // 기본값(텍스트이거나 이미지 URL)

            // DB 삽입
            const localItem = {
              id: item.id,
              type: item.type,
              format: item.format,
              content: contentPath,
              created_at: item.created_at,
            };
            this.localDB.insertClipboardItem(localItem);

            if (item.type === "img") {
              const { originalPath } = await this.downloadImageFiles(item);
              contentPath = originalPath;
            }

            await this.syncTagsForItem(item);
          } catch (err) {
            console.error("다운로드 실패:", err);
            downloadResult = false;
          }
        })
      );

      this.invalidateCache();
      notifyRenderer("clipboard-updated");
      return { downloadResult };
    } catch (err) {
      throw CCDError.create("E602", {
        module: "DataRepository",
        context: "데이터 다운로드",
        details: error.message || error,
      });
    }
  }

  // 이미지 파일 다운로드
  async downloadImageFiles(cloudItem) {
    try {
      const m = cloudItem.imageMeta;
      if (!m || !m.originalUrl) {
        throw new Error("imageMeta.originalUrl이 없습니다.");
      }

      // ① 확장자 추출
      const ext = path.extname(m.originalUrl) || ".png";

      // ② 경로 설정 - this.uploadDir 기준
      const originalDir = path.join(this.uploadDir, "original");
      const thumbnailDir = path.join(this.uploadDir, "thumbnail");

      const originalPath = path.join(originalDir, `${cloudItem.id}${ext}`);
      const thumbnailPath = path.join(
        thumbnailDir,
        `${cloudItem.id}_thumb${ext}`
      );

      // ③ 디렉토리 생성
      fs.mkdirSync(originalDir, { recursive: true });
      fs.mkdirSync(thumbnailDir, { recursive: true });

      const oRes = await fetch(m.originalUrl);
      if (!oRes.ok) throw new Error(`원본 이미지 요청 실패 (${oRes.status})`);
      await pipeline(oRes.body, fs.createWriteStream(originalPath));

      // ⑤ 썸네일 다운로드
      if (m.thumbnailUrl) {
        const tRes = await fetch(m.thumbnailUrl);
        if (!tRes.ok) throw new Error(`썸네일 요청 실패 (${tRes.status})`);
        await pipeline(tRes.body, fs.createWriteStream(thumbnailPath));
      }
      // ⑤ 메타 저장
      this.localDB.insertImageMeta({
        data_id: cloudItem.id,
        width: m.width,
        height: m.height,
        file_size: m.file_size,
        file_path: originalPath,
        thumbnail_path: thumbnailPath,
      });
      this.localDB.updateClipboardContent(cloudItem.id, originalPath);
      return originalPath;
    } catch (err) {
      throw CCDError.create("E602", {
        module: "DataRepository",
        context: "이미지 파일 다운로드",
        details: err.message || err,
      });
    }
  }

  // 태그 동기화
  async syncTagsForItem(cloudItem) {
    for (const tag of cloudItem.tags || []) {
      try {
        // 1. addTag는 중복 검사 + 삽입 + ID 갱신까지 처리함
        const syncedTag = await this.addTag({
          name: tag,
          source: "auto",
        });
        // 2. 데이터-태그 연결
        await this.addDataTag(cloudItem.id, syncedTag.tag_id);
      } catch (error) {
        console.error(`[${tag}] 태그 동기화 실패:`, error);
      }
    }
  }
}

module.exports = DataRepositoryModule;
