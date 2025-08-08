/**
 * 角色管理数据访问层
 */

import { eq, and } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { roles, userRoles, type Role } from '../../database/schema';
import { ResourceNotFoundError } from '../../utils/errors';
import { generateId } from '../../utils/auth';

export class RoleRepository extends BaseRepository {
  /**
   * 获取用户的所有角色
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const result = await this.db
      .select({
        role: roles
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    
    return result.map(r => r.role);
  }

  /**
   * 分配角色给用户
   */
  async assignRole(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    // 检查角色是否存在
    const role = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    
    if (role.length === 0) {
      throw new ResourceNotFoundError('角色不存在');
    }
    
    // 分配角色（如果已存在则忽略）
    await this.db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        assignedBy
      })
      .onConflictDoNothing()
      .run();
  }

  /**
   * 移除用户角色
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const result = await this.db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId)
        )
      );
    
    if (result.changes === 0) {
      throw new ResourceNotFoundError('用户未分配该角色');
    }
  }
}