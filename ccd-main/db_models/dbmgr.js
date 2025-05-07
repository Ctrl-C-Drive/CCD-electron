const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "app.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
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

// Clipboard 관련 함수
function addClipboard(type, format, content) {
  const id = uuidv4();
  const stmt = db.prepare(
    "INSERT INTO clipboard (id, type, format, content, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(id, type, format, content, Date.now());
  return id;
}
function getAllClipboard() {
  return db.prepare("SELECT * FROM clipboard ORDER BY created_at DESC").all();
}

function addImageMeta(data_id, meta) {
  const stmt = db.prepare(
    `INSERT INTO image_meta 
     (data_id, width, height, file_size, file_path, thumbnail_path)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    data_id,
    meta.width,
    meta.height,
    meta.file_size,
    meta.file_path,
    meta.thumbnail_path
  );
}

// Tag 관련 함수
function addTag(name, source) {
  const gb_id = uuidv4();
  const stmt = db.prepare(
    "INSERT INTO tag (gb_id, name, source) VALUES (?, ?, ?)"
  );
  stmt.run(gb_id, name, source);
  return { gb_id, name, source };
}

function deleteTag(gb_id) {
  return db.prepare("DELETE FROM tag WHERE gb_id = ?").run(gb_id);
}
// data_tag 연동 함수
function linkTagToData(data_id, tag_id) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO data_tag (data_id, tag_id) VALUES (?, ?)"
  );
  stmt.run(data_id, tag_id);
}
function unlinkTagFromData(data_id, tag_id) {
  const stmt = db.prepare(
    "DELETE FROM data_tag WHERE data_id = ? AND tag_id = ?"
  );
  stmt.run(data_id, tag_id);
}

module.exports = {
  addClipboard,
  getAllClipboard,
  addImageMeta,
  addTag,
  deleteTag,
  linkTagToData,
  unlinkTagFromData,
};
