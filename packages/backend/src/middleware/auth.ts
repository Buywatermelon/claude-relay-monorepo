/**
 * 认证中间件
 */

import { createMiddleware } from 'hono/factory';
import { lucia } from '../auth/lucia';
import { UserAuthService } from '../services/auth/user-auth.service';
import type { User, Session } from '../database/schema';

// 扩展 Hono Context 类型
declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    session: Session | null;
  }
}

const authService = new UserAuthService();

/**
 * 认证保护中间件
 * 要求用户必须登录
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const sessionId = lucia.readSessionCookie(c.req.header('Cookie') ?? '');
  
  if (!sessionId) {
    return c.json({ error: '未登录' }, 401);
  }
  
  const result = await authService.validateSession(sessionId);
  
  if (!result.user || !result.session) {
    return c.json({ error: '会话无效或已过期' }, 401);
  }
  
  // 检查用户是否激活
  if (!result.user.isActive) {
    return c.json({ error: '用户账号已被禁用' }, 403);
  }
  
  c.set('user', result.user);
  c.set('session', result.session);
  
  // 设置 cookie 以保持会话
  c.header('Set-Cookie', lucia.createSessionCookie(result.session.id).serialize());
  
  await next();
});

