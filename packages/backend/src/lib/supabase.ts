/**
 * Supabase 客户端配置
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// 从环境变量获取配置
const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  return { url, serviceRoleKey, anonKey }
}

// 服务端管理员客户端（绕过 RLS，用于系统操作）
export const createSupabaseAdmin = () => {
  const { url, serviceRoleKey } = getSupabaseConfig()
  
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

// 创建用户专属客户端（遵守 RLS）
export const createUserClient = (token: string) => {
  const { url, anonKey } = getSupabaseConfig()
  
  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY for user client')
  }
  
  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false
    }
  })
}

// 默认管理员客户端实例（延迟初始化）
let supabaseAdmin: ReturnType<typeof createSupabaseAdmin> | null = null

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseAdmin()
  }
  return supabaseAdmin
}