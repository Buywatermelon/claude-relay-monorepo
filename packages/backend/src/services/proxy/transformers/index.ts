/**
 * 转换器注册表
 * 用于注册和获取各种 API 处理器
 */

import { OpenAITransformer } from './openai-transformer'
import type { IAPIProcessor } from './interfaces'

class TransformerRegistry {
  private processors: Map<string, new (apiKey: string, baseURL?: string) => IAPIProcessor> = new Map()

  constructor() {
    // 注册默认的转换器
    this.register('claude-to-openai', OpenAITransformer)
    // 未来可以添加：
    // this.register('claude-to-gemini', GeminiProcessor)
  }

  /**
   * 注册一个新的处理器
   */
  register(transformerName: string, ProcessorClass: new (apiKey: string, baseURL?: string) => IAPIProcessor) {
    this.processors.set(transformerName, ProcessorClass)
  }

  /**
   * 创建处理器实例
   * @param transformerName - 转换器名称，如 'claude-to-openai'
   * @param apiKey - API 密钥
   * @param endpoint - 供应商端点
   */
  create(transformerName: string, apiKey: string, endpoint?: string): IAPIProcessor {
    const ProcessorClass = this.processors.get(transformerName)
    if (!ProcessorClass) {
      throw new Error(`Transformer ${transformerName} not registered`)
    }
    
    return new ProcessorClass(apiKey, endpoint)
  }

  /**
   * 检查是否支持某种转换器
   */
  has(transformerName: string): boolean {
    return this.processors.has(transformerName)
  }
}

// 导出单例实例
export const transformerRegistry = new TransformerRegistry()

// 导出类型
export type { IAPIProcessor } from './interfaces'