import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../../middleware/auth'
import { requireWorkspaceMember } from '../../middleware/workspace'
import { requirePermission } from '../../middleware/permission'
import { ProviderService } from '../../services/provider/provider.service'
import type { AuthUser } from '@supabase/supabase-js'
import { ResourceNotFoundError } from '../../utils/errors'
import credentialsRoutes from '../providers/credentials'

const providers = new Hono()

// 创建供应商的请求体验证
const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['claude', 'openai', 'gemini']),
  endpoint: z.string().optional(),
  config: z.object({
    auth_method: z.enum(['api_key', 'oauth'])
  }),
  models: z.array(z.string()).min(1),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional()
})

// 更新供应商的请求体验证
const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  endpoint: z.string().optional(),
  config: z.object({
    auth_method: z.enum(['api_key', 'oauth'])
  }).optional(),
  models: z.array(z.string()).min(1).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional()
})

const providerService = new ProviderService()

// 挂载凭证管理路由
providers.route('/', credentialsRoutes)

// 获取供应商列表
providers.get('/', 
  requireAuth, 
  requireWorkspaceMember,
  requirePermission('read', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providersList = await providerService.getProviders(workspaceId)
    return c.json({ data: providersList })
  }
)

// 获取单个供应商
providers.get('/:id', 
  requireAuth, 
  requireWorkspaceMember,
  requirePermission('read', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('id')
    
    const provider = await providerService.getProvider(workspaceId, providerId)
    
    if (!provider) {
      throw new ResourceNotFoundError('供应商不存在')
    }
    
    return c.json({ data: provider })
  }
)

// 创建供应商
providers.post(
  '/',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('create', 'Provider'),
  zValidator('json', createProviderSchema),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const user = c.get('user') as AuthUser
    const data = c.req.valid('json')
    
    const provider = await providerService.createProvider(workspaceId, user.id, data)
    
    return c.json({ data: provider }, 201)
  }
)

// 更新供应商
providers.put(
  '/:id',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('update', 'Provider'),
  zValidator('json', updateProviderSchema),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('id')
    const data = c.req.valid('json')
    
    const provider = await providerService.updateProvider(workspaceId, providerId, data)
    
    return c.json({ data: provider })
  }
)

// 删除供应商
providers.delete('/:id', 
  requireAuth, 
  requireWorkspaceMember,
  requirePermission('delete', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('id')
    
    await providerService.deleteProvider(workspaceId, providerId)
    
    return c.json({ message: '删除成功' })
  }
)

export { providers }