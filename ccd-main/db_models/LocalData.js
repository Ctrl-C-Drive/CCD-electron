const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");
const crypto = require("crypto");
db.pragma("foreign_keys = ON");

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(app.getPath("userData"), "clipboard-manager.db");
    // this.encryptionKey = "secure-key-1234"; // 실제 배포 시 환경변수로 관리
    this.db = null;
  }
  initialize() {
    try {
      this.db = new Database(this.dbPath);
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
  //   const keyBuffer = crypto
  //     .createHash("sha256")
  //     .update(this.encryptionKey)
  //     .digest();
  //   this.db.pragma(`key='${keyBuffer.toString("hex")}'`);
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
        CONSTRAINT data_tag_tag_FK_1 FOREIGN KEY (tag_id) REFERENCES tag(gb_id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  }
  _createIndexes() {
    this.db.exec(`
    `);
  }
  create(tableName, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${tableName} (${keys.join(
        ", "
      )}) VALUES (${placeholders})`;
      const stmt = this.db.prepare(sql);
      stmt.run(...values);
      return { ...data };
    } catch (err) {
      console.error(`Create Error (${tableName}):`, err);
      throw { code: "E654", message: "데이터 생성 실패" };
    }
  }

  read(tableName, condition = {}) {
    try {
      const keys = Object.keys(condition);
      const values = Object.values(condition);
      const whereClause =
        keys.length > 0
          ? "WHERE " + keys.map((key) => `${key} = ?`).join(" AND ")
          : "";
      const sql = `SELECT * FROM ${tableName} ${whereClause}`;
      return this.db.prepare(sql).all(...values);
    } catch (err) {
      console.error(`Read Error (${tableName}):`, err);
      throw { code: "E655", message: "데이터 조회 실패" };
    }
  }

  update(tableName, condition, data) {
    try {
      const setClause = Object.keys(data)
        .map((k) => `${k} = ?`)
        .join(", ");
      const whereClause = Object.keys(condition)
        .map((k) => `${k} = ?`)
        .join(" AND ");
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
      const stmt = this.db.prepare(sql);
      stmt.run(...[...Object.values(data), ...Object.values(condition)]);
      return { ...condition, ...data };
    } catch (err) {
      console.error(`Update Error (${tableName}):`, err);
      throw { code: "E656", message: "데이터 수정 실패" };
    }
  }

  delete(tableName, condition) {
    try {
      const keys = Object.keys(condition);
      const values = Object.values(condition);
      const whereClause = keys.map((key) => `${key} = ?`).join(" AND ");
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      const result = this.db.prepare(sql).run(...values);
      return result.changes;
    } catch (err) {
      console.error(`Delete Error (${tableName}):`, err);
      throw { code: "E650", message: "데이터 삭제 실패" };
    }
  }
}
