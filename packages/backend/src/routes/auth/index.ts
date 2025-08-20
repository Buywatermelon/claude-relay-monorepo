/**
 * 用户认证路由
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SupabaseAuthService } from '../../services/auth/supabase-auth.service';
import { registerSchema, loginByEmailSchema, refreshTokenSchema } from './schemas';

export const authRoutes = new Hono();
const authService = new SupabaseAuthService();

// 用户注册
authRoutes.post('/register',
  zValidator('json', registerSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = await authService.register({
      email: data.email,
      password: data.password,
      fullName: data.username, // 使用 username 作为 fullName
    });

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name
      }
    });
  }
);

// 用户登录（邮箱）
authRoutes.post('/login',
  zValidator('json', loginByEmailSchema),
  async (c) => {
    const data = c.req.valid('json');
    const result = await authService.login(data.email, data.password);

    return c.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.user_metadata?.full_name
      },
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_at: result.session.expires_at
      }
    });
  }
);


// 验证会话
authRoutes.get('/session',
  async (c) => {
    // 从 Authorization header 获取 token
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // 如果没有 token，返回未认证状态
    if (!token) {
      return c.json({
        user: null,
        session: null,
        authenticated: false
      });
    }
    
    // 验证 token
    const user = await authService.verifyToken(token);
    
    if (!user) {
      return c.json({
        user: null,
        session: null,
        authenticated: false
      });
    }

    // 返回认证用户信息
    return c.json({
      user: {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name
      },
      authenticated: true
    });
  }
);

// 刷新访问令牌
authRoutes.post('/refresh',
  zValidator('json', refreshTokenSchema),
  async (c) => {
    const data = c.req.valid('json');
    
    const result = await authService.refreshToken(data.refresh_token);
    
    if (!result.session) {
      throw new Error('刷新令牌失败');
    }
    
    return c.json({
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_at: result.session.expires_at
      }
    });
  }
);

// 获取当前用户信息
authRoutes.get('/me',
  async (c) => {
    // 从 Authorization header 获取 token
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('未登录');
    }
    
    // 验证 token
    const user = await authService.verifyToken(token);

    if (!user) {
      throw new Error('会话无效或已过期');
    }

    return c.json({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name
    });
  }
);