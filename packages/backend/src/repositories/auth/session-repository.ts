/**
 * 会话管理数据访问层
 */

import { eq, and, lt, sql } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { sessions, users, type Session, type User } from '../../database/schema';
import { ResourceNotFoundError } from '../../utils/errors';
import { generateId, generateSessionToken, hashToken } from '../../utils/auth';

export class SessionRepository extends BaseRepository {
  /**
   * 创建会话
   */
  async create(userId: string, data?: {
    ipAddress?: string;
    userAgent?: string;
    expiresInHours?: number;
  }): Promise<{ session: Session; token: string }> {
    const sessionId = generateId('session');
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data?.expiresInHours || 24));
    
    const result = await this.db
      .insert(sessions)
      .values({
        id: sessionId,
        userId,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        ipAddress: data?.ipAddress,
        userAgent: data?.userAgent
      })
      .returning();
    
    return {
      session: result[0],
      token // 返回原始 token 给客户端
    };
  }

  /**
   * 根据 token 查找会话并返回用户信息
   */
  async findByToken(token: string): Promise<{ session: Session; user: User } | null> {
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();
    
    const result = await this.db
      .select({
        session: sessions,
        user: users
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          // 检查是否过期
          sql`${sessions.expiresAt} > ${now}`
        )
      )
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    
    // 更新最后访问时间
    await this.db
      .update(sessions)
      .set({ lastAccessedAt: now })
      .where(eq(sessions.id, result[0].session.id))
      .run();
    
    return result[0];
  }

  /**
   * 删除会话（登出）
   */
  async delete(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    
    const result = await this.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    
    if (result.changes === 0) {
      throw new ResourceNotFoundError('会话不存在或已过期');
    }
  }

  /**
   * 清理过期会话
   */
  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    
    const result = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now));
    
    return result.changes || 0;
  }
}