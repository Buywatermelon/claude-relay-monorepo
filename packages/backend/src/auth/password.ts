/**
 * 密码处理工具
 * 使用 Argon2id 进行密码哈希
 */

import { hash, verify } from '@node-rs/argon2';

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    // 推荐的安全参数
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });
}

/**
 * 验证密码
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  return await verify(hashedPassword, plainPassword);
}