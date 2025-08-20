/**
 * 工作空间成员管理路由
 * 处理成员的查询、审批、角色管理等功能
 * 
 * 所有路由都需要在 header 中提供 X-Workspace-Slug
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WorkspaceService } from '../../services/workspace/workspace.service';
import { requirePermission } from '../../middleware/permission';
import { ResourceNotFoundError, ValidationError } from '../../utils/errors';

export const memberRoutes = new Hono();
const workspaceService = new WorkspaceService();

// 注意：认证和工作空间成员验证已在 apiRoutes 中统一处理

// 验证模式
const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'])
});

const membershipIdParamSchema = z.object({
  membershipId: z.string()
});

/**
 * 获取工作空间成员列表
 * GET /api/members?status=active|pending
 * 权限：所有成员都可以查看
 */
memberRoutes.get('/',
  requirePermission('read', 'Membership'),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const status = c.req.query('status') as any;
    
    const members = await workspaceService.getMembers({
      workspaceId,
      status: status ? [status] : ['active']
    });
    
    return c.json(members);
  }
);

/**
 * 审批成员加入申请
 * POST /api/members/:membershipId/approve
 * 权限：owner 和 admin 可以审批
 */
memberRoutes.post('/:membershipId/approve',
  zValidator('param', membershipIdParamSchema),
  requirePermission('approve', 'Membership'),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const { membershipId } = c.req.valid('param');
    const user = c.get('user');
    
    const member = await workspaceService.approveMember(workspaceId, membershipId, user.id);
    
    return c.json(member);
  }
);

/**
 * 拒绝成员加入申请
 * POST /api/members/:membershipId/reject
 * 权限：owner 和 admin 可以拒绝
 */
memberRoutes.post('/:membershipId/reject',
  zValidator('param', membershipIdParamSchema),
  requirePermission('reject', 'Membership'),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const { membershipId } = c.req.valid('param');
    const body = await c.req.json() as { reason?: string };
    
    const member = await workspaceService.rejectMember(workspaceId, membershipId, body.reason);
    
    return c.json(member);
  }
);

/**
 * 修改成员角色
 * PATCH /api/members/:membershipId
 * 权限：owner 和 admin 可以修改
 * 限制：不能修改 owner 的角色
 */
memberRoutes.patch('/:membershipId',
  zValidator('param', membershipIdParamSchema),
  zValidator('json', updateMemberRoleSchema),
  requirePermission('update', 'Membership'),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const { membershipId } = c.req.valid('param');
    const { role } = c.req.valid('json');
    
    // 获取目标成员信息以进行额外验证
    const members = await workspaceService.getMembers({ workspaceId });
    const targetMember = members.find(m => m.id === membershipId);
    
    if (!targetMember) {
      throw new ResourceNotFoundError('成员不存在')
    }
    
    // 不能修改 owner 的角色
    if (targetMember.role === 'owner') {
      throw new ValidationError('不能修改工作空间所有者的角色')
    }
    
    const member = await workspaceService.updateMemberRole(workspaceId, membershipId, role);
    
    return c.json(member);
  }
);

/**
 * 移除成员
 * DELETE /api/members/:membershipId
 * 权限：owner 和 admin 可以移除成员
 * 限制：不能移除 owner，成员可以自己退出
 */
memberRoutes.delete('/:membershipId',
  zValidator('param', membershipIdParamSchema),
  requirePermission('delete', 'Membership'),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const currentUserId = c.get('user').id;
    const { membershipId } = c.req.valid('param');
    
    // 获取目标成员信息
    const members = await workspaceService.getMembers({ workspaceId });
    const targetMember = members.find(m => m.id === membershipId);
    
    if (!targetMember) {
      throw new ResourceNotFoundError('成员不存在')
    }
    
    // 不能移除 owner
    if (targetMember.role === 'owner') {
      throw new ValidationError('不能移除工作空间所有者')
    }
    
    // 如果是移除自己，允许（退出工作空间）
    if (targetMember.user?.id === currentUserId) {
      await workspaceService.removeMember(workspaceId, membershipId);
      return c.json({ success: true, message: '已退出工作空间' });
    }
    
    await workspaceService.removeMember(workspaceId, membershipId);
    
    return c.json({ success: true });
  }
);