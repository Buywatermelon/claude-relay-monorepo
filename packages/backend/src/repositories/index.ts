/**
 * Repository 层统一导出
 */

// 基础类
export { BaseRepository } from './base-repository';

// 认证相关
export { UserRepository } from './auth/user-repository';
export { SessionRepository } from './auth/session-repository';
export { AuditRepository } from './auth/audit-repository';

// 权限相关
export { RoleRepository } from './permission/role-repository';
export { PermissionRepository } from './permission/permission-repository';

// 供应商相关
export { ProviderRepository } from './provider/provider-repository';
export { ModelRepository } from './provider/model-repository';
export { RouteConfigRepository } from './provider/route-config-repository';

// 创建 Repository 实例的工厂函数
import { getDatabase } from '../database/init';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

import { UserRepository } from './auth/user-repository';
import { SessionRepository } from './auth/session-repository';
import { AuditRepository } from './auth/audit-repository';
import { RoleRepository } from './permission/role-repository';
import { PermissionRepository } from './permission/permission-repository';

/**
 * Repository 管理器
 * 提供所有 Repository 的单例实例
 */
export class RepositoryManager {
  private static instance: RepositoryManager;
  private db: BetterSQLite3Database<typeof schema>;
  
  private userRepo?: UserRepository;
  private sessionRepo?: SessionRepository;
  private roleRepo?: RoleRepository;
  private permissionRepo?: PermissionRepository;
  private auditRepo?: AuditRepository;

  private constructor() {
    this.db = getDatabase();
  }

  static getInstance(): RepositoryManager {
    if (!RepositoryManager.instance) {
      RepositoryManager.instance = new RepositoryManager();
    }
    return RepositoryManager.instance;
  }

  getUserRepository(): UserRepository {
    if (!this.userRepo) {
      this.userRepo = new UserRepository(this.db);
    }
    return this.userRepo;
  }

  getSessionRepository(): SessionRepository {
    if (!this.sessionRepo) {
      this.sessionRepo = new SessionRepository(this.db);
    }
    return this.sessionRepo;
  }

  getRoleRepository(): RoleRepository {
    if (!this.roleRepo) {
      this.roleRepo = new RoleRepository(this.db);
    }
    return this.roleRepo;
  }

  getPermissionRepository(): PermissionRepository {
    if (!this.permissionRepo) {
      this.permissionRepo = new PermissionRepository(this.db);
    }
    return this.permissionRepo;
  }

  getAuditRepository(): AuditRepository {
    if (!this.auditRepo) {
      this.auditRepo = new AuditRepository(this.db);
    }
    return this.auditRepo;
  }

  /**
   * 获取数据库实例（用于事务操作）
   */
  getDatabase(): BetterSQLite3Database<typeof schema> {
    return this.db;
  }
}