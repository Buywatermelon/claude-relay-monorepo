/**
 * 供应商凭证管理路由
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../../../middleware/auth'
import { requireWorkspaceMember } from '../../../middleware/workspace'
import { requirePermission } from '../../../middleware/permission'
import { CredentialService } from '../../../services/provider/credential.service'
import {
  CreateCredentialSchema,
  UpdateCredentialSchema,
  ListCredentialsQuerySchema
} from './schemas'
import statsRoutes from './stats'

const app = new Hono()

// 挂载统计路由
app.route('/:providerId/credentials', statsRoutes)

// 获取凭证列表
app.get(
  '/:providerId/credentials',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('read', 'Provider'),
  zValidator('query', ListCredentialsQuerySchema),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('providerId')
    const query = c.req.valid('query')

    const service = new CredentialService(workspaceId, c.env)
    const result = await service.listCredentials(providerId, query)

    return c.json(result)
  }
)

// 获取单个凭证
app.get(
  '/:providerId/credentials/:id',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('read', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('providerId')
    const credentialId = c.req.param('id')

    const service = new CredentialService(workspaceId, c.env)
    const credential = await service.getCredential(providerId, credentialId)

    return c.json(credential)
  }
)

// 创建凭证
app.post(
  '/:providerId/credentials',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('update', 'Provider'),
  zValidator('json', CreateCredentialSchema),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const userId = c.get('userId')
    const providerId = c.req.param('providerId')
    const body = c.req.valid('json')

    const service = new CredentialService(workspaceId, c.env)
    
    let result
    if (body.credential_type === 'api_key') {
      result = await service.createApiKeyCredential(
        providerId,
        body.data,
        userId
      )
    } else {
      result = await service.createOAuthCredential(
        providerId,
        body.data,
        userId
      )
    }

    return c.json(result, 201)
  }
)

// 更新凭证
app.put(
  '/:providerId/credentials/:id',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('update', 'Provider'),
  zValidator('json', UpdateCredentialSchema),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('providerId')
    const credentialId = c.req.param('id')
    const updates = c.req.valid('json')

    const service = new CredentialService(workspaceId, c.env)
    const result = await service.updateCredential(providerId, credentialId, updates)

    return c.json(result)
  }
)

// 删除凭证
app.delete(
  '/:providerId/credentials/:id',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('update', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('providerId')
    const credentialId = c.req.param('id')

    const service = new CredentialService(workspaceId, c.env)
    await service.deleteCredential(providerId, credentialId)

    return c.json({ success: true })
  }
)

// 解密凭证（敏感操作）
app.post(
  '/:providerId/credentials/:id/decrypt',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('manage', 'Provider'),  // 需要更高权限
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const providerId = c.req.param('providerId')
    const credentialId = c.req.param('id')

    const service = new CredentialService(workspaceId, c.env)
    const decrypted = await service.decryptCredential(providerId, credentialId)

    return c.json(decrypted)
  }
)


export default app