/**
 * 数据库迁移脚本
 * 使用 drizzle-kit push 来同步数据库结构
 */

import { sql } from 'drizzle-orm';
import { getDatabase, closeDatabase } from './init';
import * as schema from './schema';

async function migrate() {
  console.log('🔄 开始数据库迁移...');
  
  try {
    const db = getDatabase();
    
    // 创建所有表
    console.log('📊 创建数据库表...');
    
    // 使用原生 SQL 创建表（适用于 SQLite）
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_super_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT,
        login_count INTEGER DEFAULT 0
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER DEFAULT (unixepoch() * 1000),
        last_accessed_at INTEGER DEFAULT (unixepoch() * 1000),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(resource, action)
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        assigned_by TEXT,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        granted_by TEXT,
        PRIMARY KEY (user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // 创建索引
    console.log('🔍 创建索引...');
    
    // Users 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`);
    
    // Sessions 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
    
    // Roles 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system)`);
    
    // Permissions 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action)`);
    
    // User Roles 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)`);
    
    // Role Permissions 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)`);
    
    // User Permissions 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id)`);
    
    // Audit Logs 索引
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)`);
    
    console.log('✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  } finally {
    closeDatabase();
  }
}

// 如果直接执行此脚本
if (require.main === module) {
  migrate().catch(console.error);
}

export { migrate };