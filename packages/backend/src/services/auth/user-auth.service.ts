/**
 * 用户认证服务
 * 使用 Lucia Auth 进行用户认证和会话管理
 */

import { lucia } from '../../auth/lucia';
import { hashPassword, verifyPassword } from '../../auth/password';
import { getDatabase } from '../../database/init';
import { users, type User, type NewUser } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'lucia';
import type { Session } from 'lucia';

export class UserAuthService {
  private db = getDatabase();

  /**
   * 注册新用户
   */
  async register(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<{ user: User; session: Session; sessionCookie: string }> {
    // 检查用户名是否已存在
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .get();

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .get();

    if (existingEmail) {
      throw new Error('邮箱已被使用');
    }

    // 哈希密码
    const passwordHash = await hashPassword(data.password);

    // 创建用户
    const userId = generateId(15);
    const newUser: NewUser = {
      id: userId,
      username: data.username,
      email: data.email,
      passwordHash,
      isActive: true,
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginCount: 0
    };

    await this.db.insert(users).values(newUser);

    // 获取创建的用户
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('创建用户失败');
    }

    // 创建会话
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();

    return { user, session, sessionCookie };
  }

  /**
   * 用户登录
   */
  async login(data: {
    username: string;
    password: string;
  }): Promise<{ user: User; session: Session; sessionCookie: string }> {
    // 查找用户
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .get();

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw new Error('用户账号已被禁用');
    }

    // 验证密码
    const validPassword = await verifyPassword(user.passwordHash, data.password);
    if (!validPassword) {
      throw new Error('用户名或密码错误');
    }

    // 更新登录信息
    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, user.id));

    // 创建会话
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();

    return { user, session, sessionCookie };
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string): Promise<{ sessionCookie: string }> {
    await lucia.invalidateSession(sessionId);
    const sessionCookie = lucia.createBlankSessionCookie().serialize();
    return { sessionCookie };
  }

  /**
   * 验证会话
   */
  async validateSession(sessionId: string): Promise<{
    user: User | null;
    session: Session | null;
  }> {
    const result = await lucia.validateSession(sessionId);
    
    if (!result.session || !result.user) {
      return { user: null, session: null };
    }

    // 获取完整的用户信息
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, result.user.id))
      .get();

    return { user, session: result.session };
  }

  /**
   * 通过邮箱登录
   */
  async loginByEmail(data: {
    email: string;
    password: string;
  }): Promise<{ user: User; session: Session; sessionCookie: string }> {
    // 查找用户
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .get();

    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw new Error('用户账号已被禁用');
    }

    // 验证密码
    const validPassword = await verifyPassword(user.passwordHash, data.password);
    if (!validPassword) {
      throw new Error('邮箱或密码错误');
    }

    // 更新登录信息
    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, user.id));

    // 创建会话
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();

    return { user, session, sessionCookie };
  }
}