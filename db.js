/**
 * db.js — SQLite connection and schema initialisation.
 *
 * The schema matches Section 6 of the assignment specification.
 * user_id is TEXT because it stores the GitHub numeric user ID as a string,
 * taken from the verified JWT (never from the browser).
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'capsules.db');
const db = new Database(dbPath);

// Recommended for durability + concurrent reads
db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      prompt_title TEXT NOT NULL,
      prompt_version TEXT,
      prompt_text TEXT NOT NULL,
      response_summary TEXT,
      category TEXT,
      usefulness TEXT,
      reviewed INTEGER DEFAULT 0,
      improved INTEGER DEFAULT 0,
      screenshot_url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Speeds up "list only this user's records", which is every READ we do.
  db.exec(`CREATE INDEX IF NOT EXISTS idx_capsules_user ON capsules(user_id);`);

  console.log(`[db] SQLite ready at ${dbPath}`);
}

module.exports = { db, initDb };
