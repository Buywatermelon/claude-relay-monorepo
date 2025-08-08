/**
 * Drizzle ORM Schema 定义
 * 用于用户认证和权限管理系统
 */

import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// 用户表
// ============================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isSuperAdmin: integer('is_super_admin', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  lastLoginAt: text('last_login_at'),
  loginCount: integer('login_count').default(0)
}, (table) => [
  index('idx_users_username').on(table.username),
  index('idx_users_email').on(table.email),
  index('idx_users_active').on(table.isActive)
]);

// ============================================
// 角色表
// ============================================
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP')
}, (table) => [
  index('idx_roles_name').on(table.name),
  index('idx_roles_system').on(table.isSystem)
]);

// ============================================
// 权限表
// ============================================
export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
}, (table) => [
  index('idx_permissions_resource').on(table.resource),
  index('idx_permissions_action').on(table.action),
  uniqueIndex('idx_permissions_resource_action').on(table.resource, table.action)
]);

// ============================================
// 用户-角色关联表
// ============================================
export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at').default('CURRENT_TIMESTAMP'),
  assignedBy: text('assigned_by').references(() => users.id, { onDelete: 'set null' })
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
  index('idx_user_roles_user').on(table.userId),
  index('idx_user_roles_role').on(table.roleId)
]);

// ============================================
// 角色-权限关联表
// ============================================
export const rolePermissions = sqliteTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedAt: text('granted_at').default('CURRENT_TIMESTAMP')
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
  index('idx_role_permissions_role').on(table.roleId),
  index('idx_role_permissions_permission').on(table.permissionId)
]);

// ============================================
// 用户直接权限表
// ============================================
export const userPermissions = sqliteTable('user_permissions', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedAt: text('granted_at').default('CURRENT_TIMESTAMP'),
  grantedBy: text('granted_by').references(() => users.id, { onDelete: 'set null' })
}, (table) => [
  primaryKey({ columns: [table.userId, table.permissionId] }),
  index('idx_user_permissions_user').on(table.userId),
  index('idx_user_permissions_permission').on(table.permissionId)
]);

// ============================================
// 会话表
// ============================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  lastAccessedAt: text('last_accessed_at').default('CURRENT_TIMESTAMP')
}, (table) => [
  index('idx_sessions_user').on(table.userId),
  index('idx_sessions_token').on(table.tokenHash),
  index('idx_sessions_expires').on(table.expiresAt)
]);

// ============================================
// 审计日志表
// ============================================
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  details: text('details'), // JSON 字符串
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
}, (table) => [
  index('idx_audit_user').on(table.userId),
  index('idx_audit_action').on(table.action),
  index('idx_audit_created').on(table.createdAt),
  index('idx_audit_resource').on(table.resourceType, table.resourceId)
]);

// ============================================
// 关系定义
// ============================================

// 用户关系
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  sessions: many(sessions),
  auditLogs: many(auditLogs)
}));

// 角色关系
export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions)
}));

// 权限关系
export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions)
}));

// 用户角色关系
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id]
  })
}));

// 角色权限关系
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id]
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  })
}));

// 用户权限关系
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id]
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id]
  }),
  grantedByUser: one(users, {
    fields: [userPermissions.grantedBy],
    references: [users.id]
  })
}));

// 会话关系
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

// 审计日志关系
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

// 导出类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;