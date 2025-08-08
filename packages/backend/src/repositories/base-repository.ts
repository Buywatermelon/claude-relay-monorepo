/**
 * 基础 Repository 类
 * 提供通用的数据库操作接口
 */

import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

export abstract class BaseRepository {
  constructor(protected db: BetterSQLite3Database<typeof schema>) {}

  /**
   * 获取数据库实例（用于事务等特殊操作）
   */
  protected getDb() {
    return this.db;
  }
}