import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = process.env.DB_PATH ?? "./data/skillforge.db";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.exec("PRAGMA journal_mode=WAL;");
  _db.exec("PRAGMA foreign_keys=ON;");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database): void {
  const schemaPath = join(import.meta.dir, "../schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

// Generic query helpers
export function queryAll<T>(sql: string, params: SQLQueryBindings[] = []): T[] {
  return getDb().query(sql).all(...params) as T[];
}

export function queryOne<T>(sql: string, params: SQLQueryBindings[] = []): T | null {
  return (getDb().query(sql).get(...params) as T) ?? null;
}

export function execute(sql: string, params: SQLQueryBindings[] = []): void {
  getDb().query(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}
