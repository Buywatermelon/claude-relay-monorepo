/**
 * Provider 解析器
 * 负责加载路由配置、选择模型、加载供应商、获取 API Key 和转换器
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { ProviderResolution } from './types'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { ModelRouterService } from './model-router'
import { transformerRegistry } from '../transformers'
import { RouteConfigService } from '../../admin/route-configs'
import { ProviderService } from '../../admin/providers'

export class ProviderResolver {
  private supabase = getSupabaseAdmin()
  private modelRouter: ModelRouterService
  
  constructor(private workspaceId: string) {
    this.modelRouter = new ModelRouterService()
  }
  
  /**
   * 解析请求，返回所有必要的 Provider 相关资源
   */
  async resolve(request: MessageCreateParamsBase): Promise<ProviderResolution> {
    // 1. 获取当前工作空间的选中模型配置
    const routeConfigService = new RouteConfigService(this.workspaceId)
    const selectedConfig = await routeConfigService.getSelectedConfig()
    
    if (!selectedConfig || selectedConfig.type === 'claude') {
      // 使用官方 Claude API
      return {
        mode: 'claude',
        provider: null,
        model: request.model,
        apiKey: '', // Claude 官方 API 密钥从环境变量获取
        transformer: null
      }
    }
    
    // 2. 加载路由配置
    if (!selectedConfig.routeId) {
      throw new Error('Route ID not specified in selected configuration')
    }
    
    const routeConfig = await routeConfigService.getRouteConfig(selectedConfig.routeId)
    if (!routeConfig) {
      throw new Error('Selected route configuration not found')
    }
    
    // 3. 根据请求内容选择合适的模型
    const target = await this.modelRouter.selectModel(request, routeConfig)
    
    // 4. 加载对应的供应商配置
    const providerService = new ProviderService(this.workspaceId)
    const provider = await providerService.getProviderById(target.providerId)
    if (!provider) {
      throw new Error(`Provider ${target.providerId} not found`)
    }
    
    // 5. 从密钥池获取可用的 API Key
    const apiKey = await this.getNextApiKey(provider.id)
    if (!apiKey) {
      throw new Error(`No available API keys for provider ${provider.name}`)
    }
    
    // 6. 获取对应的转换器实例
    const config = provider.config as any
    const transformerName = config?.transformer || provider.type
    const transformer = transformerRegistry.get(transformerName)
    if (!transformer) {
      throw new Error(`No transformer found for ${transformerName}`)
    }
    
    return {
      mode: 'proxy',
      provider,
      model: target.model,
      apiKey,
      transformer
    }
  }
  
  /**
   * 从供应商密钥池获取下一个可用的 API Key
   */
  private async getNextApiKey(providerId: string): Promise<string | null> {
    // 获取该供应商的所有活跃密钥
    const { data: keys, error } = await this.supabase
      .from('provider_api_keys')
      .select('*')
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)
      .eq('status', 'active')
      .order('usage_count', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
    
    if (error || !keys || keys.length === 0) {
      return null
    }
    
    const selectedKey = keys[0]
    
    // 更新使用统计
    await this.supabase
      .from('provider_api_keys')
      .update({
        usage_count: (selectedKey.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', selectedKey.id)
    
    return selectedKey.encrypted_key
  }
}