import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'agentflow.db');

let sqliteDb = null;
let pgPool = null;
let dbType = 'sqlite';

export function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    console.log('🔌 Connecting to PostgreSQL database...');
    pgPool = new pg.Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    dbType = 'postgres';
  } else {
    console.log('🔌 Connecting to SQLite database...');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    dbType = 'sqlite';
  }

  // Create tables using standard SQL compatible with both SQLite and Postgres
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      workflow_json TEXT NOT NULL DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      input_data TEXT DEFAULT '{}',
      output_data TEXT DEFAULT '',
      logs TEXT DEFAULT '[]',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // SQLite doesn't support multiple statements in a single run call sometimes, but db.exec does.
  // Postgres pgPool.query supports multiple statements.
  if (dbType === 'postgres') {
    pgPool.query(schema)
      .then(() => console.log('✅ PostgreSQL database initialized successfully'))
      .catch(err => console.error('❌ Failed to initialize PostgreSQL database:', err));
  } else {
    sqliteDb.exec(schema);
    console.log('✅ SQLite database initialized successfully');
  }
}

/**
 * Normalizes SQL queries and parameters between SQLite (?) and PostgreSQL ($1, $2, etc.)
 */
export async function query(sql, params = []) {
  if (dbType === 'postgres') {
    let index = 1;
    // Replace ? placeholders with $1, $2...
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    // Determine if query is reading or writing
    const isSelect = sql.trim().toLowerCase().startsWith('select');
    if (isSelect) {
      return stmt.all(...params);
    } else {
      const info = stmt.run(...params);
      return info;
    }
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  if (dbType === 'postgres') {
    return rows[0] || null;
  } else {
    // If it was a write query, return info
    if (rows && !Array.isArray(rows)) return rows;
    return rows[0] || null;
  }
}

export { dbType };
export default { query, queryOne, initializeDatabase, dbType };
