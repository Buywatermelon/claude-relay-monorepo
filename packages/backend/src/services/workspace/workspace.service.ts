import { getSupabaseAdmin } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { nanoid } from 'nanoid';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
type MembershipStatus = Database['public']['Tables']['workspace_members']['Row']['status'];
type MemberRole = Database['public']['Tables']['workspace_members']['Row']['role'];

export interface WorkspaceWithRole extends Workspace {
  role?: MemberRole;
  membershipStatus?: MembershipStatus;
}

export interface MemberWithUser extends WorkspaceMember {
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

export interface GetMembersOptions {
  workspaceId: string;
  status?: MembershipStatus[];
  role?: MemberRole[];
}

export class WorkspaceService {
  private supabaseAdmin = getSupabaseAdmin();

  async createWorkspace(userId: string, data: { name: string; description?: string }) {
    const joinCode = nanoid(10);
    const slug = `ws-${nanoid(8)}`;

    const { data: workspace, error } = await this.supabaseAdmin
      .from('workspaces')
      .insert({
        name: data.name,
        slug,
        description: data.description,
        join_code: joinCode,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabaseAdmin.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString()
    });

    await this.logAuditEvent({
      workspace_id: workspace.id,
      user_id: userId,
      action: 'workspace.created',
      resource_type: 'workspace',
      resource_id: workspace.id
    });

    return workspace;
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    const { data, error } = await this.supabaseAdmin
      .from('workspace_members')
      .select(`
        role,
        status,
        workspace:workspaces(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    return data
      .filter(item => item.workspace !== null)
      .map(item => ({
        ...item.workspace!,
        role: item.role,
        membershipStatus: item.status
      }));
  }

  /**
   * 通过 ID 或 slug 获取工作空间信息
   * @param identifier 工作空间 ID（UUID）或 slug
   * @param userId 用户 ID
   * @returns 工作空间信息及用户角色
   */
  async getWorkspace(identifier: string, userId: string): Promise<WorkspaceWithRole | null> {
    // 判断是 UUID 还是 slug（UUID 格式包含连字符且长度为 36）
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const query = this.supabaseAdmin
      .from('workspaces')
      .select('*');
    
    // 根据标识符类型使用不同的查询条件
    const { data: workspace, error: wsError } = await (isUuid 
      ? query.eq('id', identifier)
      : query.eq('slug', identifier)
    ).single();

    if (wsError || !workspace) return null;

    const { data: membership } = await this.supabaseAdmin
      .from('workspace_members')
      .select('role, status')
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
      .single();

    return {
      ...workspace,
      role: membership?.role,
      membershipStatus: membership?.status
    };
  }

  /**
   * @deprecated 使用 getWorkspace 代替
   */
  async getWorkspaceById(workspaceId: string, userId: string): Promise<WorkspaceWithRole | null> {
    return this.getWorkspace(workspaceId, userId);
  }

  async deleteWorkspace(workspaceId: string) {
    const { error } = await this.supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) throw error;
  }

  async joinWorkspaceByCode(userId: string, joinCode: string) {
    const { data: workspace, error: wsError } = await this.supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('join_code', joinCode)
      .single();

    if (wsError || !workspace) {
      throw new Error('无效的加入码');
    }

    const { data: existingMember } = await this.supabaseAdmin
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('您已经是该工作空间的成员');
      }
      if (existingMember.status === 'pending') {
        throw new Error('您的加入申请正在审批中');
      }
    }

    const { data: membership, error: memberError } = await this.supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'member',
        status: 'pending'
      })
      .select()
      .single();

    if (memberError) throw memberError;

    await this.logAuditEvent({
      workspace_id: workspace.id,
      user_id: userId,
      action: 'workspace.join_requested',
      resource_type: 'workspace_member',
      resource_id: membership.id
    });

    return { workspace, membership };
  }

  async getMembers(options: GetMembersOptions): Promise<MemberWithUser[]> {
    let query = this.supabaseAdmin
      .from('workspace_members')
      .select('*, user_id')
      .eq('workspace_id', options.workspaceId);

    // 支持多个状态筛选
    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    // 支持多个角色筛选
    if (options.role && options.role.length > 0) {
      query = query.in('role', options.role);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 批量获取用户信息
    const userIds = data.map(m => m.user_id);
    const { data: users } = await this.supabaseAdmin.auth.admin.listUsers();
    
    const userMap = new Map(
      users?.users
        ?.filter(u => userIds.includes(u.id))
        ?.map(u => [u.id, { id: u.id, email: u.email!, user_metadata: u.user_metadata }])
    );

    return data.map(member => ({
      ...member,
      user: userMap.get(member.user_id)
    }));
  }

  /**
   * 批准成员加入申请
   * @param workspaceId 工作空间ID
   * @param membershipId 成员关系ID
   * @param approverId 审批人ID（可选）
   */
  async approveMember(workspaceId: string, membershipId: string, approverId?: string) {
    const updateData: any = {
      status: 'active',
      joined_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };
    
    if (approverId) {
      updateData.approved_by = approverId;
    }

    const { data, error } = await this.supabaseAdmin
      .from('workspace_members')
      .update(updateData)
      .eq('id', membershipId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 拒绝成员加入申请
   * @param workspaceId 工作空间ID
   * @param membershipId 成员关系ID
   * @param rejectReason 拒绝原因（可选）
   */
  async rejectMember(workspaceId: string, membershipId: string, rejectReason?: string) {
    const updateData: any = {
      status: 'rejected'
    };
    
    if (rejectReason) {
      updateData.reject_reason = rejectReason;
    }

    const { data, error } = await this.supabaseAdmin
      .from('workspace_members')
      .update(updateData)
      .eq('id', membershipId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMemberRole(workspaceId: string, membershipId: string, newRole: MemberRole) {
    const { data, error } = await this.supabaseAdmin
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', membershipId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeMember(workspaceId: string, membershipId: string) {
    const { error } = await this.supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('id', membershipId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
  }

  async getUserRole(userId: string, workspaceId: string): Promise<MemberRole | null> {
    const { data, error } = await this.supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;
    return data.role;
  }

  async logAuditEvent(event: {
    workspace_id: string;
    user_id: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    details?: any;
  }) {
    await this.supabaseAdmin.from('audit_logs').insert(event);
  }
}