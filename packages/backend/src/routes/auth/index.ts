/**
 * 用户认证路由
 */

import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { zValidator } from '@hono/zod-validator';
import { UserAuthService } from '../../services/auth/user-auth.service';
import { lucia } from '../../auth/lucia';
import { registerSchema, loginSchema, loginByEmailSchema } from './schemas';

export const authRoutes = new Hono();
const authService = new UserAuthService();

// 用户注册
authRoutes.post('/register',
  zValidator('json', registerSchema),
  async (c) => {
    const data = c.req.valid('json');
    const result = await authService.register(data);

    // 设置会话 cookie
    c.header('Set-Cookie', result.sessionCookie);

    return c.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin
      },
      sessionId: result.session.id
    });
  }
);

// 用户登录（用户名）
authRoutes.post('/login',
  zValidator('json', loginSchema),
  async (c) => {
    const data = c.req.valid('json');
    const result = await authService.login(data);

    // 设置会话 cookie
    c.header('Set-Cookie', result.sessionCookie);

    return c.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin
      },
      sessionId: result.session.id
    });
  }
);

// 用户登录（邮箱）
authRoutes.post('/login/email',
  zValidator('json', loginByEmailSchema),
  async (c) => {
    const data = c.req.valid('json');
    const result = await authService.loginByEmail(data);

    // 设置会话 cookie
    c.header('Set-Cookie', result.sessionCookie);

    return c.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin
      },
      sessionId: result.session.id
    });
  }
);

// 用户登出
authRoutes.post('/logout',
  validator('header', (headers) => {
    const cookie = headers['cookie'] ?? '';
    const sessionId = lucia.readSessionCookie(cookie);
    
    if (!sessionId) {
      throw new Error('未找到会话');
    }
    
    return { sessionId };
  }),
  async (c) => {
    const { sessionId } = c.req.valid('header');
    const result = await authService.logout(sessionId);

    // 清除会话 cookie
    c.header('Set-Cookie', result.sessionCookie);

    return c.json({
      message: '登出成功'
    });
  }
);

// 验证会话
authRoutes.get('/session',
  async (c) => {
    // 从 cookie 中读取会话 ID
    const cookie = c.req.header('cookie') ?? '';
    const sessionId = lucia.readSessionCookie(cookie);
    
    // 如果没有会话 ID，返回未认证状态（不是错误）
    if (!sessionId) {
      return c.json({
        user: null,
        session: null,
        authenticated: false
      });
    }
    
    // 验证会话
    const result = await authService.validateSession(sessionId);

    // 如果会话无效或已过期，返回未认证状态（不是错误）
    if (!result.user || !result.session) {
      return c.json({
        user: null,
        session: null,
        authenticated: false
      });
    }

    // 返回认证用户信息
    return c.json({
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin
      },
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt
      },
      authenticated: true
    });
  }
);

// 获取当前用户信息
authRoutes.get('/me',
  validator('header', (headers) => {
    const cookie = headers['cookie'] ?? '';
    const sessionId = lucia.readSessionCookie(cookie);
    
    if (!sessionId) {
      throw new Error('未登录');
    }
    
    return { sessionId };
  }),
  async (c) => {
    const { sessionId } = c.req.valid('header');
    const result = await authService.validateSession(sessionId);

    if (!result.user || !result.session) {
      throw new Error('会话无效或已过期');
    }

    return c.json({
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      isActive: result.user.isActive,
      isSuperAdmin: result.user.isSuperAdmin,
      createdAt: result.user.createdAt,
      lastLoginAt: result.user.lastLoginAt,
      loginCount: result.user.loginCount
    });
  }
);