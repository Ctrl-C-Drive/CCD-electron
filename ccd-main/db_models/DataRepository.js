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
const CloudDataModule = require("./CloudData");

class DataRepositoryModule extends EventEmitter {
  constructor(config) {
    super();
    this.localDB = new LocalDataModule();
    this.cloudDB = new CloudDataModule(config);
    this._loadConfig();
    this.initializeCleanup();
    this.cache = {
      local: { data: null, valid: false },
      cloud: { data: null, valid: false },
    };
    const documentsDir = app.getPath("documents");
    this.uploadDir = path.join(documentsDir, "CCD");

    // 업로드 폴더가 없으면 생성
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

  cleanup() {
    try {
      // 항목 수 제한 적용
      this.localDB.enforceMaxClipboardItems(this.config.maxItems);

      // 오래된 데이터 삭제
      this.localDB.deleteOldClipboardItems(this.config.retentionDays);
    } catch (error) {
      console.error("자동 정리 실패:", error);
    }
  }
  async updateConfig(newConfig) {
    await this.localDB.updateConfig(newConfig);
    this._loadConfig(); // 변경된 설정 다시 로드
  }

  invalidateCache(source = "all") {
    if (source === "local" || source === "all") {
      this.cache.local.valid = false;
    }
    if (source === "cloud" || source === "all") {
      this.cache.cloud.valid = false;
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

      // 이미지 처리
      if (newItem.type === "img") {
        await this.processImageFiles(newItem);
      }

      // 로컬 저장
      if (target === "local" || target === "both") {
        const localItem = {
          ...newItem,
          shared: target === "both" ? "cloud" : "local",
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

      this.invalidateCache(target === "both" ? "all" : target);
      return this.transformItem(newItem);
    } catch (error) {
      this.handleSyncError(error, "항목 추가 실패");
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

    item.imageMeta = {
      width: metadata.width,
      height: metadata.height,
      file_size: stats.size,
      file_path: item.content,
      thumbnail_path: thumbnailPath,
      format: metadata.format,
    };

    item.format = `image/${metadata.format}`;
  }

  // 클립보드 항목 삭제
  async deleteItem(itemId, target = "both") {
    try {
      if (target === "local" || target === "both") {
        this.localDB.deleteClipboardItem(itemId);
      }

      if (target === "cloud" || target === "both") {
        await this.cloudDB.deleteItem(itemId);
      }

      if (target === "local" || target === "both") {
        this.invalidateCache("local");
      }
      if (target === "cloud" || target === "both") {
        this.invalidateCache("cloud");
      }

      return true;
    } catch (error) {
      this.handleSyncError(error, "항목 삭제 실패");
    }
  }

  // 태그 추가 및 동기화
  async addTag(tagData, target = "both") {
    try {
      let finalTagId = uuidv4();
      let cloudTagId = null;
      let needLocalUpdate = false;

      // 1. 클라우드 동기화 먼저 시도
      if (target === "cloud" || target === "both") {
        try {
          const cloudTag = await this.cloudDB.createTag(tagData);
          cloudTagId = cloudTag.tag_id;
          finalTagId = cloudTagId; // 클라우드 ID를 기본으로 사용
        } catch (error) {
          console.error("클라우드 태그 생성 실패:", error);
          throw error;
        }
      }

      // 2. 로컬 처리
      if (target === "local" || target === "both") {
        // 로컬에서 기존 태그 확인 (name/source 기준)
        const existingLocalTag = this.localDB.getTagByNameAndSource(
          tagData.name,
          tagData.source
        );

        if (existingLocalTag) {
          // 기존 로컬 태그 ID와 클라우드 ID 비교
          if (existingLocalTag.tag_id !== finalTagId) {
            console.log(
              `태그 ID 충돌 감지: 로컬 ${existingLocalTag.tag_id} ↔ 클라우드 ${finalTagId}`
            );
            this.localDB.updateTagId(existingLocalTag.tag_id, finalTagId);
            needLocalUpdate = true;
          }
        } else {
          // 새 로컬 태그 생성
          this.localDB.insertTag({
            tag_id: finalTagId,
            ...tagData,
            sync_status: "synced",
          });
          needLocalUpdate = true;
        }
      }

      // 3. 변경 사항이 있으면 캐시 무효화
      if (needLocalUpdate) {
        this.invalidateCache("local");
      }

      return {
        tag_id: finalTagId,
        ...tagData,
        sync_status: "synced",
      };
    } catch (error) {
      this.handleSyncError(error, "태그 추가 실패");
    }
  }

  // 데이터-태그 매핑 추가
  async addDataTag(dataId, tagId, target = "both") {
    try {
      if (target === "local" || target === "both") {
        this.localDB.insertDataTag(dataId, tagId);
      }

      if (target === "cloud" || target === "both") {
        await this.cloudDB.createDataTag(dataId, tagId);
      }

      return true;
    } catch (error) {
      this.handleSyncError(error, "태그 매핑 추가 실패");
    }
  }

  // 미리보기 데이터 가져오기 (분리된 캐시)
  async getPreviewData() {
    try {
      const [localData, cloudData] = await Promise.all([
        this.getLocalPreview(),
        this.getCloudPreview(),
      ]);

      return this.mergeItems(localData, cloudData);
    } catch (error) {
      console.error("미리보기 데이터 조회 실패:", error);
      return [];
    }
  }

  async getLocalPreview() {
    if (this.cache.local.valid) {
      return this.cache.local.data;
    }

    const stmt = this.localDB.db.prepare(`
    SELECT c.*, im.*, GROUP_CONCAT(t.tag_id) as tag_ids 
    FROM clipboard c
    LEFT JOIN image_meta im ON c.id = im.data_id
    LEFT JOIN data_tag dt ON c.id = dt.data_id
    LEFT JOIN tag t ON dt.tag_id = t.tag_id
    GROUP BY c.id
  `);

    const data = stmt.all().map((item) =>
      this.transformItem(item, {
        ...item,
        tags: item.tag_ids
          ? item.tag_ids.split(",").map((tag_id) => ({ tag_id }))
          : [],
      })
    );

    this.cache.local = { data, valid: true };
    return data;
  }

  async getCloudPreview() {
    if (this.cache.cloud.valid) {
      return this.cache.cloud.data;
    }

    try {
      const data = await this.cloudDB.getClipboardData();
      this.cache.cloud = { data, valid: true };
      return data;
    } catch (error) {
      console.error("클라우드 데이터 조회 실패:", error);
      return [];
    }
  }

  mergeItems(localItems, cloudItems) {
    const mergedMap = new Map();

    // 클라우드 데이터 병합
    cloudItems.forEach((item) => {
      mergedMap.set(item.id, {
        ...item,
        source: "cloud",
        thumbnailUrl: item.imageMeta?.thumbnailUrl,
      });
    });

    // 로컬 데이터 병합 (클라우드에 없는 경우만)
    localItems.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, {
          ...item,
          source: "local",
          thumbnailUrl: item.imageMeta?.thumbnailUrl,
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
      createdAt: item.created_at,
      thumbnailUrl: item.imageMeta?.thumbnailUrl,
      tags: item.tags || [],
      source: item.source || "local",
    };
  }

  handleSyncError(error, context) {
    console.error(`${context}:`, error);
    throw {
      code: error.code || "E500",
      message: error.message || context,
      details: error.details,
    };
  }
  // 클라우드 → 로컬 다운로드
  async downloadCloudData() {
    try {
      const [cloudItems, localItems] = await Promise.all([
        this.cloudDB.getClipboardData(),
        this.getLocalPreview(),
      ]);

      const localIds = new Set(localItems.map((item) => item.id));
      const itemsToDownload = cloudItems.filter(
        (item) => !localIds.has(item.id)
      );

      let successCount = 0;
      let errorCount = 0;

      await Promise.all(
        itemsToDownload.map(async (cloudItem) => {
          try {
            // 기본 데이터 저장
            const localItem = {
              id: cloudItem.id,
              type: cloudItem.type,
              format: cloudItem.format,
              content: cloudItem.content,
              created_at: cloudItem.created_at,
              shared: "cloud",
            };

            this.localDB.insertClipboardItem(localItem);

            // 이미지 메타데이터 처리
            if (cloudItem.type === "img") {
              await this.downloadImageFiles(cloudItem);
            }

            // 태그 동기화
            await this.syncTagsForItem(cloudItem);

            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`다운로드 실패 (${cloudItem.id}):`, error);
          }
        })
      );

      this.invalidateCache("local");
      return { successCount, errorCount };
    } catch (error) {
      throw this.handleSyncError(error, "일괄 다운로드 실패");
    }
  }

  // 로컬 → 클라우드 업로드
  async uploadLocalData() {
    try {
      const [localItems, cloudItems] = await Promise.all([
        this.getLocalPreview(),
        this.cloudDB.getClipboardData(),
      ]);

      const cloudIds = new Set(cloudItems.map((item) => item.id));
      const itemsToUpload = localItems.filter(
        (item) => item.shared === "local" && !cloudIds.has(item.id)
      );

      let successCount = 0;
      let errorCount = 0;

      await Promise.all(
        itemsToUpload.map(async (localItem) => {
          try {
            // 텍스트 업로드
            if (localItem.type === "txt") {
              await this.cloudDB.createTextItem({
                ...localItem,
                created_at: Math.floor(Date.now() / 1000),
              });
            }

            // 이미지 업로드
            if (localItem.type === "img") {
              await this.uploadImage(localItem);
            }

            // 공유 상태 업데이트
            this.localDB.updateSharedStatus(localItem.id, "both");
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`업로드 실패 (${localItem.id}):`, error);
          }
        })
      );

      this.invalidateCache("cloud");
      return { successCount, errorCount };
    } catch (error) {
      throw this.handleSyncError(error, "일괄 업로드 실패");
    }
  }

  // 이미지 파일 다운로드
  async downloadImageFiles(cloudItem) {
    const imageMeta = cloudItem.imageMeta;
    const originalPath = path.join(
      original_dir,
      `${cloudItem.id}.${imageMeta.format}`
    );
    const thumbnailPath = path.join(
      thumbnail_dir,
      `${cloudItem.id}_thumb.${imageMeta.format}`
    );

    // 디렉토리 생성
    fs.mkdirSync(original_dir, { recursive: true });
    fs.mkdirSync(thumbnail_dir, { recursive: true });

    // 원본 이미지 다운로드
    const originalRes = await fetch(imageMeta.originalUrl);
    await pipeline(originalRes.body, fs.createWriteStream(originalPath));

    // 썸네일 다운로드
    if (imageMeta.thumbnailUrl) {
      const thumbRes = await fetch(imageMeta.thumbnailUrl);
      await pipeline(thumbRes.body, fs.createWriteStream(thumbnailPath));
    }

    // 메타데이터 저장
    this.localDB.insertImageMeta({
      data_id: cloudItem.id,
      width: imageMeta.width,
      height: imageMeta.height,
      file_size: imageMeta.file_size,
      file_path: originalPath,
      thumbnail_path: thumbnailPath,
    });
  }

  // 태그 동기화
  async syncTagsForItem(cloudItem) {
    for (const tag of cloudItem.tags) {
      // 태그 존재 여부 확인
      const existingTag = this.localDB.getTagByNameAndSource(
        tag.name,
        tag.source
      );

      if (!existingTag) {
        // 새 태그 생성
        this.localDB.insertTag({
          tag_id: tag.tag_id,
          name: tag.name,
          source: tag.source,
          sync_status: "synced",
        });
      } else if (existingTag.tag_id !== tag.tag_id) {
        // 태그 ID 업데이트
        this.localDB.updateTagId(existingTag.tag_id, tag.tag_id);
      }

      // 데이터-태그 연결
      this.localDB.insertDataTag(cloudItem.id, tag.tag_id);
    }
  }
}

module.exports = DataRepositoryModule;
