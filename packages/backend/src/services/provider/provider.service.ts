import { getSupabaseAdmin } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { AppError, ResourceNotFoundError, ValidationError } from '../../utils/errors'

type Provider = Database['public']['Tables']['providers']['Row']
type ProviderInsert = Database['public']['Tables']['providers']['Insert']
type ProviderUpdate = Database['public']['Tables']['providers']['Update']

export interface CreateProviderDto {
  name: string
  type: 'claude' | 'openai' | 'gemini'
  endpoint?: string
  config: {
    auth_method: 'api_key' | 'oauth'
  }
  models: string[]
  description?: string
  icon?: string
}

export interface UpdateProviderDto {
  name?: string
  endpoint?: string
  config?: Partial<CreateProviderDto['config']>
  models?: string[]
  description?: string
  icon?: string
}

export class ProviderService {
  /**
   * 获取工作空间下的所有供应商
   */
  async getProviders(workspaceId: string): Promise<Provider[]> {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取供应商列表失败:', error)
      throw new AppError('获取供应商列表失败', 500, error)
    }

    return data || []
  }

  /**
   * 获取单个供应商
   */
  async getProvider(workspaceId: string, providerId: string): Promise<Provider | null> {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', providerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('获取供应商详情失败:', error)
      throw new AppError('获取供应商详情失败', 500, error)
    }

    return data
  }

  /**
   * 创建供应商
   */
  async createProvider(workspaceId: string, userId: string, dto: CreateProviderDto): Promise<Provider> {
    const supabase = getSupabaseAdmin()
    const providerData: ProviderInsert = {
      workspace_id: workspaceId,
      name: dto.name,
      type: dto.type,
      endpoint: dto.endpoint,
      config: dto.config,
      models: dto.models || [],
      description: dto.description,
      icon: dto.icon,
      is_active: true,
      created_by: userId
    }

    const { data, error } = await supabase
      .from('providers')
      .insert(providerData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('该工作空间下已存在同名供应商')
      }
      console.error('创建供应商失败:', error)
      throw new AppError('创建供应商失败', 500, error)
    }

    return data
  }

  /**
   * 更新供应商
   */
  async updateProvider(
    workspaceId: string,
    providerId: string,
    dto: UpdateProviderDto
  ): Promise<Provider> {
    const supabase = getSupabaseAdmin()
    const updateData: ProviderUpdate = {
      name: dto.name,
      endpoint: dto.endpoint,
      config: dto.config,
      models: dto.models,
      description: dto.description,
      icon: dto.icon,
      updated_at: new Date().toISOString()
    }

    // 移除 undefined 的字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof ProviderUpdate] === undefined) {
        delete updateData[key as keyof ProviderUpdate]
      }
    })

    const { data, error } = await supabase
      .from('providers')
      .update(updateData)
      .eq('workspace_id', workspaceId)
      .eq('id', providerId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('该工作空间下已存在同名供应商')
      }
      console.error('更新供应商失败:', error)
      throw new AppError('更新供应商失败', 500, error)
    }

    if (!data) {
      throw new ResourceNotFoundError('供应商不存在')
    }

    return data
  }

  /**
   * 删除供应商
   */
  async deleteProvider(workspaceId: string, providerId: string): Promise<void> {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', providerId)

    if (error) {
      console.error('删除供应商失败:', error)
      throw new AppError('删除供应商失败', 500, error)
    }
  }

}