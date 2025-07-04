const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const fs = require("fs-extra");
const sharp = require("sharp");
const CCDError = require("../CCDError");

class LocalDataModule {
  constructor() {
    this.dbPath = path.join(app.getPath("userData"), "clipboard-manager.db");
    // this.encryptionKey = "secure-key-1234"; // 실제 배포 시 환경변수로 관리
    this.db = null;
    this._initialize();
    this.initializeCleanup();
    this.setupFTS();
  }
  _initialize() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma("foreign_keys = ON");
      // this._enableEncryption();
      this._createTables();
      this._createIndexes();
      console.log("Database initialized successfully");
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "데이터베이스 초기화 실패",
        message: error,
      });
    }
  }

  // _enableEncryption() {
  //   const keyBuffer = crypto.scryptSync(this.encryptionKey, "salt", 32); // 더 안전한 키 생성
  //   this.db.pragma(`key=x'${keyBuffer.toString("hex")}'`); // 바이너리 방식으로 전달
  // }

  // 주기적 정리 작업 초기화
  initializeCleanup() {
    // 앱 시작 시 초기 정리
    this.cleanupImageFiles();

    // 24시간 주기로 정리
    setInterval(() => this.cleanupImageFiles(), 86400000);
  }

  // 이미지 파일 정리 메서드
  cleanupImageFiles() {
    try {
      // 모든 이미지 메타데이터 조회
      const allMeta = this.db.prepare("SELECT * FROM image_meta").all();

      for (const meta of allMeta) {
        const { data_id, file_path, thumbnail_path } = meta;
        const originalExists = fs.existsSync(file_path);
        const thumbnailExists = thumbnail_path
          ? fs.existsSync(thumbnail_path)
          : false;

        // 1. 원본 이미지가 존재하지 않는 경우
        if (!originalExists) {
          console.log(`원본 이미지 누락: ${file_path}`);

          // 썸네일 삭제 (존재할 경우)
          if (thumbnailExists) {
            fs.unlink(thumbnail_path).catch((e) => console.error(e));
          }

          // 데이터베이스 항목 삭제 (CASCADE로 연관 데이터 자동 삭제)
          this.deleteClipboardItem(data_id);
          continue;
        }

        // 2. 썸네일이 존재하지 않는 경우
        if (!thumbnailExists) {
          console.log(`썸네일 누락: ${thumbnail_path}`);
          this.regenerateThumbnail(data_id, file_path);
        }
      }
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "내부 오류",
        message: "이미지 파일 정리 실패패",
      });
    }
  }

  // 썸네일 재생성 메서드
  async regenerateThumbnail(dataId, imagePath) {
    try {
      // 새 썸네일 경로 생성
      const ext = path.extname(imagePath);
      const thumbnailPath = path.join(
        path.dirname(imagePath),
        `thumb_${path.basename(imagePath, ext)}.png`
      );

      // 썸네일 생성
      await sharp(imagePath)
        .resize(200, 200, { fit: "inside" })
        .toFile(thumbnailPath);

      // 데이터베이스 업데이트
      this.db
        .prepare("UPDATE image_meta SET thumbnail_path = ? WHERE data_id = ?")
        .run(thumbnailPath, dataId);
    } catch (error) {
      // 재생성 실패 시 썸네일 경로 제거
      this.db
        .prepare(
          "UPDATE image_meta SET thumbnail_path = NULL WHERE data_id = ?"
        )
        .run(dataId);
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "내부 오류",
        message: "썸네일 재생성 실패",
      });
    }
  }
  _createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clipboard (
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        format TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        CONSTRAINT clipboard_pk PRIMARY KEY (id),
        check(type IN ('img', 'txt'))
      );
      CREATE TABLE IF NOT EXISTS image_meta (
        data_id TEXT PRIMARY KEY,
        width INTEGER,
        height INTEGER,
        file_size INTEGER,
        file_path TEXT NOT NULL, 
        thumbnail_path TEXT,     
        FOREIGN KEY (data_id) REFERENCES clipboard(id) ON DELETE CASCADE
      );
    
      CREATE TABLE IF NOT EXISTS tag (
        tag_id TEXT PRIMARY KEY, 
        name TEXT NOT NULL COLLATE NOCASE,  -- 대소문자 구분 없음
        source TEXT NOT NULL CHECK (source IN ('auto', 'user')),
        UNIQUE (name, source)  
      );
      CREATE TABLE IF NOT EXISTS data_tag (
        data_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        CONSTRAINT data_tag_pk PRIMARY KEY (data_id,tag_id),
        CONSTRAINT data_tag_clipboard_FK_1 FOREIGN KEY (data_id) REFERENCES clipboard(id) ON DELETE CASCADE,
        CONSTRAINT data_tag_tag_FK_1 FOREIGN KEY (tag_id) REFERENCES tag(tag_id) ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS config(
        id INTEGER PRIMARY KEY CHECK (id = 1),
        local_limit INTEGER DEFAULT 30, 
        day_limit INTEGER DEFAULT 30,
        last_modified INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL,      
        data_id TEXT,
        op_args TEXT, 
        created_at INTEGER NOT NULL
      );

    `);
    this._initializeDefaultConfig();
  }
  _initializeDefaultConfig() {
    try {
      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO config (id) VALUES (1)
      `);
      insertStmt.run();
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "환경 변수 초기 설정 생성 실패",
        message: "initializeDeaultConfig 오류",
      });
    }
  }
  _createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clipboard_created ON clipboard(created_at);
      CREATE INDEX IF NOT EXISTS idx_tag_name ON tag(name);
      CREATE INDEX IF NOT EXISTS idx_data_tag ON data_tag(data_id, tag_id);
    `);
  }
  // FTS5 초기 설정
  setupFTS() {
    try {
      // FTS5 가상 테이블 생성
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS clipboard_fts USING fts5(
          data_id UNINDEXED,
          content,
          tags,
          format,
          tokenize = 'trigram'
        );
      `);

      // 기존 트리거 삭제 (재생성 방지)
      this.db.exec(`
        DROP TRIGGER IF EXISTS after_clipboard_insert;
        DROP TRIGGER IF EXISTS after_clipboard_update;
        DROP TRIGGER IF EXISTS after_clipboard_delete;
        DROP TRIGGER IF EXISTS after_data_tag_insert;
        DROP TRIGGER IF EXISTS after_data_tag_delete;
        DROP TRIGGER IF EXISTS after_tag_update;
      `);

      // 새 트리거 생성
      this.db.exec(`
        -- 항목 추가 시
        CREATE TRIGGER after_clipboard_insert AFTER INSERT ON clipboard
        BEGIN
          INSERT INTO clipboard_fts (data_id, content, tags, format)
          VALUES (
            new.id,
            CASE WHEN new.type = 'txt' THEN new.content ELSE '' END,
            (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
             JOIN data_tag dt ON t.tag_id = dt.tag_id WHERE dt.data_id = new.id),
            new.format
          );
        END;

        -- 항목 업데이트 시
        CREATE TRIGGER after_clipboard_update AFTER UPDATE ON clipboard
        BEGIN
          UPDATE clipboard_fts
          SET 
            content = CASE WHEN new.type = 'txt' THEN new.content ELSE '' END,
            tags = (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
                    JOIN data_tag dt ON t.tag_id = dt.tag_id WHERE dt.data_id = new.id),
            format = new.format
          WHERE data_id = old.id;
        END;

        -- 항목 삭제 시
        CREATE TRIGGER after_clipboard_delete AFTER DELETE ON clipboard
        BEGIN
          DELETE FROM clipboard_fts WHERE data_id = old.id;
        END;

        -- 태그 변경 시
        CREATE TRIGGER after_data_tag_insert AFTER INSERT ON data_tag
        BEGIN
          UPDATE clipboard_fts
          SET tags = (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
                    JOIN data_tag dt ON t.tag_id = dt.tag_id 
                    WHERE dt.data_id = new.data_id)
          WHERE data_id = new.data_id;
        END;

        CREATE TRIGGER after_data_tag_delete AFTER DELETE ON data_tag
        BEGIN
          UPDATE clipboard_fts
          SET tags = (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
                    JOIN data_tag dt ON t.tag_id = dt.tag_id 
                    WHERE dt.data_id = old.data_id)
          WHERE data_id = old.data_id;
        END;


        -- 태그 이름 변경 시
        CREATE TRIGGER after_tag_update AFTER UPDATE ON tag
        BEGIN
          UPDATE clipboard_fts
          SET tags = (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
                     JOIN data_tag dt ON t.tag_id = dt.tag_id 
                     WHERE dt.data_id IN (
                       SELECT data_id FROM data_tag WHERE tag_id = new.tag_id
                     ))
          WHERE data_id IN (
            SELECT data_id FROM data_tag WHERE tag_id = new.tag_id
          );
        END;
      `);

      // 기존 데이터 인덱싱 (초기 실행 시)
      this.db.exec(`
        INSERT INTO clipboard_fts (data_id, content, tags, format)
        SELECT 
          c.id,
          CASE WHEN c.type = 'txt' THEN c.content ELSE '' END,
          (SELECT GROUP_CONCAT(t.name, ' ') FROM tag t
           JOIN data_tag dt ON t.tag_id = dt.tag_id WHERE dt.data_id = c.id),
          c.format
        FROM clipboard c
        WHERE NOT EXISTS (SELECT 1 FROM clipboard_fts WHERE data_id = c.id);
      `);
    } catch (err) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "FTS5 생성 실패",
        message: err.message,
      });
    }
  }
  // FTS5 검색 메소드
  searchItems(query, options = {}) {
    try {
      // 검색 쿼리 정제
      // const cleanQuery = query
      //   .replace(/[^\w\s가-힣]/gi, " ") // 특수문자 제거
      //   .trim()
      //   .replace(/\s+/g, " "); // 중복 공백 제거
      const cleanQuery = query.trim().replace(/\s+/g, " ");

      if (!cleanQuery) return [];

      // FTS5 검색 쿼리 생성
      const ftsQuery = `
      SELECT fts.data_id
      FROM clipboard_fts fts
      JOIN clipboard c ON fts.data_id = c.id
      WHERE clipboard_fts MATCH ?
      ORDER BY bm25(clipboard_fts) DESC
      LIMIT ? OFFSET ?
    `;

      const stmt = this.db.prepare(ftsQuery);
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // 와일드카드 검색 지원
      const searchTerm = cleanQuery.includes(" ")
        ? `"${cleanQuery}"`
        : `${cleanQuery}*`;

      const ftsRows = stmt.all(searchTerm, limit, offset);
      const ftsIds = ftsRows.map((r) => r.data_id);

      const likePattern = `%${cleanQuery}%`;
      const fallbackStmt = this.db.prepare(`
          SELECT DISTINCT c.id
          FROM clipboard c
          LEFT JOIN data_tag dt ON c.id = dt.data_id
          LEFT JOIN tag t ON dt.tag_id = t.tag_id
          WHERE c.content LIKE ? OR t.name LIKE ?
          LIMIT ? OFFSET ?;
        `);
      const likeRows = fallbackStmt.all(
        likePattern,
        likePattern,
        limit,
        offset
      );
      const likeIds = likeRows.map((r) => r.id);

      const allIds = Array.from(new Set([...ftsIds, ...likeIds]));
      return allIds;
    } catch (err) {
      console.error("로컬 검색 실패:", err);
      return [];
    }
  }

  getAllClipboardWithMetaAndTags() {
    const stmt = this.db.prepare(`
      SELECT c.*, im.*, GROUP_CONCAT(t.name) as tag_names
      FROM clipboard c
      LEFT JOIN image_meta im ON c.id = im.data_id
      LEFT JOIN data_tag dt ON c.id = dt.data_id
      LEFT JOIN tag t ON dt.tag_id = t.tag_id
      GROUP BY c.id
    `);
    return stmt.all();
  }

  enqueuePendingSync({ op, data_id = null, op_args = {} }) {
    this.db
      .prepare(
        `
      INSERT INTO pending_sync (op, data_id, op_args, created_at)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(op, data_id, JSON.stringify(op_args), Math.floor(Date.now() / 1000));
  }

  getPendingSyncItems() {
    return this.db
      .prepare("SELECT * FROM pending_sync ORDER BY created_at ASC")
      .all();
  }

  clearPendingItem(id) {
    this.db.prepare("DELETE FROM pending_sync WHERE id = ?").run(id);
  }

  // 설정 조회
  getConfig() {
    try {
      return this.db
        .prepare(
          `
      SELECT local_limit, day_limit, last_modified
      FROM config
      WHERE id = 1
    `
        )
        .get();
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "설정 조회 실패",
        message: "설정 조회 실패. getconfig",
      });
    }
  }
  // 설정 업데이트 메서드
  updateConfig(newConfig) {
    console.log(newConfig);
    const tx = this.db.transaction((config) => {
      this.db
        .prepare(
          `
          UPDATE config
          SET 
            local_limit = COALESCE($local_limit, local_limit),
            day_limit = COALESCE($day_limit, day_limit),
            last_modified = $last_modified
          WHERE id = 1
        `
        )
        .run({
          local_limit: config.local_limit,
          day_limit: config.day_limit,
          last_modified: Math.floor(Date.now() / 1000), // 현재 시간으로 업데이트
        });
    });

    try {
      tx(newConfig);
      return { success: true, message: "설정이 업데이트 되었습니다" };
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "설정 업데이트트 실패",
        message: error.message || error,
      });
    }
  }

  // 클립보드 항목 추가
  insertClipboardItem(item) {
    console.log("insertClipboardItem params:", {
      format: item.format,
      id: item.id,
      content: item.content,
      created_at: item.created_at,
      typeof_created_at: typeof item.created_at,
    });
    item.created_at =
      item.created_at instanceof Date
        ? item.created_at.toISOString()
        : item.created_at;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO clipboard (id, type, format, content, created_at)
        VALUES (@id, @type, @format, @content, @created_at)
      `);
      stmt.run(item);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "클립보드 항목 삽입 실패",
        message: "insertClipboardItem",
      });
    }
  }
  delete(table, whereClause) {
    const keys = Object.keys(whereClause);
    const conditions = keys.map((k) => `${k} = ?`).join(" AND ");
    const stmt = this.db.prepare(`DELETE FROM ${table} WHERE ${conditions}`);
    stmt.run(...keys.map((k) => whereClause[k]));
  }

  //클립보드 항목 삭제
  deleteClipboardItem(id) {
    try {
      const meta = this.getImageMeta(id);

      // 이미지 파일이 존재하면 삭제
      if (meta) {
        if (meta.file_path && fs.existsSync(meta.file_path)) {
          fs.unlinkSync(meta.file_path);
          console.log(`이미지 파일 삭제됨: ${meta.file_path}`);
        }
        if (meta.thumbnail_path && fs.existsSync(meta.thumbnail_path)) {
          fs.unlinkSync(meta.thumbnail_path);
          console.log(`썸네일 파일 삭제됨: ${meta.thumbnail_path}`);
        }
      }
      const deleteChain = this.db.transaction((id) => {
        this.db.prepare("DELETE FROM clipboard WHERE id = ?").run(id);
      });

      deleteChain(id);
      console.log(`삭제 완료: ${id}`);
    } catch (error) {
      console.error(`삭제 실패: ${id}`, error);
      throw CCDError.create("E630", {
        module: "LocalDataModule",
        context: "deleteClipboardItem",
        message: `클립보드 항목 삭제 중 오류 발생 (id=${id})`,
        cause: error,
      });
    }
  }
  // 이미지 메타데이터 조회
  getImageMeta(dataId) {
    try {
      return this.db
        .prepare(
          `
        SELECT * FROM image_meta WHERE data_id = ?
      `
        )
        .get(dataId);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "이미지 메타데이터 조회 실패",
        message: "getImageMeta",
      });
    }
  }
  updateClipboardContent(id, newContent) {
    try {
      const stmt = this.db.prepare(`
        UPDATE clipboard SET content = ? WHERE id = ?
      `);
      stmt.run(newContent, id);
    } catch (err) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "클립보드 content 업데이트 실패",
        message: err.message || err,
      });
    }
  }

  // 이미지 메타 삽입
  insertImageMeta(meta) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO image_meta (data_id, width, height, file_size, file_path, thumbnail_path)
        VALUES (@data_id, @width, @height, @file_size, @file_path, @thumbnail_path)
      `);
      stmt.run(meta);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "이미지 메타 삽입 실패",
        message: error,
      });
    }
  }
  // 태그 삽입
  insertTag(tag) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO tag (tag_id, name, source)
        VALUES (@tag_id, @name, @source)
      `);
      stmt.run(tag);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "태그 삽입 실패",
        message: error,
      });
    }
  }

  // name과 source로 태그 조회
  getTagByNameAndSource(name, source) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tag 
        WHERE name = ? AND source = ?
        COLLATE NOCASE
      `);
      return stmt.get(name, source);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "태그 조회 실패",
        message: "getTagByNameAndSource",
      });
    }
  }
  // 태그 id 변경
  updateTagId(oldId, newId) {
    try {
      const tx = this.db.transaction((oldId, newId) => {
        // 기존 태그가 존재하는지 확인
        const existing = this.db
          .prepare(`SELECT * FROM tag WHERE tag_id = ?`)
          .get(oldId);
        if (!existing) {
          throw CCDError.create("E610", {
            module: "LocalData",
            context: `태그 ID 확인 실패`,
            message: `존재하지 않는 태그 ID: ${oldId}`,
          });
        }

        // 새로운 ID가 이미 존재하면 충돌이 발생하므로 예외 처리
        const conflict = this.db
          .prepare(`SELECT * FROM tag WHERE tag_id = ?`)
          .get(newId);
        if (conflict) {
          throw CCDError.create("E610", {
            module: "LocalData",
            context: `태그 ID 충돌`,
            message: `이미 존재하는 태그 ID: ${newId}`,
          });
        }

        // 먼저 태그 ID 변경
        this.db
          .prepare(
            `
        UPDATE tag SET tag_id = ? WHERE tag_id = ?
      `
          )
          .run(newId, oldId);
      });

      tx(oldId, newId);
      return {
        success: true,
        message: `Tag ID updated from ${oldId} to ${newId}`,
      };
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "태그 ID 변경 실패",
        message: error.message || "updateTagId. 태그 동기화 오류",
      });
    }
  }

  // 데이터-태그 연결
  insertDataTag(dataId, tagId) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO data_tag (data_id, tag_id)
        VALUES (?, ?)
      `);
      stmt.run(dataId, tagId);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "데이터-태그 연결 실패",
        message: error,
      });
    }
  }
  // 항목 조회
  getClipboardItem(id) {
    try {
      const item = this.db
        .prepare(`SELECT * FROM clipboard WHERE id = ?`)
        .get(id);
      if (!item) return null;

      // 이미지 메타데이터 조회
      const meta = this.db
        .prepare(`SELECT * FROM image_meta WHERE data_id = ?`)
        .get(id);

      // 이미지 항목인 경우 파일 존재 여부 확인
      if (item.type === "img" && meta) {
        const fileExists = fs.existsSync(meta.file_path);

        // 원본 이미지가 존재하지 않으면 데이터 정리
        if (!fileExists) {
          console.warn(`원본 이미지 누락: ${meta.file_path}`);
          this.deleteClipboardItem(id); // 데이터베이스에서 항목 삭제
          return null;
        }

        // 썸네일이 존재하지 않으면 재생성
        if (meta.thumbnail_path && !fs.existsSync(meta.thumbnail_path)) {
          console.warn(`썸네일 누락: ${meta.thumbnail_path}`);
          this.regenerateThumbnail(id, meta.file_path);
        }
      }

      const tags = this.db
        .prepare(
          `
        SELECT t.* FROM tag t
        JOIN data_tag dt ON t.tag_id = dt.tag_id
        WHERE dt.data_id = ?
      `
        )
        .all(id);

      return this.transformItem(item, meta, tags);
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "클립보드 아이템 조회 실패",
        message: "getClipboardItem",
      });
    }
  }

  // 변환 함수
  transformItem(item, imageMeta = null, tags = []) {
    return {
      ...item,
      imageMeta: imageMeta
        ? {
            ...imageMeta,
            originalUrl: `file://${imageMeta.file_path}`,
            thumbnailUrl: imageMeta.thumbnail_path
              ? `file://${imageMeta.thumbnail_path}`
              : null,
          }
        : null,
      tags: tags || [],
    };
  }

  // 이미지 메타데이터 조회
  getImageMeta(dataId) {
    return this.db
      .prepare(
        `
      SELECT * FROM image_meta WHERE data_id = ?
    `
      )
      .get(dataId);
  }
  // 최대 항목 수 제한 적용
  enforceMaxClipboardItems(maxItems) {
    try {
      const countRow = this.db
        .prepare("SELECT COUNT(*) as count FROM clipboard")
        .get();

      if (countRow.count > maxItems) {
        const deleteCount = countRow.count - maxItems;

        const idsToDelete = this.db
          .prepare(
            `
            SELECT id FROM clipboard
            ORDER BY created_at ASC
            LIMIT ?
          `
          )
          .all(deleteCount)
          .map((row) => row.id);

        this.db
          .prepare(
            `DELETE FROM clipboard WHERE id IN (${idsToDelete
              .map(() => "?")
              .join(",")})`
          )
          .run(...idsToDelete);

        return idsToDelete;
      }

      return [];
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "최대 항목 수 제한 실패",
        message: "enforceMaxClipboardItems",
      });
    }
  }

  // 지정 일수 이상된 데이터 삭제
  deleteOldClipboardItems(retentionDays) {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;

      const idsToDelete = this.db
        .prepare(
          `
          SELECT id FROM clipboard
          WHERE created_at < ?
        `
        )
        .all(cutoff)
        .map((row) => row.id);

      this.db
        .prepare(
          `DELETE FROM clipboard WHERE id IN (${idsToDelete
            .map(() => "?")
            .join(",")})`
        )
        .run(...idsToDelete);

      return idsToDelete;
    } catch (error) {
      throw CCDError.create("E610", {
        module: "LocalData",
        context: "오래된 데이터 삭제 실패",
        message: "deleteOldClipboardItems",
      });
    }
  }
}

const localDataInstance = new LocalDataModule();
module.exports = localDataInstance;
