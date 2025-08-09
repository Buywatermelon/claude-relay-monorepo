/**
 * Lucia Auth 配置和初始化
 */

import { Lucia } from 'lucia';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { getDatabase } from '../database/init';
import { sessions, users, type User } from '../database/schema';

// 创建 Drizzle adapter
const db = getDatabase();
const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

// 初始化 Lucia
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      isActive: attributes.isActive,
      isSuperAdmin: attributes.isSuperAdmin
    };
  }
});

// 声明 Lucia 类型
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  username: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}