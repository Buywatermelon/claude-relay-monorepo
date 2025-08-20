/**
 * 供应商凭证管理 API Schema 定义
 */

import { z } from 'zod'

// 凭证类型枚举
export const CredentialType = z.enum(['api_key', 'oauth_account'])

// 凭证状态枚举
export const CredentialStatus = z.enum(['active', 'inactive', 'expired', 'rate_limited'])

// OAuth 数据结构
export const OAuthDataSchema = z.object({
  email: z.string().email(),
  user_id: z.string(),
  tokens: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.string().datetime()
  }),
  scopes: z.array(z.string()).optional(),
  profile: z.record(z.any()).optional()
})

// 创建 API Key 凭证
export const CreateApiKeyCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  api_key: z.string().min(1),
  config: z.object({
    daily_limit: z.number().optional(),
    monthly_limit: z.number().optional(),
    rate_limit: z.number().optional()
  }).optional()
})

// 创建 OAuth 凭证
export const CreateOAuthCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  oauth_data: OAuthDataSchema,
  config: z.record(z.any()).optional()
})

// 创建凭证（统一）
export const CreateCredentialSchema = z.discriminatedUnion('credential_type', [
  z.object({
    credential_type: z.literal('api_key'),
    data: CreateApiKeyCredentialSchema
  }),
  z.object({
    credential_type: z.literal('oauth_account'),
    data: CreateOAuthCredentialSchema
  })
])

// 更新凭证
export const UpdateCredentialSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: CredentialStatus.optional(),
  config: z.record(z.any()).optional()
})


// 查询参数
export const ListCredentialsQuerySchema = z.object({
  credential_type: CredentialType.optional(),
  status: CredentialStatus.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z.enum(['name', 'created_at', 'last_used_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})