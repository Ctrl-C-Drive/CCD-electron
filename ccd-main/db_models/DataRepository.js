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

class DataRepositoryModule extends EventEmitter {
  constructor() {
    super();
    this.localDB = require("./LocalData");
    this.cloudDB = require("./CloudData");
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

  async cleanup() {
    try {
      const maxDeletedIds = this.localDB.enforceMaxClipboardItems(
        this.config.maxItems
      );
      const oldDeletedIds = this.localDB.deleteOldClipboardItems(
        this.config.retentionDays
      );

      const allDeletedIds = [...maxDeletedIds, ...oldDeletedIds];

      for (const id of allDeletedIds) {
        let sharedStatus = this.localDB.getSharedStatus(itemId);
        if (sharedStatus === "both") {
          await this.cloudDB.localDelete(itemId);
        }
      }
    } catch (error) {
      console.error("자동 정리 실패:", error);
    }
  }
  async updateConfig(newConfig) {
    await this.localDB.updateConfig(newConfig);
    this._loadConfig(); // 변경된 설정 다시 로드
  }

  async updateMaxCountCloud(limit) {
    const result = await this.cloudDB.updateMaxCountCloud(limit);
  }

  invalidateCache(source = "all") {
    if (source === "local" || source === "all") {
      this.cache.local.valid = false;
    }
    if (source === "cloud" || source === "all") {
      this.cache.cloud.valid = false;
    }
  }

  //단일 클립보드 아이템 추가
  // async getClipboardItem(dataId, source = "local") {
  //   try {
  //     let item;

  //     if (source === "local") {
  //       item = this.localDB.getClipboardItem(dataId);
  //     } else if (source === "cloud") {
  //       item = await this.cloudDB.getClipboardItem(dataId);
  //     } else {
  //       throw CCDError.create("E601", {
  //         module: "DataRepository",
  //         context: "getClipboardItem",
  //         message: `지원되지 않는 소스: ${source}`,
  //       });
  //     }

  //     if (!item) return null;
  //     return item;
  //   } catch (error) {
  //     throw CCDError.create("E602", {
  //       module: "DataRepository",
  //       context: "getClipboardItem",
  //       message: `아이템 조회 실패 (source: ${source})`,
  //       details: error.message || error,
  //     });
  //   }
  // }
  async getClipboardItem(dataId) {
    try {
      // 1. 로컬 캐시에서 찾기
      const localCached = this.cache.local?.data?.find(
        (item) => item.id === dataId
      );
      if (localCached) {
        return { ...localCached, source: "local" };
      }

      // 2. 클라우드 캐시에서 찾기
      const cloudCached = this.cache.cloud?.data?.find(
        (item) => item.id === dataId
      );
      if (cloudCached) {
        return { ...cloudCached, source: "cloud" };
      }

      // 3. 로컬 DB에서 조회
      const localItem = this.localDB.getClipboardItem(dataId);
      if (localItem) {
        return { ...localItem, source: "local" };
      }

      // 4. 클라우드 DB에서 조회
      const cloudItem = await this.cloudDB.getClipboardItem(dataId);
      if (cloudItem) {
        return { ...cloudItem, source: "cloud" };
      }

      // 5. 모두 실패
      return null;
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
          shared: target === "both" ? "both" : "local",
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
              // 기존 태그 검색
              let tag = this.localDB.getTagByNameAndSource(name, "auto");

              // 새 태그 생성
              if (!tag) {
                tag = await this.addTag(
                  {
                    name,
                    source: "auto",
                    sync_status: "pending",
                  },
                  target
                );
              }

              // 태그 연결
              await this.addDataTag(newItem.id, tag.tag_id, target);
            }
          } catch (error) {
            console.error(`[${name}] 태그 처리 실패:`, error);
          }
        }
      }

      this.invalidateCache(target === "both" ? "all" : target);
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

  // 클립보드 항목 삭제
  async deleteItem(itemId, target = "both") {
    try {
      let sharedStatus = null;
      if (target === "local" || target === "both") {
        sharedStatus = this.localDB.getSharedStatus(itemId);
      }
      if (target === "local" || target === "both") {
        this.localDB.deleteClipboardItem(itemId);

        if (target === "local" && sharedStatus === "both") {
          await this.cloudDB.localDelete(itemId);
        }
      }

      if (target === "cloud" || target === "both") {
        await this.cloudDB.deleteItem(itemId);
        if (target === "cloud" && sharedStatus === "both") {
          this.localDB.updateSharedStatus(itemId, "local");
        }
      }

      if (target === "local" || target === "both") {
        this.invalidateCache("local");
      }
      if (target === "cloud" || target === "both") {
        this.invalidateCache("cloud");
      }

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
  async addTag(tagData, target = "both") {
    try {
      let finalTagId = uuidv4();
      let cloudTagId = null;
      let needLocalUpdate = false;
      let sync_status = "pending";

      // 1. 클라우드 동기화 먼저 시도
      if (target === "cloud" || target === "both") {
        try {
          const cloudTag = await this.cloudDB.createTag(tagData);
          cloudTagId = cloudTag.tag_id;
          finalTagId = cloudTagId; // 클라우드 ID를 기본으로 사용
          sync_status = "synced";
        } catch (error) {
          throw CCDError.create("E610", {
            module: "DataRepository",
            context: "클라우드 태그 생성 실패",
            message: error.details,
          });
        }
      }

      // 2. 로컬 처리
      if (target === "local" || target === "both") {
        if (cloudTagId == null) {
          sync_status = "pending";
        }
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
            this.localDB.updateSyncStatus(finalTagId, "synced");
            needLocalUpdate = true;
          }
        } else {
          // 새 로컬 태그 생성
          this.localDB.insertTag({
            tag_id: finalTagId,
            ...tagData,
            sync_status: sync_status,
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
        sync_status: sync_status,
      };
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "태그 추가 실패",
        message: error.details,
      });
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
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "태그 매핑 추가 실패",
        message: error.details,
      });
    }
  }

  // 미리보기 데이터 가져오기 (분리된 캐시)
  async getPreviewData() {
    try {
      console.log("preview data called");
      const [localResult, cloudResult] = await Promise.allSettled([
        this.getLocalPreview(),
        this.getCloudPreview(),
      ]);

      const localData =
        localResult.status === "fulfilled" ? localResult.value : [];
      const cloudData =
        cloudResult.status === "fulfilled" ? cloudResult.value : [];

      const temp = this.mergeItems(localData, cloudData);
      return temp;
    } catch (error) {
      console.error("미리보기 데이터 조회 실패:", error);
      return [];
    }
  }

  async getLocalPreview() {
    if (this.cache.local.valid) {
      return this.cache.local.data;
    }

    const rawItems = this.localDB.getAllClipboardWithMetaAndTags();

    const data = rawItems.map((item) =>
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
    if (!this.cloudDB?.tokenStorage?.accessToken) return [];
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

  async logoutAndCleanupCloudData() {
    try {
      // shared = 'cloud' 인 항목만 삭제
      const stmt = this.localDB.db.prepare(`
        DELETE FROM clipboard
        WHERE shared IN ('cloud')
      `);
      stmt.run();

      // 클라우드 캐시도 무효화
      this.invalidateCache("cloud");

      console.log("클라우드 데이터 로컬 DB에서 정리 완료");
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "로그아웃 정리 실패",
        message: error.message || error,
      });
    }
  }

  async searchItems(query, options = {}) {
    try {
      const results = [];

      // 1. 클라우드 토큰이 있는 경우, 클라우드 캐시에서 검색
      if (this.cloudDB?.tokenStorage?.accessToken) {
        try {
          const cloudItems = await this.getCloudPreview();
          const lowerQuery = query.toLowerCase();

          const matchedCloud = cloudItems.filter((item) => {
            const text = item.content?.toLowerCase() || "";
            const tags = (item.tags || [])
              .map((t) => t.name?.toLowerCase() || "")
              .join(" ");
            return text.includes(lowerQuery) || tags.includes(lowerQuery);
          });

          results.push(...matchedCloud.map((item) => this.transformItem(item)));
        } catch (err) {
          console.warn("클라우드 캐시 검색 실패:", err.message || err);
        }
      }

      // 2. 로컬 FTS5 검색
      const localResults = await this.localDB.searchItems(query, options);
      results.push(...localResults.map((item) => this.transformItem(item)));
      console.log(results);
      return results;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "검색 오류",
        message: error.message || error,
      });
    }
  }

  // async searchItems(query, options = {}) {
  //   try {
  //     if (options.includeCloud) {
  //       try {
  //         const cloudItems = await this.cloudDB.getClipboardData();
  //         await this.syncCloudItems(cloudItems);
  //       } catch (err) {
  //         console.warn(
  //           "클라우드 검색 실패, 로컬 검색만 수행:",
  //           err.message || err
  //         );
  //         // throw CCDError.create("E610", {
  //         //   module: "DataRepository",
  //         //   context: "클라우드검색 실패",
  //         //   message: error.details,
  //         // });
  //       }
  //     }

  //     const results = await this.localDB.searchItems(query, options);
  //     let temp = results.map((item) => this.transformItem(item));
  //     return temp;
  //   } catch (error) {
  //     throw CCDError.create("E610", {
  //       module: "DataRepository",
  //       context: "검색 오류",
  //       message: error.details,
  //     });
  //   }
  // }

  async syncCloudItems(cloudItems) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < cloudItems.length; i += BATCH_SIZE) {
      const batch = cloudItems.slice(i, i + BATCH_SIZE);
      await this.localDB.bulkUpsert(batch);
    }
  }

  mergeItems(localItems, cloudItems) {
    const mergedMap = new Map();

    // 클라우드 데이터 병합
    cloudItems.forEach((item) => {
      mergedMap.set(item.id, {
        ...item,
        source: "cloud",
        thumbnailUrl: item.imageMeta?.thumbnail_path,
      });
    });

    // 로컬 데이터 병합 (클라우드에 없는 경우만)
    localItems.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, {
          ...item,
          source: "local",
          thumbnailUrl: item.imageMeta?.thumbnail_path,
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
      thumbnail_path: item.imageMeta?.thumbnail_path || null,
      tags: item.tags || [],
      source: item.source || "local",
      score: item.score || 0,
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
              shared: "both",
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
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "일괄 다운로드 실패",
        message: error.details,
      });
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
      throw CCDError.create("E610", {
        module: "DataRepository",
        context: "일괄 업로드 실패",
        message: error.details,
      });
    }
  }

  //선택 업로드
  async uploadSelectedItems(itemIds) {
    const localItems = await this.getLocalPreview();
    const cloudItems = await this.getCloudPreview();
    const cloudIds = new Set(cloudItems.map((item) => item.id));

    const targets = localItems.filter(
      (item) =>
        item.shared === "local" &&
        itemIds.includes(item.id) &&
        !cloudIds.has(item.id)
    );

    let uploadResult = true;

    await Promise.all(
      targets.map(async (item) => {
        try {
          if (item.type === "txt") {
            await this.cloudDB.createTextItem(item);
          } else if (item.type === "img") {
            await this.cloudDB.uploadImage(
              item.id,
              item.content,
              item.format,
              item.createdAt
            );
          }
          this.localDB.updateSharedStatus(item.id, "both");
        } catch (err) {
          console.error("업로드 실패:", item.id, err);
          uploadResult = false;
        }
      })
    );

    this.invalidateCache("cloud");
    return { uploadResult };
  }

  //선택 다운로드
  async downloadSelectedItems(itemIds) {
    const cloudItems = await this.getCloudPreview();
    const localItems = await this.getLocalPreview();
    const localIds = new Set(localItems.map((item) => item.id));

    const targets = cloudItems.filter(
      (item) => itemIds.includes(item.id) && !localIds.has(item.id)
    );

    let downloadResult = true;

    await Promise.all(
      targets.map(async (item) => {
        try {
          const localItem = {
            id: item.id,
            type: item.type,
            format: item.format,
            content: item.content,
            created_at: item.created_at,
            shared: "both",
          };

          this.localDB.insertClipboardItem(localItem);

          if (item.type === "img") {
            await this.downloadImageFiles(item);
          }

          await this.syncTagsForItem(item);
        } catch (err) {
          console.error("다운로드 실패:", item.id, err);
          downloadResult = false;
        }
      })
    );

    this.invalidateCache("local");
    return { downloadResult };
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
      const thumbRes = await fetch(imageMeta.thumbnail_path);
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

const dataRepositoryInstance = new DataRepositoryModule();
module.exports = dataRepositoryInstance;
