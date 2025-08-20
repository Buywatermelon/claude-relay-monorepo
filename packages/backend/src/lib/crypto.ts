/**
 * 简单的加密服务 - 兼容 Bun 和 Cloudflare Workers
 */

export class CryptoService {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * 加密文本
   */
  static async encrypt(text: string, env: { ENCRYPTION_KEY: string }): Promise<string> {
    const keyData = Uint8Array.from(atob(env.ENCRYPTION_KEY), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this.encoder.encode(text)
    );

    // 组合 IV + 密文，返回 Base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * 解密文本
   */
  static async decrypt(encrypted: string, env: { ENCRYPTION_KEY: string }): Promise<string> {
    const keyData = Uint8Array.from(atob(env.ENCRYPTION_KEY), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);
    
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return this.decoder.decode(decrypted);
  }

  /**
   * 创建密钥提示
   */
  static createKeyHint(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}