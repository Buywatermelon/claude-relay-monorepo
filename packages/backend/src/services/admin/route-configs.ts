/**
 * 路由配置管理服务
 */

import type { RouteConfig, AddRouteConfigRequest, EditRouteConfigRequest } from '../../../../../shared/types/admin/routes'
import { HTTPException } from 'hono/http-exception'
import { getSupabaseAdmin } from '../../lib/supabase'

export class RouteConfigService {
  private supabase = getSupabaseAdmin()

  constructor(private workspaceId: string) {}

  /**
   * 获取所有路由配置
   */
  async getAllConfigs(): Promise<RouteConfig[]> {
    const { data, error } = await this.supabase
      .from('route_configs')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw new HTTPException(500, { message: '获取路由配置失败' })
    }

    // 转换数据格式以匹配 RouteConfig 类型
    return (data || []).map(config => ({
      id: config.id,
      name: config.name,
      rules: config.rules as any,
      priority: config.priority || 0,
      status: config.is_active ? 'active' as const : 'inactive' as const,
      createdAt: config.created_at || new Date().toISOString(),
      updatedAt: config.updated_at || new Date().toISOString()
    }))
  }

  /**
   * 获取单个路由配置
   */
  async getConfig(id: string): Promise<RouteConfig | null> {
    const { data, error } = await this.supabase
      .from('route_configs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .single()

    if (error || !data) {
      return null
    }

    // 转换数据格式
    return {
      id: data.id,
      name: data.name,
      rules: data.rules as any,
      priority: data.priority || 0,
      status: data.is_active ? 'active' as const : 'inactive' as const,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    }
  }

  /**
   * 创建路由配置
   */
  async createConfig(request: AddRouteConfigRequest, userId: string): Promise<RouteConfig> {
    // 检查名称是否已存在
    const { data: existing } = await this.supabase
      .from('route_configs')
      .select('id')
      .eq('workspace_id', this.workspaceId)
      .eq('name', request.name)
      .single()

    if (existing) {
      throw new HTTPException(400, { message: '路由配置名称已存在' })
    }

    const now = new Date().toISOString()
    const newConfig = {
      name: request.name,
      rules: request.rules,
      priority: request.priority || 0,
      workspace_id: this.workspaceId,
      created_by: userId,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    const { data, error } = await this.supabase
      .from('route_configs')
      .insert(newConfig)
      .select()
      .single()

    if (error) {
      throw new HTTPException(500, { message: '创建路由配置失败' })
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'route_config.created',
      resource_type: 'route_config',
      resource_id: data.id,
      details: { name: data.name }
    })

    // 转换并返回
    return {
      id: data.id,
      name: data.name,
      rules: data.rules as any,
      priority: data.priority || 0,
      status: data.is_active ? 'active' as const : 'inactive' as const,
      createdAt: data.created_at || now,
      updatedAt: data.updated_at || now
    }
  }

  /**
   * 更新路由配置
   */
  async updateConfig(id: string, request: EditRouteConfigRequest, userId: string): Promise<RouteConfig> {
    // 验证配置是否存在
    const existing = await this.getConfig(id)
    if (!existing) {
      throw new HTTPException(404, { message: '路由配置不存在' })
    }

    // 如果要修改名称，检查新名称是否已存在
    if (request.name && request.name !== existing.name) {
      const { data: duplicate } = await this.supabase
        .from('route_configs')
        .select('id')
        .eq('workspace_id', this.workspaceId)
        .eq('name', request.name)
        .neq('id', id)
        .single()

      if (duplicate) {
        throw new HTTPException(400, { message: '路由配置名称已存在' })
      }
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (request.name !== undefined) updateData.name = request.name
    if (request.rules !== undefined) updateData.rules = request.rules
    if (request.priority !== undefined) updateData.priority = request.priority
    if (request.status !== undefined) updateData.is_active = request.status === 'active'

    const { data, error } = await this.supabase
      .from('route_configs')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single()

    if (error) {
      throw new HTTPException(500, { message: '更新路由配置失败' })
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'route_config.updated',
      resource_type: 'route_config',
      resource_id: id,
      details: { changes: request }
    })

    // 转换并返回
    return {
      id: data.id,
      name: data.name,
      rules: data.rules as any,
      priority: data.priority || 0,
      status: data.is_active ? 'active' as const : 'inactive' as const,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    }
  }

  /**
   * 删除路由配置
   */
  async deleteConfig(id: string, userId: string): Promise<void> {
    // 验证配置是否存在
    const config = await this.getConfig(id)
    if (!config) {
      throw new HTTPException(404, { message: '路由配置不存在' })
    }

    // 检查是否被选中使用
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('settings')
      .eq('id', this.workspaceId)
      .single()

    const selectedModel = (workspace?.settings as any)?.selectedModel
    if (selectedModel?.type === 'route' && selectedModel?.routeId === id) {
      throw new HTTPException(400, { message: '不能删除正在使用的路由配置' })
    }

    // 删除配置
    const { error } = await this.supabase
      .from('route_configs')
      .delete()
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)

    if (error) {
      throw new HTTPException(500, { message: '删除路由配置失败' })
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'route_config.deleted',
      resource_type: 'route_config',
      resource_id: id,
      details: { name: config.name }
    })
  }

  /**
   * 获取路由配置（内部使用）
   */
  async getRouteConfig(id: string): Promise<RouteConfig | null> {
    return this.getConfig(id)
  }

  /**
   * 获取当前选中的配置
   */
  async getSelectedConfig(): Promise<{ type: 'claude' | 'route'; routeId?: string } | null> {
    const { data: workspace } = await this.supabase
      .from('workspaces')
      .select('settings')
      .eq('id', this.workspaceId)
      .single()

    const selectedModel = (workspace?.settings as any)?.selectedModel
    return selectedModel || null
  }

  /**
   * 设置选中的配置
   */
  async setSelectedConfig(config: { type: 'claude' | 'route'; routeId?: string }): Promise<void> {
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
          selectedModel: config
        }
      })
      .eq('id', this.workspaceId)
  }
}