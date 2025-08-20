/**
 * 模型管理服务
 */

import { SelectedModel } from '../../../../../shared/types/admin/models'
import { HTTPException } from 'hono/http-exception'
import { getSupabaseAdmin } from '../../lib/supabase'

export class ModelService {
  private supabase = getSupabaseAdmin()
  
  constructor(private workspaceId: string) {}

  // 获取可用模型列表（现在返回 Claude 官方模型和路由配置）
  async getAvailableModels(): Promise<Array<{ id: string; name: string; type: 'claude' | 'route'; routeId?: string }>> {
    const models: Array<{ id: string; name: string; type: 'claude' | 'route'; routeId?: string }> = [
      { id: 'claude', name: 'Claude 官方模型', type: 'claude' }
    ]

    // 获取所有路由配置
    const { data: routeConfigs, error } = await this.supabase
      .from('route_configs')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq('is_active', true)

    if (error) {
      console.error('获取路由配置失败:', error)
      return models
    }

    for (const config of routeConfigs || []) {
      models.push({
        id: config.id,
        name: `路由配置: ${config.name}`,
        type: 'route',
        routeId: config.id
      })
    }

    return models
  }

  // 获取当前选中的模型
  async getSelectedModel(): Promise<SelectedModel> {
    // 从工作空间设置中获取选中的模型
    const { data: workspace, error } = await this.supabase
      .from('workspaces')
      .select('settings')
      .eq('id', this.workspaceId)
      .single()

    if (error || !workspace) {
      return {
        id: 'claude',
        name: 'Claude 官方模型',
        type: 'claude'
      }
    }

    const selectedConfig = workspace.settings as any
    
    if (!selectedConfig?.selectedModel || selectedConfig.selectedModel.type === 'claude') {
      return {
        id: 'claude',
        name: 'Claude 官方模型',
        type: 'claude'
      }
    }
    
    // 路由配置模式
    if (selectedConfig.selectedModel.type === 'route' && selectedConfig.selectedModel.routeId) {
      const { data: routeConfig } = await this.supabase
        .from('route_configs')
        .select('*')
        .eq('id', selectedConfig.selectedModel.routeId)
        .eq('workspace_id', this.workspaceId)
        .single()

      if (routeConfig) {
        return {
          id: routeConfig.id,
          name: `路由配置: ${routeConfig.name}`,
          type: 'route',
          routeId: routeConfig.id
        }
      }
    }
    
    // 默认返回 Claude 官方模型
    return {
      id: 'claude',
      name: 'Claude 官方模型',
      type: 'claude'
    }
  }

  // 选择模型
  async selectModel(type: 'claude' | 'route', routeId?: string): Promise<SelectedModel> {
    if (type === 'claude') {
      // 选择 Claude 官方模型
      const selectedConfig = { type: 'claude' as const }
      
      // 更新工作空间设置
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('settings')
        .eq('id', this.workspaceId)
        .single()

      const currentSettings = (workspace?.settings as any) || {}
      
      await this.supabase
        .from('workspaces')
        .update({
          settings: {
            ...currentSettings,
            selectedModel: selectedConfig
          }
        })
        .eq('id', this.workspaceId)
      
      return {
        id: 'claude',
        name: 'Claude 官方模型',
        type: 'claude'
      }
    }
    
    if (type === 'route') {
      if (!routeId) {
        throw new HTTPException(400, { message: '选择路由配置时需要提供 routeId' })
      }
      
      // 验证路由配置是否存在
      const { data: routeConfig, error } = await this.supabase
        .from('route_configs')
        .select('*')
        .eq('id', routeId)
        .eq('workspace_id', this.workspaceId)
        .single()

      if (error || !routeConfig) {
        throw new HTTPException(400, { message: '路由配置不存在' })
      }
      
      // 保存选择的配置
      const selectedConfig = { type: 'route' as const, routeId }
      
      // 更新工作空间设置
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('settings')
        .eq('id', this.workspaceId)
        .single()

      const currentSettings = (workspace?.settings as any) || {}
      
      await this.supabase
        .from('workspaces')
        .update({
          settings: {
            ...currentSettings,
            selectedModel: selectedConfig
          }
        })
        .eq('id', this.workspaceId)
      
      return {
        id: routeConfig.id,
        name: `路由配置: ${routeConfig.name}`,
        type: 'route',
        routeId: routeConfig.id
      }
    }
    
    throw new HTTPException(400, { message: '无效的模型类型' })
  }
}