/**
 * 模型供应商管理服务
 */

import { ModelProvider, AddProviderRequest, EditProviderRequest } from '../../../../../shared/types/admin/providers'
import { HTTPException } from 'hono/http-exception'
import { getSupabaseAdmin } from '../../lib/supabase'
import { KeyPoolManager } from '../key-pool'

export class ProviderService {
  private keyPoolManager: KeyPoolManager
  private supabase = getSupabaseAdmin()

  constructor(private workspaceId: string) {
    this.keyPoolManager = new KeyPoolManager(workspaceId)
  }

  // 获取所有模型供应商
  async getProviders(): Promise<ModelProvider[]> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new HTTPException(500, { message: '获取供应商列表失败' })
    }

    return data || []
  }

  // 根据 ID 获取供应商
  async getProviderById(id: string): Promise<ModelProvider | null> {
    const { data, error } = await this.supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .single()

    if (error) {
      return null
    }

    return data
  }

  // 添加模型供应商
  async addProvider(request: AddProviderRequest, userId: string): Promise<ModelProvider> {
    // 检查是否已存在
    const { data: existing } = await this.supabase
      .from('providers')
      .select('id')
      .eq('workspace_id', this.workspaceId)
      .eq('name', request.name)
      .single()

    if (existing) {
      throw new HTTPException(400, { message: '供应商名称已存在' })
    }

    const now = new Date().toISOString()
    const newProvider = {
      name: request.name,
      type: request.type,
      endpoint: request.endpoint,
      config: {
        models: request.models,
        transformer: request.transformer,
        description: request.description
      },
      workspace_id: this.workspaceId,
      created_by: userId,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    const { data, error } = await this.supabase
      .from('providers')
      .insert(newProvider)
      .select()
      .single()

    if (error) {
      throw new HTTPException(500, { message: '创建供应商失败' })
    }

    // 如果提供了API密钥，批量添加
    if (request.apiKeys && request.apiKeys.length > 0) {
      await this.keyPoolManager.batchAddKeys(data.id, request.apiKeys)
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'provider.created',
      resource_type: 'provider',
      resource_id: data.id,
      details: { name: data.name }
    })

    return data
  }

  // 编辑模型供应商
  async editProvider(id: string, request: EditProviderRequest, userId: string): Promise<ModelProvider> {
    // 验证供应商是否存在
    const provider = await this.getProviderById(id)
    if (!provider) {
      throw new HTTPException(404, { message: '供应商不存在' })
    }

    // 如果要修改名称，检查新名称是否已存在
    if (request.name && request.name !== provider.name) {
      const { data: existing } = await this.supabase
        .from('providers')
        .select('id')
        .eq('workspace_id', this.workspaceId)
        .eq('name', request.name)
        .neq('id', id)
        .single()

      if (existing) {
        throw new HTTPException(400, { message: '供应商名称已存在' })
      }
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (request.name !== undefined) updateData.name = request.name
    if (request.endpoint !== undefined) updateData.endpoint = request.endpoint
    if (request.status !== undefined) updateData.is_active = request.status === 'active'

    // 更新配置
    const config = provider.config as any || {}
    if (request.models !== undefined) config.models = request.models
    if (request.transformer !== undefined) config.transformer = request.transformer
    if (request.description !== undefined) config.description = request.description
    updateData.config = config

    const { data, error } = await this.supabase
      .from('providers')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single()

    if (error) {
      throw new HTTPException(500, { message: '更新供应商失败' })
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'provider.updated',
      resource_type: 'provider',
      resource_id: id,
      details: { changes: request }
    })

    return data
  }

  // 删除模型供应商
  async deleteProvider(id: string, userId: string): Promise<void> {
    // 验证供应商是否存在
    const provider = await this.getProviderById(id)
    if (!provider) {
      throw new HTTPException(404, { message: '供应商不存在' })
    }

    // 删除供应商（级联删除相关的 API keys 和 models）
    const { error } = await this.supabase
      .from('providers')
      .delete()
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)

    if (error) {
      throw new HTTPException(500, { message: '删除供应商失败' })
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'provider.deleted',
      resource_type: 'provider',
      resource_id: id,
      details: { name: provider.name }
    })
  }
}