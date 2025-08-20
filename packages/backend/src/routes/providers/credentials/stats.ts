/**
 * 凭证统计路由
 */

import { Hono } from 'hono'
import { requireAuth } from '../../../middleware/auth'
import { requireWorkspaceMember } from '../../../middleware/workspace'
import { requirePermission } from '../../../middleware/permission'
import { CredentialStatsService } from '../../../services/provider/credential-stats.service'

const app = new Hono()

// 获取凭证统计
app.get(
  '/:id/stats',
  requireAuth,
  requireWorkspaceMember,
  requirePermission('read', 'Provider'),
  async (c) => {
    const workspaceId = c.get('workspaceId')
    const credentialId = c.req.param('id')

    const service = new CredentialStatsService(workspaceId)
    const stats = await service.getStats(credentialId)

    return c.json(stats)
  }
)

export default app