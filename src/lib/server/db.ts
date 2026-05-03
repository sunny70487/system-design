import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.SD_DB_PATH) return process.env.SD_DB_PATH;
  return join(process.cwd(), 'data', 'generated.db');
}

function migrate(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS generated_questions (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_json TEXT NOT NULL,
      diagrams_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_questions_created_at
      ON generated_questions(created_at DESC);
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  const path = resolveDbPath();
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const conn = new Database(path);
  if (path !== ':memory:') {
    conn.pragma('journal_mode = WAL');
  }
  conn.pragma('foreign_keys = ON');
  migrate(conn);
  db = conn;
  return db;
}
