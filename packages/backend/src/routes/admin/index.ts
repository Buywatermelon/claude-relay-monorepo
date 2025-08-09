/**
 * 管理路由主入口 - 聚合所有子路由
 */

import { Hono } from 'hono'
import { dashboardRoutes } from './dashboard'
import { providerRoutes } from './providers'
import { modelRoutes } from './models'
import { claudeAccountRoutes } from './claude-accounts'
import { keyPoolRoutes } from './key-pool'
import { routeConfigRoutes } from './route-configs'
import { requireAuth } from '../../middleware/auth'
import type { Bindings } from '../../types/env'

const adminRoutes = new Hono<{ Bindings: Bindings }>()

// 为所有管理路由添加认证保护
adminRoutes.use('*', requireAuth)

// 挂载所有子路由
adminRoutes.route('/', dashboardRoutes)
adminRoutes.route('/', providerRoutes)
adminRoutes.route('/', modelRoutes)
adminRoutes.route('/', claudeAccountRoutes)
adminRoutes.route('/', keyPoolRoutes)
adminRoutes.route('/', routeConfigRoutes)

export { adminRoutes }