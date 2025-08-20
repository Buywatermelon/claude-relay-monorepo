import { getSupabaseAdmin } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Permission = Database['public']['Tables']['permissions']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];

export class PermissionService {
  private supabase = getSupabaseAdmin();

  /**
   * 获取角色的所有权限
   */
  async getRolePermissions(roleName: string): Promise<Permission[]> {
    const supabase = this.supabase;

    // 1. 获取角色信息
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !role) {
      console.error('获取角色失败:', roleError);
      return [];
    }

    // 2. 获取角色对应的权限
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          id,
          action,
          subject,
          conditions,
          fields,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('role_id', role.id);

    if (error) {
      console.error('获取权限失败:', error);
      return [];
    }

    // 3. 提取权限对象
    return permissions
      ?.map(rp => rp.permissions)
      .filter((p): p is Permission => p !== null) || [];
  }

  /**
   * 检查角色是否有特定权限
   */
  async hasPermission(
    roleName: string,
    action: string,
    subject: string
  ): Promise<boolean> {
    const permissions = await this.getRolePermissions(roleName);
    
    return permissions.some(p => 
      p.action === action && p.subject === subject
    );
  }
}