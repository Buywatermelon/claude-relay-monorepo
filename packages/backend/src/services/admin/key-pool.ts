/**
 * Key Pool 管理服务
 * 处理 API Key 池的所有管理操作
 */

import { ApiKeyStatus, KeyPoolStats } from '../../../../../shared/types/key-pool'
import { ValidationError } from '../../utils/errors'
import { getSupabaseAdmin } from '../../lib/supabase'
import { ProviderService } from './providers'

export class KeyPoolService {
  private supabase = getSupabaseAdmin()
  private providerService: ProviderService

  constructor(private workspaceId: string) {
    this.providerService = new ProviderService(workspaceId)
  }

  /**
   * 获取指定供应商的 Key Pool 状态
   */
  async getKeyPoolStatus(providerId: string) {
    console.log(`[KeyPoolService] Getting key pool status for provider: ${providerId}`)
    
    // 获取供应商信息
    const provider = await this.providerService.getProviderById(providerId)
    console.log(`[KeyPoolService] Provider found:`, provider ? provider.name : 'NOT FOUND')
    
    if (!provider) {
      console.error(`[KeyPoolService] Provider ${providerId} not found`)
      throw new ValidationError('供应商不存在')
    }

    // 获取所有密钥
    const { data: keys, error } = await this.supabase
      .from('provider_api_keys')
      .select('*')
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`[KeyPoolService] Error loading keys:`, error)
      throw new Error('获取密钥列表失败')
    }

    console.log(`[KeyPoolService] Keys count: ${keys?.length || 0}`)

    // 计算统计信息
    const stats = this.calculateStats(keys || [])
    
    return {
      providerId,
      providerName: provider.name,
      keys: (keys || []).map(key => ({
        id: key.id,
        key: key.key_hint || '******',
        status: key.status as ApiKeyStatus,
        usage: {
          count: key.usage_count || 0,
          lastUsedAt: key.last_used_at
        },
        lastError: key.last_error,
        addedAt: key.created_at || new Date().toISOString()
      })),
      stats,
      hasKeys: (keys?.length || 0) > 0
    }
  }

  /**
   * 添加单个密钥
   */
  async addKey(providerId: string, key: string, userId: string) {
    // 验证供应商
    const provider = await this.providerService.getProviderById(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    // 创建密钥提示（显示最后4个字符）
    const keyHint = `${key.slice(0, 4)}...${key.slice(-4)}`

    // 添加密钥
    const { data, error } = await this.supabase
      .from('provider_api_keys')
      .insert({
        workspace_id: this.workspaceId,
        provider_id: providerId,
        encrypted_key: key, // TODO: 实际应该加密存储
        key_hint: keyHint,
        status: 'active',
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error('添加密钥失败')
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'api_key.added',
      resource_type: 'api_key',
      resource_id: data.id,
      details: { provider_id: providerId }
    })

    return {
      id: data.id,
      key: keyHint,
      status: data.status as ApiKeyStatus,
      usage: {
        count: 0,
        lastUsedAt: null
      },
      lastError: null,
      addedAt: data.created_at
    }
  }

  /**
   * 批量添加密钥
   */
  async batchAddKeys(providerId: string, keys: string[], userId: string) {
    // 验证供应商
    const provider = await this.providerService.getProviderById(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    // 准备批量插入数据
    const keysToInsert = keys.map(key => ({
      workspace_id: this.workspaceId,
      provider_id: providerId,
      encrypted_key: key, // TODO: 实际应该加密存储
      key_hint: `${key.slice(0, 4)}...${key.slice(-4)}`,
      status: 'active',
      created_by: userId
    }))

    // 批量插入
    const { data, error } = await this.supabase
      .from('provider_api_keys')
      .insert(keysToInsert)
      .select()

    if (error) {
      throw new Error('批量添加密钥失败')
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: 'api_keys.batch_added',
      resource_type: 'api_key',
      details: { 
        provider_id: providerId, 
        count: keys.length 
      }
    })

    return {
      added: data.length,
      failed: 0,
      errors: []
    }
  }

  /**
   * 批量操作密钥
   */
  async batchOperation(
    providerId: string, 
    keyIds: string[], 
    operation: 'enable' | 'disable' | 'delete',
    userId: string
  ) {
    // 验证供应商
    const provider = await this.providerService.getProviderById(providerId)
    if (!provider) {
      throw new ValidationError('供应商不存在')
    }

    if (operation === 'delete') {
      // 删除操作
      const { error } = await this.supabase
        .from('provider_api_keys')
        .delete()
        .in('id', keyIds)
        .eq('provider_id', providerId)
        .eq('workspace_id', this.workspaceId)

      if (error) {
        throw new Error('批量删除失败')
      }

      // 记录审计日志
      await this.supabase.from('audit_logs').insert({
        workspace_id: this.workspaceId,
        user_id: userId,
        action: 'api_keys.batch_deleted',
        resource_type: 'api_key',
        details: { 
          provider_id: providerId, 
          key_ids: keyIds 
        }
      })

      return { affected: keyIds.length }
    }

    // 启用/禁用操作
    const newStatus = operation === 'enable' ? 'active' : 'inactive'
    const { error } = await this.supabase
      .from('provider_api_keys')
      .update({ status: newStatus })
      .in('id', keyIds)
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)

    if (error) {
      throw new Error(`批量${operation === 'enable' ? '启用' : '禁用'}失败`)
    }

    // 记录审计日志
    await this.supabase.from('audit_logs').insert({
      workspace_id: this.workspaceId,
      user_id: userId,
      action: `api_keys.batch_${operation}d`,
      resource_type: 'api_key',
      details: { 
        provider_id: providerId, 
        key_ids: keyIds 
      }
    })

    return { affected: keyIds.length }
  }

  /**
   * 计算统计信息
   */
  private calculateStats(keys: any[]): KeyPoolStats {
    const stats: KeyPoolStats = {
      total: keys.length,
      active: 0,
      inactive: 0,
      expired: 0,
      rateLimited: 0
    }

    keys.forEach(key => {
      switch (key.status) {
        case 'active':
          stats.active++
          break
        case 'inactive':
          stats.inactive++
          break
        case 'expired':
          stats.expired++
          break
        case 'rate_limited':
          stats.rateLimited++
          break
      }
    })

    return stats
  }
}

// 兼容旧的 KeyPoolManager
export class KeyPoolManager {
  constructor(private workspaceId: string) {}

  async batchAddKeys(providerId: string, keys: string[]) {
    const service = new KeyPoolService(this.workspaceId)
    // 这里需要一个默认的 userId，实际使用时应该从上下文获取
    return service.batchAddKeys(providerId, keys, 'system')
  }
}