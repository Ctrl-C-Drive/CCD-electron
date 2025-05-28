const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const fs = require("fs-extra");
const sharp = require("sharp");

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
      console.error("Database initialization failed:", error);
      throw error;
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
      console.error("이미지 파일 정리 실패:", error);
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

      console.log(`썸네일 재생성 완료: ${thumbnailPath}`);
    } catch (error) {
      console.error(`썸네일 재생성 실패 (${dataId}):`, error);
      // 재생성 실패 시 썸네일 경로 제거
      this.db
        .prepare(
          "UPDATE image_meta SET thumbnail_path = NULL WHERE data_id = ?"
        )
        .run(dataId);
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
        shared TEXT NOT NULL CHECK (shared IN ('cloud', 'local')) DEFAULT ('local'),
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
        sync_status TEXT CHECK (sync_status IN ('synced', 'pending')) DEFAULT ('pending'),  
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
      console.error("초기 설정 생성 실패:", error);
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
        DROP TRIGGER IF EXISTS after_data_tag_change;
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
      console.error("FTS5 설정 실패:", err);
    }
  }
  // FTS5 검색 메소드
  searchItems(query, options = {}) {
    try {
      // 검색 쿼리 정제
      const cleanQuery = query
        .replace(/[^\w\s가-힣]/gi, " ") // 특수문자 제거
        .trim()
        .replace(/\s+/g, " "); // 중복 공백 제거

      if (!cleanQuery) return [];

      // FTS5 검색 쿼리 생성
      const ftsQuery = `
        SELECT 
          fts.data_id,
          snippet(clipboard_fts, 0, '', '', '...', 16) as snippet,
          bm25(clipboard_fts) as score,
          c.*,
          im.*,
          GROUP_CONCAT(t.tag_id) as tag_ids
        FROM clipboard_fts fts
        JOIN clipboard c ON fts.data_id = c.id
        LEFT JOIN image_meta im ON c.id = im.data_id
        LEFT JOIN data_tag dt ON c.id = dt.data_id
        LEFT JOIN tag t ON dt.tag_id = t.tag_id
        WHERE clipboard_fts MATCH ?
        GROUP BY c.id
        ORDER BY score ${options.sortByScore ? "DESC" : "ASC"}
        LIMIT ? OFFSET ?
      `;

      const stmt = this.db.prepare(ftsQuery);
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // 와일드카드 검색 지원
      const searchTerm = cleanQuery.includes(" ")
        ? `"${cleanQuery}"`
        : `${cleanQuery}*`;

      return stmt.all(searchTerm, limit, offset).map((row) => ({
        ...row,
        tags: row.tag_ids
          ? row.tag_ids.split(",").map((tag_id) => ({ tag_id }))
          : [],
        // 검색 스니펫 하이라이팅
        highlight: row.snippet,
      }));
    } catch (err) {
      console.error("로컬 검색 실패:", err);
      return [];
    }
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
      throw this.handleError(error, "설정 조회 실패");
    }
  }
  // 설정 업데이트 메서드
  updateConfig(newConfig) {
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
      throw this.handleError(error, "설정 업데이트 실패");
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
        INSERT INTO clipboard (id, type, format, content, created_at, shared)
        VALUES (@id, @type, @format, @content, @created_at, @shared)
      `);
      stmt.run(item);
    } catch (error) {
      throw this.handleError(error, "클립보드 항목 삽입 실패");
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
    const deleteChain = this.db.transaction((id) => {
      this.db.prepare("DELETE FROM clipboard WHERE id = ?").run(id);
    });
    deleteChain(id);
    console.log(`삭제 완료: ${id}`);
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
      throw this.handleError(error, "이미지 메타데이터 조회 실패");
    }
  }

  // 이미지 메타 삽입
  insertImageMeta(meta) {
    console.log(meta.data_id);
    try {
      const stmt = this.db.prepare(`
        INSERT INTO image_meta (data_id, width, height, file_size, file_path, thumbnail_path)
        VALUES (@data_id, @width, @height, @file_size, @file_path, @thumbnail_path)
      `);
      stmt.run(meta);
    } catch (error) {
      throw this.handleError(error, "이미지 메타 삽입 실패");
    }
  }
  // 태그 삽입
  insertTag(tag) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO tag (tag_id, name, source, sync_status)
        VALUES (@tag_id, @name, @source, @sync_status)
      `);
      stmt.run(tag);
    } catch (error) {
      throw this.handleError(error, "태그 삽입 실패");
    }
  }
  // 태그 동기화 상태 변경
  updateTagSyncStatus(tagId, newStatus) {
    try {
      if (!["synced", "pending"].includes(newStatus)) {
        throw new Error("sync_status는 'synced' 또는 'pending'만 허용됩니다.");
      }

      const stmt = this.db.prepare(`
      UPDATE tag SET sync_status = ? WHERE tag_id = ?
    `);
      const result = stmt.run(newStatus, tagId);

      if (result.changes === 0) {
        throw new Error(`tag_id ${tagId}에 해당하는 태그가 존재하지 않습니다.`);
      }

      return {
        success: true,
        message: `태그(${tagId})의 sync_status가 '${newStatus}'로 변경되었습니다.`,
      };
    } catch (error) {
      throw this.handleError(error, "태그 동기화 상태 변경 실패");
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
      throw this.handleError(error, "태그 조회 실패");
    }
  }
  //태그 id 변경
  updateTagId(oldId, newId) {
    try {
      const tx = this.db.transaction((oldId, newId) => {
        // 기존 태그가 존재하는지 확인
        const existing = this.db
          .prepare(`SELECT * FROM tag WHERE tag_id = ?`)
          .get(oldId);
        if (!existing) throw new Error(`Tag with ID ${oldId} does not exist`);

        // 새로운 ID가 이미 존재하면 충돌이 발생하므로 예외 처리
        const conflict = this.db
          .prepare(`SELECT * FROM tag WHERE tag_id = ?`)
          .get(newId);
        if (conflict) throw new Error(`Tag with ID ${newId} already exists`);

        // 먼저 태그 ID 변경
        this.db
          .prepare(
            `
          UPDATE tag SET tag_id = ? WHERE tag_id = ?
        `
          )
          .run(newId, oldId);

        // 연결된 data_tag도 ID 변경
        this.db
          .prepare(
            `
          UPDATE data_tag SET tag_id = ? WHERE tag_id = ?
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
      throw this.handleError(error, "태그 ID 변경 실패");
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
      throw this.handleError(error, "데이터-태그 연결 실패");
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
      throw this.handleError(error, "클립보드 아이템 조회 실패");
    }
  }
  // 공통 에러 핸들러
  handleError(error, defaultMessage) {
    console.error(error);
    return {
      code: "E500",
      message: defaultMessage,
      details: error.message,
    };
  }

  // 변환 함수 (CloudDataModule과 일관되게)
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
  // 공유 상태 업데이트
  updateSharedStatus(id, shared) {
    const stmt = this.db.prepare(`
      UPDATE clipboard SET shared = ? WHERE id = ?
    `);
    stmt.run(shared, id);
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
        this.db
          .prepare(
            `
          DELETE FROM clipboard 
          WHERE id IN (
            SELECT id FROM clipboard 
            ORDER BY created_at ASC 
            LIMIT ?
          )
        `
          )
          .run(deleteCount);
      }
    } catch (error) {
      throw this.handleError(error, "최대 항목 수 제한 실패");
    }
  }

  // 지정 일수 이상된 데이터 삭제
  deleteOldClipboardItems(retentionDays) {
    try {
      console.log("data deleted");
      const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
      this.db
        .prepare(
          `
        DELETE FROM clipboard 
        WHERE created_at < ?
      `
        )
        .run(cutoff);
    } catch (error) {
      throw this.handleError(error, "오래된 데이터 삭제 실패");
    }
  }
}

module.exports = LocalDataModule;
