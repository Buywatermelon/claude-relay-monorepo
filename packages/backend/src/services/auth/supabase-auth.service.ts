import { getSupabaseAdmin } from '../../lib/supabase'
import type { AuthUser } from '@supabase/supabase-js'

export class SupabaseAuthService {
  private supabaseAdmin = getSupabaseAdmin()
  
  /**
   * 用户注册
   */
  async register(data: {
    email: string
    password: string
    fullName?: string
  }) {
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName
      }
    })

    if (authError) throw authError
    return authData.user
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string) {
    const { data, error } = await this.supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }


  /**
   * 验证用户令牌
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    const { data: { user }, error } = await this.supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
  }


  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error) throw error
    return data
  }
}