/**
 * 供应商凭证管理服务
 */

import { getSupabaseAdmin } from '../../lib/supabase'
import { CryptoService } from '../../lib/crypto'
import { 
  ValidationError, 
  ResourceNotFoundError,
  ConflictError 
} from '../../utils/errors'
import type { 
  Database,
  Tables,
  TablesInsert,
  TablesUpdate 
} from '../../lib/database.types'

type Credential = Tables<'provider_credentials'>
type CredentialInsert = TablesInsert<'provider_credentials'>
type CredentialUpdate = TablesUpdate<'provider_credentials'>
type UsageStats = Tables<'credential_usage_stats'>

export class CredentialService {
  private supabase = getSupabaseAdmin()

  constructor(
    private workspaceId: string,
    private env: { ENCRYPTION_KEY: string }
  ) {}

  /**
   * 获取凭证列表
   */
  async listCredentials(providerId: string, options: {
    credential_type?: 'api_key' | 'oauth_account'
    status?: string
    page?: number
    limit?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  } = {}) {
    const { 
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options

    let query = this.supabase
      .from('provider_credentials')
      .select('*, credential_usage_stats(*)', { count: 'exact' })
      .eq('workspace_id', this.workspaceId)
      .eq('provider_id', providerId)

    if (options.credential_type) {
      query = query.eq('credential_type', options.credential_type)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    const { data, error, count } = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // 不返回加密的敏感信息
    const sanitizedData = data?.map(cred => ({
      ...cred,
      encrypted_key: undefined,
      oauth_data: cred.oauth_data ? {
        ...cred.oauth_data as any,
        tokens: undefined
      } : undefined
    }))

    return {
      data: sanitizedData,
      total: count || 0,
      page,
      limit
    }
  }

  /**
   * 获取单个凭证
   */
  async getCredential(providerId: string, credentialId: string) {
    const { data, error } = await this.supabase
      .from('provider_credentials')
      .select('*, credential_usage_stats(*)')
      .eq('id', credentialId)
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)
      .single()

    if (error || !data) {
      throw new ResourceNotFoundError('凭证不存在')
    }

    // 移除敏感信息
    return {
      ...data,
      encrypted_key: undefined,
      oauth_data: data.oauth_data ? {
        ...data.oauth_data as any,
        tokens: undefined
      } : undefined
    }
  }

  /**
   * 创建 API Key 凭证
   */
  async createApiKeyCredential(
    providerId: string,
    data: {
      name: string
      api_key: string
      config?: any
    },
    userId: string
  ) {
    // 加密 API Key
    const encryptedKey = await CryptoService.encrypt(data.api_key, this.env)
    const keyHint = CryptoService.createKeyHint(data.api_key)

    // 创建凭证
    const credential: CredentialInsert = {
      workspace_id: this.workspaceId,
      provider_id: providerId,
      credential_type: 'api_key',
      name: data.name,
      encrypted_key: encryptedKey,
      key_hint: keyHint,
      config: data.config || {},
      created_by: userId
    }

    const { data: newCredential, error } = await this.supabase
      .from('provider_credentials')
      .insert(credential)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('同名凭证已存在')
      }
      throw error
    }

    // 创建统计记录
    await this.createUsageStats(newCredential.id)

    return {
      ...newCredential,
      encrypted_key: undefined
    }
  }

  /**
   * 创建 OAuth 凭证
   */
  async createOAuthCredential(
    providerId: string,
    data: {
      name: string
      oauth_data: any
      config?: any
    },
    userId: string
  ) {
    // 加密 tokens
    const encryptedOAuthData = {
      ...data.oauth_data,
      tokens: {
        ...data.oauth_data.tokens,
        access_token: await CryptoService.encrypt(
          data.oauth_data.tokens.access_token, 
          this.env
        ),
        refresh_token: await CryptoService.encrypt(
          data.oauth_data.tokens.refresh_token,
          this.env
        )
      }
    }

    const credential: CredentialInsert = {
      workspace_id: this.workspaceId,
      provider_id: providerId,
      credential_type: 'oauth_account',
      name: data.name,
      oauth_data: encryptedOAuthData,
      config: data.config || {},
      created_by: userId
    }

    const { data: newCredential, error } = await this.supabase
      .from('provider_credentials')
      .insert(credential)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('同名凭证已存在')
      }
      throw error
    }

    // 创建统计记录
    await this.createUsageStats(newCredential.id)

    return {
      ...newCredential,
      oauth_data: {
        ...newCredential.oauth_data as any,
        tokens: undefined
      }
    }
  }

  /**
   * 解密凭证（敏感操作）
   */
  async decryptCredential(providerId: string, credentialId: string) {
    const { data, error } = await this.supabase
      .from('provider_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)
      .single()

    if (error || !data) {
      throw new ResourceNotFoundError('凭证不存在')
    }

    if (data.credential_type === 'api_key' && data.encrypted_key) {
      return {
        type: 'api_key',
        value: await CryptoService.decrypt(data.encrypted_key, this.env)
      }
    } else if (data.credential_type === 'oauth_account' && data.oauth_data) {
      const oauthData = data.oauth_data as any
      return {
        type: 'oauth_account',
        value: {
          ...oauthData,
          tokens: {
            ...oauthData.tokens,
            access_token: await CryptoService.decrypt(
              oauthData.tokens.access_token,
              this.env
            ),
            refresh_token: await CryptoService.decrypt(
              oauthData.tokens.refresh_token,
              this.env
            )
          }
        }
      }
    }

    throw new ValidationError('凭证类型无效')
  }


  /**
   * 创建使用统计记录
   */
  private async createUsageStats(credentialId: string) {
    const { error } = await this.supabase
      .from('credential_usage_stats')
      .insert({ credential_id: credentialId })

    if (error) {
      console.error('Failed to create usage stats:', error)
    }
  }

  /**
   * 更新凭证
   */
  async updateCredential(
    providerId: string,
    credentialId: string,
    updates: CredentialUpdate
  ) {
    const { data, error } = await this.supabase
      .from('provider_credentials')
      .update(updates)
      .eq('id', credentialId)
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single()

    if (error || !data) {
      throw new ResourceNotFoundError('凭证不存在')
    }

    return data
  }

  /**
   * 删除凭证
   */
  async deleteCredential(providerId: string, credentialId: string) {
    const { error } = await this.supabase
      .from('provider_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('provider_id', providerId)
      .eq('workspace_id', this.workspaceId)

    if (error) {
      throw new ResourceNotFoundError('凭证不存在')
    }
  }

}