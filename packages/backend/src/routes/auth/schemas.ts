import { z } from 'zod';

/**
 * 用户注册 schema
 * 
 * 在 Supabase 体系下：
 * - email: 主要的用户标识符，用于登录
 * - password: 用户密码，至少8个字符
 * - username: 用户显示名称（如"张三"），在 Supabase 中作为 user_metadata.full_name
 * - inviteCode: 邀请码，用于加入现有工作空间（可选）
 */
export const registerSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }),
  password: z.string()
    .min(8, { message: '密码至少8个字符' })
    .max(100, { message: '密码最多100个字符' }),
  username: z.string()
    .min(2, { message: '姓名至少2个字符' })
    .max(50, { message: '姓名最多50个字符' })
    .optional(), // username 作为可选的显示名称
  inviteCode: z.string()
    .optional() // 邀请码，用于加入现有工作空间
});

/**
 * 邮箱登录 schema
 * 
 * Supabase 只支持邮箱登录
 */
export const loginByEmailSchema = z.object({
  email: z.email({ message: '邮箱格式不正确' }),
  password: z.string().min(1, { message: '密码不能为空' })
});

/**
 * 刷新令牌 schema
 */
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, { message: '刷新令牌不能为空' })
});

// 类型导出
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginByEmailInput = z.infer<typeof loginByEmailSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;