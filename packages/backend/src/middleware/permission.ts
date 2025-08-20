import { createMiddleware } from 'hono/factory';
import { PermissionService } from '../services/permission/permission.service';
import { buildAbility, type AppActions, type AppSubjects, type AppAbility } from '../lib/abilities';
import type { Tables } from '../lib/database.types';

type MemberRole = Tables<'workspace_members'>['role'];

// 扩展 Hono Context
declare module 'hono' {
  interface ContextVariableMap {
    ability: AppAbility;
    permissions: Tables<'permissions'>[];
  }
}

const permissionService = new PermissionService();

/**
 * 权限验证中间件
 * 
 * 使用方式：
 * - 必须在 requireAuth 和 requireWorkspaceMember 中间件之后使用
 * - 检查用户是否有执行特定操作的权限
 * 
 * @param action - 要执行的动作
 * @param subject - 操作的对象
 */
export const requirePermission = (action: AppActions, subject: AppSubjects) => {
  return createMiddleware(async (c, next) => {
    // 1. 获取用户角色（由 workspace 中间件注入）
    const memberRole = c.get('memberRole') as MemberRole | undefined;
    
    if (!memberRole) {
      return c.json({ error: '无法获取用户角色信息' }, 403);
    }

    // 2. 获取角色对应的权限
    const permissions = await permissionService.getRolePermissions(memberRole);
    
    // 3. 构建 CASL Ability
    const ability = buildAbility(permissions);
    
    // 4. 检查权限
    if (!ability.can(action, subject)) {
      return c.json({ 
        error: '权限不足',
        details: `您没有执行 ${action} ${subject} 的权限`
      }, 403);
    }

    // 5. 将 ability 和权限列表注入 context，供后续使用
    c.set('ability', ability);
    c.set('permissions', permissions);
    
    await next();
  });
};