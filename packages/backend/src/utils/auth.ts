/**
 * 认证相关的工具函数
 */

import { Argon2id } from 'oslo/password';
import crypto from 'crypto';

// 创建 Argon2id 实例
const argon2id = new Argon2id();

/**
 * 生成唯一 ID
 * @param prefix - ID 前缀，如 'user', 'session', 'role' 等
 * @returns 格式化的唯一 ID
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
}

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 哈希密码
 * @param password - 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id.hash(password);
}

/**
 * 验证密码
 * @param hash - 密码哈希
 * @param password - 明文密码
 * @returns 密码是否匹配
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2id.verify(hash, password);
}

/**
 * 生成安全的随机令牌
 * @param length - 令牌长度（字节），默认 32
 * @returns 十六进制字符串令牌
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成会话令牌
 * @returns Base64 编码的会话令牌
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * 哈希令牌（用于存储）
 * @param token - 原始令牌
 * @returns 令牌的哈希值
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * 生成过期时间
 * @param hours - 小时数，默认 24 小时
 * @returns ISO 格式的过期时间字符串
 */
export function generateExpiresAt(hours: number = 24): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt.toISOString();
}

/**
 * 检查是否已过期
 * @param expiresAt - ISO 格式的过期时间字符串
 * @returns 是否已过期
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * 密码强度验证
 * @param password - 密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('密码长度至少 8 位');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含数字');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否为有效邮箱
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证用户名格式
 * @param username - 用户名
 * @returns 验证结果
 */
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { isValid: false, error: '用户名至少 3 个字符' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: '用户名最多 20 个字符' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: '用户名只能包含字母、数字、下划线和连字符' };
  }
  
  return { isValid: true };
}