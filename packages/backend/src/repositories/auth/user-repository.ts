/**
 * 用户数据访问层
 */

import { eq, or, sql } from 'drizzle-orm';
import { BaseRepository } from '../base-repository';
import { users, type User, type NewUser } from '../../database/schema';
import { AppError, ValidationError, ResourceNotFoundError } from '../../utils/errors';

export class UserRepository extends BaseRepository {
  /**
   * 统一查询用户
   */
  async findOne(criteria: {
    id?: string;
    username?: string;
    email?: string;
  }): Promise<User | null> {
    const conditions = [];
    
    if (criteria.id) {
      conditions.push(eq(users.id, criteria.id));
    }
    if (criteria.username) {
      conditions.push(eq(users.username, criteria.username));
    }
    if (criteria.email) {
      conditions.push(eq(users.email, criteria.email));
    }
    
    if (conditions.length === 0) {
      throw new ValidationError('至少需要一个查询条件');
    }
    
    const result = await this.db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * 创建用户
   */
  async create(data: NewUser): Promise<User> {
    // 检查用户名和邮箱是否已存在
    const existing = await this.findOne({ 
      username: data.username,
      email: data.email 
    });
    
    if (existing) {
      if (existing.username === data.username) {
        throw new AppError('用户名已存在', 409);
      }
      if (existing.email === data.email) {
        throw new AppError('邮箱已被使用', 409);
      }
    }
    
    const result = await this.db
      .insert(users)
      .values(data)
      .returning();
    
    return result[0];
  }

  /**
   * 更新密码
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const result = await this.db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, id));
    
    if (result.changes === 0) {
      throw new ResourceNotFoundError('用户不存在');
    }
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ 
        lastLoginAt: new Date().toISOString(),
        loginCount: sql`${users.loginCount} + 1`
      })
      .where(eq(users.id, id))
      .run();
  }
}