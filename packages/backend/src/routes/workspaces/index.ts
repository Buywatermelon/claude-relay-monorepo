/**
 * 工作空间路由模块
 * 处理工作空间的创建、管理等核心功能
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { WorkspaceService } from '../../services/workspace/workspace.service';
import { requireAuth } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { requirePermission } from '../../middleware/permission';
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
  workspaceIdParamSchema
} from './schemas';

export const workspaceRoutes = new Hono();
const workspaceService = new WorkspaceService();

// 所有路由都需要认证
workspaceRoutes.use('*', requireAuth);

/**
 * 创建新的工作空间
 * POST /workspaces
 */
workspaceRoutes.post('/',
  zValidator('json', createWorkspaceSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    
    const workspace = await workspaceService.createWorkspace(user.id, data);
    
    return c.json(workspace);
  }
);

/**
 * 获取当前用户所在的所有工作空间
 * GET /workspaces/mine
 */
workspaceRoutes.get('/mine', async (c) => {
  const user = c.get('user');
  const workspaces = await workspaceService.getUserWorkspaces(user.id);
  
  return c.json(workspaces);
});

/**
 * 获取工作空间详情
 * GET /workspaces/:id
 * 权限：需要是工作空间成员
 */
workspaceRoutes.get('/:id',
  zValidator('param', workspaceIdParamSchema),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    
    // 注意：这里直接通过 service 检查权限，因为还没有设置 workspace context
    const workspace = await workspaceService.getWorkspaceById(id, user.id);
    
    if (!workspace) {
      return c.json({ error: '工作空间不存在或无权访问' }, 404);
    }
    
    return c.json(workspace);
  }
);

/**
 * 删除工作空间
 * DELETE /workspaces/:id
 * 权限：只有 owner 可以删除工作空间
 */
workspaceRoutes.delete('/:id',
  zValidator('param', workspaceIdParamSchema),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    
    // 先获取工作空间信息和用户角色
    const workspaceWithRole = await workspaceService.getWorkspace(id, user.id);
    
    if (!workspaceWithRole) {
      return c.json({ error: '工作空间不存在' }, 404);
    }
    
    if (workspaceWithRole.role !== 'owner') {
      return c.json({ error: '只有工作空间所有者可以删除工作空间' }, 403);
    }
    
    await workspaceService.deleteWorkspace(id);
    
    return c.json({ success: true });
  }
);

/**
 * 通过加入码申请加入工作空间
 * POST /workspaces/join
 * 会产生一个 pending 状态的成员记录，需要管理员审批
 */
workspaceRoutes.post('/join',
  zValidator('json', joinWorkspaceSchema),
  async (c) => {
    const user = c.get('user');
    const { join_code } = c.req.valid('json');
    
    const result = await workspaceService.joinWorkspaceByCode(user.id, join_code);
    
    return c.json(result);
  }
);