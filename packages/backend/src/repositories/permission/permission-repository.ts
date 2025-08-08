/**
 * 权限管理数据访问层
 */

import { eq, and } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { 
  permissions, 
  users,
  userRoles,
  rolePermissions,
  userPermissions,
  type Permission 
} from '../../database/schema';

export class PermissionRepository extends BaseRepository {
  /**
   * 获取用户的所有权限（角色权限 + 直接权限）
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // 首先检查是否为超级管理员
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user[0]?.isSuperAdmin) {
      // 超级管理员拥有所有权限
      return this.db.select().from(permissions);
    }
    
    // 获取角色权限
    const rolePerms = await this.db
      .selectDistinct({
        permission: permissions
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));
    
    // 获取直接权限
    const directPerms = await this.db
      .select({
        permission: permissions
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId));
    
    // 合并并去重
    const allPerms = [...rolePerms, ...directPerms];
    const uniquePerms = new Map<string, Permission>();
    
    allPerms.forEach(item => {
      uniquePerms.set(item.permission.id, item.permission);
    });
    
    return Array.from(uniquePerms.values());
  }

  /**
   * 检查用户是否拥有特定权限
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // 检查是否为超级管理员
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user[0]?.isSuperAdmin) {
      return true;
    }
    
    // 获取用户的所有权限
    const userPerms = await this.getUserPermissions(userId);
    
    // 检查是否有匹配的权限
    return userPerms.some(p => p.resource === resource && p.action === action);
  }
}