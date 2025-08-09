import { z } from 'zod';

// 用户注册 schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和横线'),
  email: z.string()
    .email('邮箱格式不正确'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(100, '密码最多100个字符')
});

// 用户名登录 schema
export const loginSchema = z.object({
  username: z.string()
    .min(1, '用户名不能为空'),
  password: z.string()
    .min(1, '密码不能为空')
});

// 邮箱登录 schema
export const loginByEmailSchema = z.object({
  email: z.string()
    .email('邮箱格式不正确'),
  password: z.string()
    .min(1, '密码不能为空')
});

// 类型导出
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginByEmailInput = z.infer<typeof loginByEmailSchema>;