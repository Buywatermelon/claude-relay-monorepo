/**
 * 数据库种子脚本
 * 初始化系统必需的基础数据
 */

import { getDatabase } from './init';
import { users, roles, permissions, rolePermissions, userRoles } from './schema';
import { eq } from 'drizzle-orm';
import { generateId, hashPassword } from '../utils/auth';

// ============================================
// 配置常量
// ============================================

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

// ============================================
// 种子数据定义
// ============================================

const seedData = {
  // 系统角色
  roles: [
    { id: 'super_admin', name: '超级管理员', description: '拥有系统所有权限', isSystem: true },
    { id: 'admin', name: '管理员', description: '拥有管理权限', isSystem: true },
    { id: 'operator', name: '操作员', description: '拥有操作权限', isSystem: true },
    { id: 'viewer', name: '查看者', description: '只读权限', isSystem: true }
  ],

  // 系统权限
  permissions: [
    // 用户管理
    { id: 'users.read', resource: 'users', action: 'read', description: '查看用户' },
    { id: 'users.write', resource: 'users', action: 'write', description: '创建和更新用户' },
    { id: 'users.delete', resource: 'users', action: 'delete', description: '删除用户' },
    
    // 角色管理
    { id: 'roles.read', resource: 'roles', action: 'read', description: '查看角色' },
    { id: 'roles.write', resource: 'roles', action: 'write', description: '创建和更新角色' },
    { id: 'roles.delete', resource: 'roles', action: 'delete', description: '删除角色' },
    
    // 权限管理
    { id: 'permissions.read', resource: 'permissions', action: 'read', description: '查看权限' },
    { id: 'permissions.assign', resource: 'permissions', action: 'assign', description: '分配权限' },
    
    // 供应商管理
    { id: 'providers.read', resource: 'providers', action: 'read', description: '查看供应商' },
    { id: 'providers.write', resource: 'providers', action: 'write', description: '创建和更新供应商' },
    { id: 'providers.delete', resource: 'providers', action: 'delete', description: '删除供应商' },
    
    // 密钥池管理
    { id: 'keys.read', resource: 'keys', action: 'read', description: '查看 API 密钥' },
    { id: 'keys.write', resource: 'keys', action: 'write', description: '添加和更新 API 密钥' },
    { id: 'keys.delete', resource: 'keys', action: 'delete', description: '删除 API 密钥' },
    
    // Claude 账号管理
    { id: 'claude_accounts.read', resource: 'claude_accounts', action: 'read', description: '查看 Claude 账号' },
    { id: 'claude_accounts.write', resource: 'claude_accounts', action: 'write', description: '添加和更新 Claude 账号' },
    { id: 'claude_accounts.delete', resource: 'claude_accounts', action: 'delete', description: '删除 Claude 账号' },
    
    // 路由管理
    { id: 'routes.read', resource: 'routes', action: 'read', description: '查看路由配置' },
    { id: 'routes.write', resource: 'routes', action: 'write', description: '创建和更新路由配置' },
    { id: 'routes.delete', resource: 'routes', action: 'delete', description: '删除路由配置' },
    
    // 系统管理
    { id: 'system.audit', resource: 'system', action: 'audit', description: '查看审计日志' },
    { id: 'system.config', resource: 'system', action: 'config', description: '管理系统配置' }
  ],

  // 角色权限映射
  rolePermissionMappings: {
    // 超级管理员：所有权限
    super_admin: '*',
    
    // 管理员：除系统关键权限外的所有权限
    admin: {
      exclude: ['system.config', 'roles.delete', 'permissions.assign']
    },
    
    // 操作员：业务操作权限
    operator: [
      'providers.read', 'providers.write',
      'keys.read', 'keys.write',
      'claude_accounts.read', 'claude_accounts.write',
      'routes.read', 'routes.write'
    ],
    
    // 查看者：所有只读权限
    viewer: {
      filter: (p: any) => p.action === 'read'
    }
  }
};

// ============================================
// 种子数据初始化
// ============================================

async function seedDatabase() {
  const db = getDatabase();
  
  console.log('🌱 开始初始化数据库种子数据...\n');

  try {
    // 1. 创建角色
    console.log('📋 创建系统角色...');
    for (const role of seedData.roles) {
      await db.insert(roles)
        .values(role)
        .onConflictDoNothing()
        .run();
      console.log(`   ✓ ${role.name}`);
    }

    // 2. 创建权限
    console.log('\n🔐 创建系统权限...');
    let permissionCount = 0;
    for (const permission of seedData.permissions) {
      await db.insert(permissions)
        .values(permission)
        .onConflictDoNothing()
        .run();
      permissionCount++;
    }
    console.log(`   ✓ 已创建 ${permissionCount} 个权限`);

    // 3. 分配角色权限
    console.log('\n🔗 分配角色权限...');
    const allPermissions = await db.select().from(permissions);
    
    for (const [roleId, mapping] of Object.entries(seedData.rolePermissionMappings)) {
      let permissionsToAssign: typeof allPermissions = [];
      
      if (mapping === '*') {
        // 所有权限
        permissionsToAssign = allPermissions;
      } else if (Array.isArray(mapping)) {
        // 指定权限列表
        permissionsToAssign = allPermissions.filter(p => mapping.includes(p.id));
      } else if (typeof mapping === 'object') {
        if ('exclude' in mapping) {
          // 排除特定权限
          permissionsToAssign = allPermissions.filter(p => !mapping.exclude.includes(p.id));
        } else if ('filter' in mapping) {
          // 根据过滤器选择权限
          permissionsToAssign = allPermissions.filter(mapping.filter);
        }
      }
      
      // 批量插入权限
      for (const perm of permissionsToAssign) {
        await db.insert(rolePermissions)
          .values({
            roleId,
            permissionId: perm.id
          })
          .onConflictDoNothing()
          .run();
      }
      
      const role = seedData.roles.find(r => r.id === roleId);
      console.log(`   ✓ ${role?.name}: ${permissionsToAssign.length} 个权限`);
    }

    // 4. 创建默认管理员账号
    console.log('\n👤 检查默认管理员账号...');
    
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    if (existingAdmin.length === 0) {
      const adminId = generateId('user');
      const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
      
      // 创建管理员用户
      await db.insert(users).values({
        id: adminId,
        username: 'admin',
        email: 'admin@localhost',
        passwordHash,
        isSuperAdmin: true,
        isActive: true
      });

      // 分配超级管理员角色
      await db.insert(userRoles).values({
        userId: adminId,
        roleId: 'super_admin'
      });

      console.log('   ✓ 默认管理员账号已创建');
      console.log(`\n   🔑 登录信息：`);
      console.log(`      用户名: admin`);
      console.log(`      密码: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log(`\n   ⚠️  请立即修改默认密码！`);
    } else {
      console.log('   ℹ️  管理员账号已存在');
    }

    console.log('\n✅ 数据库种子数据初始化完成！');
    
  } catch (error) {
    console.error('\n❌ 种子数据初始化失败:', error);
    throw error;
  }
}

// ============================================
// 主函数
// ============================================

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n🎉 所有操作完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 执行失败:', error);
      process.exit(1);
    });
}

export { seedDatabase };