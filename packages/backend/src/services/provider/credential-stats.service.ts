/**
 * 凭证使用统计服务
 */

import { getSupabaseAdmin } from '../../lib/supabase'
import { ResourceNotFoundError } from '../../utils/errors'
import type { Tables } from '../../lib/database.types'

type UsageStats = Tables<'credential_usage_stats'>

export class CredentialStatsService {
  private supabase = getSupabaseAdmin()

  constructor(private workspaceId: string) {}

  /**
   * 获取凭证使用统计
   */
  async getStats(credentialId: string) {
    const { data, error } = await this.supabase
      .from('credential_usage_stats')
      .select('*')
      .eq('credential_id', credentialId)
      .single()

    if (error || !data) {
      throw new ResourceNotFoundError('统计数据不存在')
    }

    return data
  }


  /**
   * 更新请求统计（由代理服务调用）
   */
  async recordRequest(credentialId: string, success: boolean, latencyMs?: number) {
    const updates: any = {
      total_requests: this.supabase.sql`total_requests + 1`,
      hourly_usage: this.supabase.sql`hourly_usage + 1`,
      daily_usage: this.supabase.sql`daily_usage + 1`,
      monthly_usage: this.supabase.sql`monthly_usage + 1`,
      last_used_at: new Date().toISOString()
    }

    if (!success) {
      updates.failed_requests = this.supabase.sql`failed_requests + 1`
    }

    const { error } = await this.supabase
      .from('credential_usage_stats')
      .update(updates)
      .eq('credential_id', credentialId)

    if (error) {
      console.error('Failed to update usage stats:', error)
    }

    // 更新性能指标（简化版，实际应该使用滑动窗口）
    if (latencyMs !== undefined) {
      await this.updatePerformanceMetrics(credentialId, latencyMs)
    }
  }

  /**
   * 记录错误
   */
  async recordError(credentialId: string, error: string) {
    const { error: updateError } = await this.supabase
      .from('credential_usage_stats')
      .update({
        last_error: error,
        last_error_at: new Date().toISOString()
      })
      .eq('credential_id', credentialId)

    if (updateError) {
      console.error('Failed to record error:', updateError)
    }
  }

}