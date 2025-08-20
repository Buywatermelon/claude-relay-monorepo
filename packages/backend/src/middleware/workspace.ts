import { createMiddleware } from 'hono/factory'
import { WorkspaceService } from '../services/workspace/workspace.service'
import type { AuthUser } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'
import { AuthError, ValidationError, ResourceNotFoundError } from '../utils/errors'

type MemberRole = Database['public']['Tables']['workspace_members']['Row']['role'];
type Workspace = Database['public']['Tables']['workspaces']['Row'];

// 扩展 Hono Context
declare module 'hono' {
  interface ContextVariableMap {
    workspace: Workspace
    workspaceId: string
    memberRole: MemberRole
  }
}

const workspaceService = new WorkspaceService()

/**
 * 工作空间成员验证中间件
 * 从 header 中获取工作空间 slug，验证用户是否为成员，并注入成员角色信息
 * 
 * 使用方式：
 * - 必须在 requireAuth 中间件之后使用
 * - 客户端需要在请求 header 中提供 X-Workspace-Slug
 * 
 * 示例：
 * ```ts
 * // 客户端请求
 * fetch('/api/projects', {
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'X-Workspace-Slug': 'ws-abc123'
 *   }
 * })
 * ```
 */
export const requireWorkspaceMember = createMiddleware(async (c, next) => {
  // 1. 获取用户信息（由 auth 中间件注入）
  const user = c.get('user') as AuthUser | undefined
  if (!user) {
    throw new AuthError('未认证用户')
  }

  // 2. 从 header 中获取工作空间 slug
  const workspaceSlug = c.req.header('X-Workspace-Slug')
  
  if (!workspaceSlug) {
    throw new ValidationError('缺少工作空间标识，请在请求头中提供 X-Workspace-Slug')
  }

  // 3. 查询工作空间（getWorkspace 方法会自动判断是 slug 还是 id）
  const workspaceWithRole = await workspaceService.getWorkspace(workspaceSlug, user.id)
  
  if (!workspaceWithRole) {
    throw new ResourceNotFoundError('工作空间不存在')
  }

  // 4. 验证用户是否为活跃成员
  if (!workspaceWithRole.role || workspaceWithRole.membershipStatus !== 'active') {
    throw new AuthError('您不是该工作空间的成员')
  }

  // 5. 将工作空间信息注入到 context
  const workspace: Workspace = {
    id: workspaceWithRole.id,
    name: workspaceWithRole.name,
    slug: workspaceWithRole.slug,
    description: workspaceWithRole.description,
    join_code: workspaceWithRole.join_code,
    settings: workspaceWithRole.settings,
    created_by: workspaceWithRole.created_by,
    created_at: workspaceWithRole.created_at,
    updated_at: workspaceWithRole.updated_at
  }
  
  c.set('workspace', workspace)
  c.set('workspaceId', workspace.id)
  c.set('memberRole', workspaceWithRole.role)
  
  await next()
})

