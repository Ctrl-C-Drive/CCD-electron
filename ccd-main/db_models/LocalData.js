const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");
const crypto = require("crypto");

class LocalDataModule {
  constructor() {
    this.dbPath = path.join(app.getPath("userData"), "clipboard-manager.db");
    // this.encryptionKey = "secure-key-1234"; // 실제 배포 시 환경변수로 관리
    this.db = null;
    this._initialize();
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
      this.delete("data_tag", { data_id: id });
      this.delete("image_meta", { data_id: id });
      this.delete("clipboard", { id: id });
    });
    deleteChain(id);
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
      const meta = this.db
        .prepare(`SELECT * FROM image_meta WHERE data_id = ?`)
        .get(id);
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
