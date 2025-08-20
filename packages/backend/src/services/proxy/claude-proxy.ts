/**
 * Claude API 代理服务 - Engine 架构版本
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import { ClaudeEngine, ProviderEngine } from './engines'
import { RouteConfigService } from '../admin/route-configs'
import { ValidationError } from '../../utils/errors'

export class ClaudeProxyService {
  private claudeEngine: ClaudeEngine
  private providerEngine: ProviderEngine
  
  constructor(private workspaceId: string) {
    this.claudeEngine = new ClaudeEngine(workspaceId)
    this.providerEngine = new ProviderEngine(workspaceId)
  }
  
  /**
   * 代理请求到适当的 API 端点
   */
  async proxyRequest(request: Request): Promise<Response> {
    // 解析请求
    const claudeRequest = await request.json() as MessageCreateParamsBase
    
    // 获取选择的配置
    const routeConfigService = new RouteConfigService(this.workspaceId)
    const selectedConfig = await routeConfigService.getSelectedConfig()
    
    if (!selectedConfig || selectedConfig.type === 'claude') {
      // 默认使用 Claude
      return await this.claudeEngine.processRequest(claudeRequest)
    } else if (selectedConfig.type === 'route') {
      return await this.providerEngine.processRequest(claudeRequest)
    } else {
      throw new ValidationError(`Unknown configuration type: ${selectedConfig.type}`)
    }
  }
}