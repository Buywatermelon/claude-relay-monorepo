/**
 * 数据库初始化模块
 * 使用 push 模式，适合快速开发
 */

import { Database } from 'bun:sqlite';
import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let dbInstance: BunSQLiteDatabase<typeof schema> | null = null;
let sqliteInstance: Database | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): BunSQLiteDatabase<typeof schema> {
  if (!dbInstance) {
    initDatabase();
  }
  return dbInstance!;
}

/**
 * 初始化数据库
 */
export function initDatabase(): BunSQLiteDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  // 确定数据库路径
  const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'auth.db');
  const dbDir = path.dirname(dbPath);

  // 确保数据目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`📁 初始化数据库: ${dbPath}`);

  // 创建 SQLite 连接
  sqliteInstance = new Database(dbPath);
  
  // 优化 SQLite 性能
  sqliteInstance.exec('PRAGMA journal_mode = WAL'); // 写前日志模式，提高并发性能
  sqliteInstance.exec('PRAGMA foreign_keys = ON');  // 启用外键约束
  sqliteInstance.exec('PRAGMA busy_timeout = 5000'); // 设置忙等待超时

  // 创建 Drizzle 实例
  dbInstance = drizzle(sqliteInstance, { schema });

  console.log('✅ 数据库初始化成功');
  
  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
    console.log('📴 数据库连接已关闭');
  }
}

/**
 * 获取原始 SQLite 实例（用于特殊操作）
 */
export function getSQLiteInstance(): Database | null {
  return sqliteInstance;
}

// 导出 schema 和类型
export * from './schema';
export type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';