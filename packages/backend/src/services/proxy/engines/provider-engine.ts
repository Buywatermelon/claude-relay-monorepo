/**
 * 第三方供应商代理引擎
 * 直接使用转换器的 processRequest 方法，大幅简化架构
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import { ProviderResolver } from './provider-resolver'
import { ResponseWrapper } from './response-wrapper'

export class ProviderEngine {
  private providerResolver: ProviderResolver
  
  constructor(workspaceId: string) {
    this.providerResolver = new ProviderResolver(workspaceId)
  }
  
  /**
   * 处理请求 - 使用完整的 ProviderResolver
   */
  async processRequest(request: MessageCreateParamsBase): Promise<Response> {
    // 1. 使用 ProviderResolver 解析完整的供应商配置
    const resolution = await this.providerResolver.resolve(request)
    const { selectedModel, transformer } = resolution
    
    // 2. 调用转换器的 process 方法
    const result = await transformer.process(request, selectedModel)
    
    // 3. 使用响应包装器包装结果
    return ResponseWrapper.wrap(result)
  }
  
}