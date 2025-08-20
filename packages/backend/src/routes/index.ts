/**
 * Routes 层统一导出
 * 提供所有路由模块的集中访问点
 */

import { Hono } from 'hono'
import { memberRoutes } from './api/members'
import { providers } from './api/providers'
import { requireAuth } from '../middleware/auth'
import { requireWorkspaceMember } from '../middleware/workspace'
import type { Bindings } from '../types/env'

// 导出所有路由
export { adminRoutes } from './admin'
export { claudeRoutes } from './proxy'
export { authRoutes } from './auth'
export { workspaceRoutes } from './workspaces'

// 创建 API 路由组（需要工作空间上下文的资源）
export const apiRoutes = new Hono<{ Bindings: Bindings }>()

// API 路由组统一使用认证和工作空间中间件
apiRoutes.use('*', requireAuth)
apiRoutes.use('*', requireWorkspaceMember)

// 挂载具体的资源路由
apiRoutes.route('/members', memberRoutes)
apiRoutes.route('/providers', providers)

// 路由配置类型
export interface RouteConfig {
  path: string
  description: string
  module: string
}

// 路由清单（用于文档或自动化）
export const ROUTE_MANIFEST: RouteConfig[] = [
  {
    path: '/auth/*',
    description: '用户认证路由',
    module: 'auth'
  },
  {
    path: '/workspaces/*',
    description: '工作空间管理路由',
    module: 'workspaces'
  },
  {
    path: '/api/*',
    description: '需要工作空间上下文的 API 路由',
    module: 'api'
  },
  {
    path: '/api/admin/*',
    description: '管理中心 API 路由',
    module: 'admin'
  },
  {
    path: '/v1/*',
    description: 'Claude API 代理路由',
    module: 'proxy'
  }
]