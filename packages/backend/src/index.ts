import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { adminRoutes } from './routes/admin/index'
import { claudeRoutes } from './routes/proxy'
import { authRoutes } from './routes/auth'
import { kvValidator } from './middleware/kv-validator'
import { ClaudeAccountService } from './services/admin/index'
import { AppError } from './utils/errors'
import { initDatabase } from './database/init'
import type { Bindings } from './types/env'

// ==================== 应用初始化 ====================
const app = new Hono<{ Bindings: Bindings }>()

// 初始化数据库
initDatabase()

// ==================== 中间件配置 ====================
// KV namespace 验证中间件
app.use('*', kvValidator())

// CORS 配置 - 统一处理所有请求包括 OPTIONS 预检
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'anthropic-version', 'anthropic-beta'],
  credentials: true  // 启用 cookies
}))

// ==================== 基础路由 ====================
// 健康检查
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Claude Relay Backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// ==================== 功能路由挂载 ====================
// 用户认证路由
app.route('/api/auth', authRoutes)

// 管理后台路由
app.route('/api/admin', adminRoutes)

// Claude API 代理路由
app.route('/v1', claudeRoutes)

// ==================== 错误处理 ====================
// 统一错误处理
app.onError((err, c) => {
  // 增强的错误日志记录
  const errorContext = {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('User-Agent'),
    timestamp: new Date().toISOString(),
    errorType: err.constructor.name
  }
  
  console.error('=== 应用错误 ===', errorContext)
  console.error('错误详情:', err)
  
  // 1. 处理自定义业务异常 (优先级最高)
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        message: err.message
      },
      timestamp: new Date().toISOString()
    }, err.status || 500)
  }
  
  // 2. 处理 HTTPException (HTTP协议层错误)
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        message: err.message
      },
      timestamp: new Date().toISOString()
    }, err.status)
  }
  
  // 3. 处理特定的原生异常
  if (err instanceof SyntaxError) {
    return c.json({
      success: false,
      error: {
        message: 'Invalid JSON request body'
      },
      timestamp: new Date().toISOString()
    }, 400)
  }
  
  // 4. 处理未知错误
  const isDev = c.env.NODE_ENV === 'development'
  
  return c.json({
    success: false,
    error: {
      message: isDev ? err.message : 'An unexpected error occurred',
      ...(isDev && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  }, 500)
})

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      message: 'The requested endpoint does not exist'
    },
    timestamp: new Date().toISOString()
  }, 404)
})

// ==================== Worker 导出 ====================
export default {
  fetch: app.fetch,
  
  // 定时任务 - Claude 账号 Token 自动刷新（每6小时执行一次）
  async scheduled(controller: any, env: Bindings, ctx: any) {
    console.log('定时任务开始执行 - Claude 账号 Token 自动刷新')
    
    try {
      const claudeAccountService = new ClaudeAccountService(env.CLAUDE_RELAY_ADMIN_KV)
      
      // 获取所有 Claude 账号
      const accounts = await claudeAccountService.getClaudeAccounts()
      console.log(`发现 ${accounts.length} 个 Claude 账号`)
      
      let successCount = 0
      let failureCount = 0
      
      // 对每个账号尝试刷新 token
      for (const account of accounts) {
        try {
          console.log(`正在刷新账号: ${account.name} (${account.id})`)
          await claudeAccountService.refreshClaudeAccountToken(account.id)
          successCount++
          console.log(`✅ 成功刷新账号: ${account.name}`)
        } catch (error) {
          failureCount++
          console.error(`❌ 刷新账号 ${account.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
      
      console.log(`定时任务执行完成 - 成功: ${successCount}, 失败: ${failureCount}`)
    } catch (error) {
      console.error(`定时任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}