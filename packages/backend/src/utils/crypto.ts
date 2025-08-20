/**
 * 加密工具类
 * 使用 Web Crypto API 进行 AES-GCM 加密
 */

export class CryptoService {
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  /**
   * 从环境变量获取或生成加密密钥
   */
  static async getKey(env: { ENCRYPTION_KEY?: string }): Promise<CryptoKey> {
    if (!env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    // 将 base64 编码的密钥转换为 CryptoKey
    const keyData = Uint8Array.from(atob(env.ENCRYPTION_KEY), c => c.charCodeAt(0))
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * 加密文本
   */
  static async encrypt(text: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedText = this.encoder.encode(text)

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    )

    // 将 IV 和加密数据组合，然后 base64 编码
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  /**
   * 解密文本
   */
  static async decrypt(encryptedText: string, key: CryptoKey): Promise<string> {
    // base64 解码
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))

    // 提取 IV 和加密数据
    const iv = combined.slice(0, 12)
    const encryptedData = combined.slice(12)

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    return this.decoder.decode(decryptedData)
  }

  /**
   * 生成新的加密密钥（用于初始设置）
   */
  static async generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
  }
}