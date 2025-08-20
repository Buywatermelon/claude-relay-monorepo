import { createMiddleware } from 'hono/factory'
import { SupabaseAuthService } from '../services/auth/supabase-auth.service'
import type { AuthUser } from '@supabase/supabase-js'

// 扩展 Hono Context
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    token: string
  }
}

const authService = new SupabaseAuthService()

/**
 * 简单的认证中间件
 * 只负责验证 token 并将用户信息注入到 context 中
 */
export const requireAuth = createMiddleware(async (c, next) => {
  // 1. 获取认证令牌
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: '未提供认证令牌' }, 401)
  }
  
  try {
    // 2. 验证用户
    const user = await authService.verifyToken(token)
    
    if (!user) {
      return c.json({ error: '无效的认证令牌' }, 401)
    }
    
    // 3. 将用户信息注入到 context
    c.set('user', user)
    c.set('token', token)
    
    await next()
  } catch (error) {
    console.error('认证错误:', error)
    return c.json({ error: '认证失败' }, 401)
  }
})