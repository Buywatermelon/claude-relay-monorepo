# Supabase 迁移方案

## 概述

本文档详细说明了将 Claude Relay 项目从当前的 SQLite + Lucia Auth + Cloudflare KV 架构迁移到完全基于 Supabase 的现代化架构的完整方案。

## 迁移目标

1. **数据存储**：完全使用 Supabase PostgreSQL（不再使用 SQLite 和 Cloudflare KV）
2. **身份认证**：使用 Supabase Auth 替代 Lucia Auth
3. **权限管理**：实现基于工作空间的多租户权限系统
4. **第三方登录**：支持 Google、GitHub 等 OAuth 提供商
5. **API 密钥管理**：区分用户 API Key（访问 Claude Relay）和供应商 API Key（访问 AI 服务）
6. **保持 CASL**：继续使用 CASL 进行细粒度权限控制

## 架构对比

### 当前架构
- **数据库**：SQLite（本地）+ Cloudflare KV（生产）
- **认证**：Lucia Auth + 自定义会话管理
- **ORM**：Drizzle ORM
- **权限**：基于角色的权限系统（RBAC）
- **部署**：Cloudflare Workers

### 目标架构
- **数据库**：Supabase PostgreSQL
- **认证**：Supabase Auth（JWT）
- **查询**：Supabase Client（无需 ORM）
- **权限**：RLS + CASL 双层权限
- **部署**：Cloudflare Workers + Supabase Cloud/自托管

## 数据库设计

### 核心概念说明

#### 1. 工作空间 (Workspace)
工作空间是多租户隔离的核心，每个工作空间拥有独立的：
- 供应商配置
- API 密钥池
- 模型配置
- 路由规则
- 审计日志

**slug 字段**：URL 友好的唯一标识符，用于：
- 构建用户友好的 URL：`app.example.com/workspace/acme-corp`
- API 路径：`/api/workspaces/acme-corp/providers`
- 比 UUID 更易记忆和分享

#### 2. 两种 API Key 的区别

**用户 API Key (user_api_keys)**：
- **用途**：客户端应用调用 Claude Relay API 的凭证
- **创建者**：工作空间的 member 及以上角色成员
- **使用方式**：`Authorization: Bearer cr_live_xxxxx`
- **权限控制**：通过 scopes 字段控制可访问的 API 端点
- **存储方式**：哈希存储，生成后不可查看原文

**供应商 API Key (provider_api_keys)**：
- **用途**：Claude Relay 后端访问第三方 AI 服务的凭证
- **创建者**：工作空间的 admin 及以上角色成员
- **使用方式**：由系统内部使用，不暴露给最终用户
- **管理功能**：支持轮换、限额、状态管理
- **存储方式**：使用 Supabase Vault 加密存储

#### 3. 权限层级

- **Owner**：工作空间创建者，拥有所有权限，包括删除工作空间
- **Admin**：可管理供应商、API Keys、邀请成员，但不能删除工作空间
- **Member**：可使用 API，创建自己的 user_api_key，查看配置
- **Viewer**：只能查看配置，不能创建 API Key 或使用服务

### 1. 核心表结构

```sql
-- 工作空间表
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- URL友好的标识
  description text,
  settings jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 工作空间成员表
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions jsonb DEFAULT '{}', -- 自定义权限覆盖
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE(workspace_id, user_id)
);

-- 注：直接使用 auth.users 表，无需额外的 user_profiles 扩展

-- 供应商表
CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  endpoint text,
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- 用户 API Keys 表（用于访问 Claude Relay API）
CREATE TABLE user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  scopes jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id, name)
);

-- 供应商 API Keys 表（用于访问第三方 AI 服务）
CREATE TABLE provider_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  name text,
  encrypted_key text NOT NULL, -- 使用 pgsodium 加密
  key_hint text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'rate_limited')),
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  expires_at timestamptz,
  daily_limit integer,
  monthly_limit integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 模型配置表
CREATE TABLE models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  model_id text NOT NULL,
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, provider_id, model_id)
);

-- 路由配置表
CREATE TABLE route_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  rules jsonb NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 审计日志表
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 用户 API Key 使用记录表
CREATE TABLE user_api_key_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES user_api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_providers_workspace ON providers(workspace_id);
CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_workspace ON user_api_keys(workspace_id);
CREATE INDEX idx_provider_api_keys_provider ON provider_api_keys(provider_id);
CREATE INDEX idx_models_workspace ON models(workspace_id);
CREATE INDEX idx_models_provider ON models(provider_id);
CREATE INDEX idx_route_configs_workspace ON route_configs(workspace_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_user_api_key_logs_key ON user_api_key_logs(api_key_id);
CREATE INDEX idx_user_api_key_logs_created ON user_api_key_logs(created_at);
```

### 2. Row Level Security (RLS) 策略

> **注意**：建议在功能实现完成后再启用 RLS 策略，以简化开发过程。以下策略供后续参考。

```sql
-- 启用 RLS（后续阶段）
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE provider_api_keys ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE models ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE route_configs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_api_key_logs ENABLE ROW LEVEL SECURITY;

-- 工作空间策略
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update workspace" ON workspaces
  FOR UPDATE USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

-- 工作空间成员策略
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members" ON workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- 用户配置策略
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 供应商策略
CREATE POLICY "Members can view providers" ON providers
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage providers" ON providers
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- 用户 API Keys 策略
CREATE POLICY "Users can view own api keys" ON user_api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can create own api keys" ON user_api_keys
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can manage own api keys" ON user_api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own api keys" ON user_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- 供应商 API Keys 策略
CREATE POLICY "Members can view provider api keys" ON provider_api_keys
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage provider api keys" ON provider_api_keys
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- 审计日志策略（只读）
CREATE POLICY "Members can view audit logs" ON audit_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );
```

### 3. 数据库函数和触发器详解

> **设计原则**：只使用触发器处理数据完整性相关的逻辑（如自动更新时间戳），所有业务逻辑都应该在应用层处理，以保持代码的可维护性和可测试性。

#### 3.1 自动更新时间戳（推荐使用触发器）

```sql
-- 通用函数：自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_configs_updated_at BEFORE UPDATE ON route_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**说明**：
- `BEFORE UPDATE`：在数据更新前触发
- `FOR EACH ROW`：对每一行更新都触发
- 自动维护 `updated_at` 字段，无需应用层处理

#### 3.2 业务逻辑函数（在应用层调用）

```sql
-- 函数：更新供应商 API Key 使用统计
CREATE OR REPLACE FUNCTION track_provider_api_key_usage(
  p_api_key_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE provider_api_keys 
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- 函数：记录用户 API Key 访问日志
CREATE OR REPLACE FUNCTION log_user_api_key_access(
  p_api_key_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- 更新最后使用时间
  UPDATE user_api_keys 
  SET last_used_at = now()
  WHERE id = p_api_key_id;
  
  -- 插入访问日志
  INSERT INTO user_api_key_logs (
    api_key_id,
    endpoint,
    method,
    status_code,
    ip_address,
    user_agent
  ) VALUES (
    p_api_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$ LANGUAGE plpgsql;
```

**说明**：
- `track_provider_api_key_usage`：更新供应商 Key 的使用统计
- `log_user_api_key_access`：记录用户 Key 的访问详情
- 这些函数应该在应用层根据业务需要调用，而不是通过触发器自动执行

#### 3.3 辅助函数

```sql
-- 函数：生成 API Key（用于用户 API Keys）
CREATE OR REPLACE FUNCTION generate_api_key(
  p_prefix text DEFAULT 'cr'
)
RETURNS text AS $$
DECLARE
  random_string text;
BEGIN
  -- 生成随机字符串
  random_string := encode(gen_random_bytes(32), 'base64');
  -- 移除特殊字符，只保留字母数字
  random_string := regexp_replace(random_string, '[^a-zA-Z0-9]', '', 'g');
  -- 返回格式化的 key
  RETURN p_prefix || '_' || 
         CASE 
           WHEN current_setting('app.environment', true) = 'production' THEN 'live'
           ELSE 'test'
         END || '_' || 
         substring(random_string, 1, 32);
END;
$$ LANGUAGE plpgsql;

-- 函数：验证工作空间成员权限
CREATE OR REPLACE FUNCTION check_workspace_permission(
  p_user_id uuid,
  p_workspace_id uuid,
  p_required_roles text[] DEFAULT ARRAY['owner', 'admin', 'member', 'viewer']
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM workspace_members 
    WHERE user_id = p_user_id 
      AND workspace_id = p_workspace_id 
      AND role = ANY(p_required_roles)
  );
END;
$$ LANGUAGE plpgsql;

-- 函数：获取用户在工作空间的角色
CREATE OR REPLACE FUNCTION get_user_workspace_role(
  p_user_id uuid,
  p_workspace_id uuid
)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM workspace_members
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;
```

**说明**：
- `generate_api_key`：生成格式化的 API Key（如 `cr_live_abc123...`）
- `check_workspace_permission`：验证用户是否有特定权限
- `get_user_workspace_role`：获取用户角色，用于权限判断

## 权限模型

### 1. 角色定义

```typescript
enum WorkspaceRole {
  OWNER = 'owner',     // 工作空间创建者，拥有全部权限
  ADMIN = 'admin',     // 管理员，可管理资源和成员
  MEMBER = 'member',   // 普通成员，可使用资源
  VIEWER = 'viewer'    // 查看者，只读权限
}
```

### 2. 权限矩阵

| 资源/操作 | Owner | Admin | Member | Viewer |
|----------|-------|-------|---------|--------|
| **工作空间** |
| 查看 | ✓ | ✓ | ✓ | ✓ |
| 更新设置 | ✓ | ✓ | ✗ | ✗ |
| 删除 | ✓ | ✗ | ✗ | ✗ |
| **成员管理** |
| 查看成员 | ✓ | ✓ | ✓ | ✓ |
| 邀请成员 | ✓ | ✓ | ✗ | ✗ |
| 更改角色 | ✓ | ✗ | ✗ | ✗ |
| 移除成员 | ✓ | ✓ | ✗ | ✗ |
| **供应商** |
| 查看 | ✓ | ✓ | ✓ | ✓ |
| 创建 | ✓ | ✓ | ✗ | ✗ |
| 更新 | ✓ | ✓ | ✗ | ✗ |
| 删除 | ✓ | ✓ | ✗ | ✗ |
| **用户 API Keys** |
| 查看自己的 | ✓ | ✓ | ✓ | ✗ |
| 创建自己的 | ✓ | ✓ | ✓ | ✗ |
| 删除自己的 | ✓ | ✓ | ✓ | ✗ |
| **供应商 API Keys** |
| 查看 | ✓ | ✓ | ✓ | ✗ |
| 创建 | ✓ | ✓ | ✗ | ✗ |
| 更新 | ✓ | ✓ | ✗ | ✗ |
| 删除 | ✓ | ✓ | ✗ | ✗ |
| **API 使用** |
| 调用 Claude Relay API | ✓ | ✓ | ✓ | ✗ |
| **审计日志** |
| 查看 | ✓ | ✓ | ✗ | ✗ |

### 3. CASL 集成

```typescript
// 定义 CASL 权限
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'use' | 'invite'
type Subjects = 'Workspace' | 'WorkspaceMember' | 'Provider' | 'UserApiKey' | 'ProviderApiKey' | 'Model' | 'RouteConfig' | 'AuditLog' | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>

export const defineAbilityFor = (member: WorkspaceMember, userId: string): AppAbility => {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  switch (member.role) {
    case 'owner':
      can('manage', 'all')
      break
      
    case 'admin':
      can(['read', 'update'], 'Workspace')
      can(['read', 'invite'], 'WorkspaceMember')
      can('manage', ['Provider', 'ProviderApiKey', 'Model', 'RouteConfig'])
      can('manage', 'UserApiKey', { user_id: userId }) // 只能管理自己的
      can('read', 'AuditLog')
      cannot('delete', 'Workspace')
      break
      
    case 'member':
      can('read', ['Workspace', 'WorkspaceMember', 'Provider', 'Model', 'RouteConfig'])
      can('read', 'ProviderApiKey') // 可以查看供应商 Key（用于了解配置）
      can('manage', 'UserApiKey', { user_id: userId }) // 可以管理自己的 API Key
      can('use', 'api') // 可以调用 API
      break
      
    case 'viewer':
      can('read', ['Workspace', 'WorkspaceMember', 'Provider', 'Model', 'RouteConfig'])
      cannot('create', 'UserApiKey') // 不能创建 API Key
      cannot('use', 'api') // 不能使用 API
      break
  }

  // 应用自定义权限覆盖
  if (member.permissions?.custom) {
    // 处理自定义权限
  }

  return build()
}
```

## 实现细节

### 1. Supabase 客户端配置

```typescript
// packages/backend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// 服务端客户端（绕过 RLS，用于系统操作）
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false 
    } 
  }
)

// 创建用户专属客户端（遵守 RLS）
export const createUserClient = (token: string) => {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      },
      auth: {
        persistSession: false
      }
    }
  )
}
```

### 2. 认证服务实现

```typescript
// packages/backend/src/services/auth/supabase-auth.service.ts
import { supabaseAdmin } from '../../lib/supabase'
import type { AuthUser } from '@supabase/supabase-js'

export class SupabaseAuthService {
  /**
   * 用户注册
   */
  async register(data: {
    email: string
    password: string
    fullName?: string
    inviteCode?: string  // 如果有邀请码，加入现有工作空间
  }) {
    // 1. 创建用户账号
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName
      }
    })

    if (authError) throw authError

    // 2. 处理工作空间逻辑
    let workspace
    
    if (data.inviteCode) {
      // 如果有邀请码，加入现有工作空间
      workspace = await this.joinWorkspaceByInvite(authData.user.id, data.inviteCode)
    } else {
      // 否则创建新的工作空间
      workspace = await this.createDefaultWorkspace(authData.user.id, data.fullName || data.email)
    }

    return { user: authData.user, workspace }
  }

  /**
   * 创建默认工作空间
   */
  private async createDefaultWorkspace(userId: string, userIdentifier: string) {
    const workspaceSlug = `ws-${userId.slice(0, 8)}`
    
    // 1. 创建工作空间
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: `${userIdentifier.split('@')[0]}'s Workspace`,
        slug: workspaceSlug,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    // 2. 添加为所有者
    await supabaseAdmin.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner'
    })

    // 3. 记录审计日志
    await supabaseAdmin.from('audit_logs').insert({
      workspace_id: workspace.id,
      user_id: userId,
      action: 'workspace.created',
      resource_type: 'workspace',
      resource_id: workspace.id
    })

    return workspace
  }

  /**
   * 验证用户令牌
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
  }

  /**
   * 获取用户工作空间
   */
  async getUserWorkspaces(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces(*)
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data
  }

  /**
   * 切换工作空间
   */
  async switchWorkspace(userId: string, workspaceId: string) {
    // 验证用户是否属于该工作空间
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !member) {
      throw new Error('无权访问该工作空间')
    }

    return member
  }

  /**
   * 记录审计日志
   */
  private async logAuditEvent(event: {
    workspace_id: string
    user_id: string
    action: string
    resource_type?: string
    resource_id?: string
    details?: any
  }) {
    await supabaseAdmin.from('audit_logs').insert(event)
  }
}
```

### 3. 中间件实现

```typescript
// packages/backend/src/middleware/supabase-auth.ts
import { createMiddleware } from 'hono/factory'
import { SupabaseAuthService } from '../services/auth/supabase-auth.service'
import { defineAbilityFor } from '../services/auth/casl-ability'
import type { AuthUser } from '@supabase/supabase-js'
import type { WorkspaceMember, AppAbility } from '../types'

// 扩展 Hono Context
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    workspace: {
      id: string
      member: WorkspaceMember
    }
    ability: AppAbility
    supabase: ReturnType<typeof createUserClient>
  }
}

const authService = new SupabaseAuthService()

/**
 * Supabase 认证中间件
 */
export const requireSupabaseAuth = createMiddleware(async (c, next) => {
  // 1. 获取认证令牌
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: '未提供认证令牌' }, 401)
  }
  
  // 2. 验证用户
  const user = await authService.verifyToken(token)
  
  if (!user) {
    return c.json({ error: '无效的认证令牌' }, 401)
  }
  
  // 3. 获取工作空间信息
  const workspaceId = c.req.header('X-Workspace-Id')
  
  if (!workspaceId) {
    return c.json({ error: '未指定工作空间' }, 400)
  }
  
  // 4. 验证工作空间权限
  try {
    const member = await authService.switchWorkspace(user.id, workspaceId)
    
    // 5. 构建权限对象
    const ability = defineAbilityFor(member)
    
    // 6. 创建用户专属 Supabase 客户端
    const userSupabase = createUserClient(token)
    
    // 7. 设置上下文
    c.set('user', user)
    c.set('workspace', { id: workspaceId, member })
    c.set('ability', ability)
    c.set('supabase', userSupabase)
    
    await next()
  } catch (error) {
    return c.json({ error: '无权访问此工作空间' }, 403)
  }
})

/**
 * 检查权限中间件
 */
export const checkAbility = (action: string, subject: string) => {
  return createMiddleware(async (c, next) => {
    const ability = c.get('ability')
    
    if (!ability.can(action, subject)) {
      return c.json({ 
        error: `无权执行此操作: ${action} ${subject}` 
      }, 403)
    }
    
    await next()
  })
}
```

### 4. 路由实现示例

```typescript
// packages/backend/src/routes/providers.ts
import { Hono } from 'hono'
import { requireSupabaseAuth, checkAbility } from '../middleware/supabase-auth'

const app = new Hono()

// 应用认证中间件
app.use('*', requireSupabaseAuth)

// 获取供应商列表
app.get('/', checkAbility('read', 'Provider'), async (c) => {
  const { workspace } = c.get('workspace')
  const supabase = c.get('supabase')
  
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  
  return c.json({ providers: data })
})

// 创建供应商
app.post('/', checkAbility('create', 'Provider'), async (c) => {
  const { workspace } = c.get('workspace')
  const user = c.get('user')
  const supabase = c.get('supabase')
  const body = await c.req.json()
  
  const { data, error } = await supabase
    .from('providers')
    .insert({
      ...body,
      workspace_id: workspace.id,
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  
  // 记录审计日志
  await supabase.from('audit_logs').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    action: 'provider.created',
    resource_type: 'provider',
    resource_id: data.id,
    details: { name: data.name }
  })
  
  return c.json({ provider: data })
})

export default app
```

## 迁移步骤

### 第一阶段：环境准备（1-2天）

1. **安装依赖**
   ```bash
   npm install @supabase/supabase-js @casl/ability
   npm install -D supabase
   ```

2. **初始化 Supabase**
   ```bash
   npx supabase init
   npx supabase start # 本地开发
   ```

3. **配置环境变量**
   ```env
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```

### 第二阶段：数据库迁移（2-3天）

1. **创建迁移文件**
   - 将上述 SQL 保存到 `supabase/migrations/`
   - 运行迁移：`npx supabase db push`

2. **生成类型定义**
   ```bash
   npx supabase gen types typescript --local > src/lib/database.types.ts
   ```

3. **数据迁移脚本**
   - 导出现有数据
   - 转换数据格式
   - 导入到 Supabase

### 第三阶段：后端代码迁移（3-5天）

1. **替换认证系统**
   - 移除 Lucia Auth 相关代码
   - 实现 Supabase Auth 服务
   - 更新中间件

2. **迁移数据访问层**
   - 移除 Repository 模式
   - 使用 Supabase Client
   - 更新服务层

3. **更新路由**
   - 添加工作空间路由
   - 更新现有 API 端点
   - 集成 CASL 权限检查

### 第四阶段：前端集成（2-3天）

1. **更新认证流程**
   - 集成 Supabase Auth UI
   - 实现第三方登录
   - 处理 JWT 令牌

2. **工作空间切换**
   - 实现工作空间选择器
   - 更新 API 请求头
   - 处理权限错误

3. **实时功能（可选）**
   - 集成 Supabase Realtime
   - 实现协作功能

### 第五阶段：测试和部署（2-3天）

1. **测试**
   - 单元测试更新
   - 集成测试
   - 端到端测试

2. **部署**
   - 配置生产环境
   - 数据迁移
   - 监控和日志

## 性能优化

### 1. 查询优化

```typescript
// 使用选择性查询减少数据传输
const { data } = await supabase
  .from('providers')
  .select('id, name, type, endpoint')
  .eq('workspace_id', workspaceId)
  .eq('is_active', true)

// 使用关联查询减少请求次数
const { data } = await supabase
  .from('providers')
  .select(`
    *,
    api_keys (
      id,
      name,
      status
    )
  `)
  .eq('workspace_id', workspaceId)
```

### 2. 缓存策略

```typescript
// 使用 Cloudflare KV 缓存频繁访问的数据
class CachedSupabaseService {
  constructor(
    private supabase: SupabaseClient,
    private kv: KVNamespace
  ) {}

  async getProvider(id: string) {
    // 尝试从缓存获取
    const cached = await this.kv.get(`provider:${id}`, 'json')
    if (cached) return cached

    // 从数据库获取
    const { data } = await this.supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single()

    // 缓存结果（5分钟）
    await this.kv.put(
      `provider:${id}`, 
      JSON.stringify(data),
      { expirationTtl: 300 }
    )

    return data
  }
}
```

### 3. 批量操作

```typescript
// 批量插入 API Keys
const keysToInsert = keys.map(key => ({
  workspace_id: workspaceId,
  provider_id: providerId,
  name: key.name,
  encrypted_key: encrypt(key.value),
  created_by: userId
}))

const { data, error } = await supabase
  .from('api_keys')
  .insert(keysToInsert)
  .select()
```

## 安全考虑

### 1. API Key 加密

```typescript
// 使用 Supabase Vault 进行加密
const { data: encryptedKey } = await supabase.rpc('encrypt_api_key', {
  key_value: plainTextKey
})

// 解密时
const { data: decryptedKey } = await supabase.rpc('decrypt_api_key', {
  encrypted_key: encryptedKey
})
```

### 2. 防止数据泄露

- 使用 RLS 确保数据隔离
- 敏感字段不返回给前端
- 审计所有数据访问

### 3. 速率限制

```typescript
// 在 Cloudflare Workers 中实现
const rateLimiter = new RateLimiter({
  key: `${userId}:${workspaceId}`,
  limit: 100,
  window: 60 // 60秒
})

if (!await rateLimiter.check()) {
  return c.json({ error: '请求过于频繁' }, 429)
}
```

## 监控和维护

### 1. 错误追踪

```typescript
// 集成错误追踪服务
import * as Sentry from '@sentry/node'

try {
  // 数据库操作
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      workspace_id: workspaceId,
      user_id: userId
    }
  })
  throw error
}
```

### 2. 性能监控

- 使用 Supabase Dashboard 监控查询性能
- 设置慢查询告警
- 定期优化索引

### 3. 备份策略

- 启用 Supabase 自动备份
- 定期导出重要数据
- 测试恢复流程

## 常见问题

### Q: 为什么要区分用户 API Key 和供应商 API Key？

A: 
- **用户 API Key**：是客户端调用 Claude Relay 的凭证，需要暴露给用户，因此使用哈希存储
- **供应商 API Key**：是访问第三方服务的敏感凭证，需要加密存储，且不应暴露给最终用户

### Q: workspace 的 slug 有什么用？

A: slug 是 URL 友好的唯一标识符，主要用于：
- 构建易读的 URL：`/workspace/acme-corp/settings`
- API 路径：`/api/workspaces/acme-corp/providers`
- 用户分享和记忆：比 UUID 更友好

### Q: Member 角色为什么可以创建自己的 API Key？

A: Member 需要能够：
- 集成 Claude Relay 到自己的应用中
- 管理自己的访问凭证
- 独立进行开发和测试
但他们只能管理自己创建的 Key，不能影响他人

### Q: 如何实现自定义的权限规则？

A: 使用 `workspace_members.permissions` 字段存储自定义权限，在 CASL 中应用这些规则。例如，可以给特定用户额外的权限或限制。

### Q: 完全不使用 Cloudflare KV 会有性能问题吗？

A: 对于大多数场景，Supabase 的性能足够。如果后续发现特定查询（如路由配置）成为瓶颈，可以选择性地引入 KV 作为缓存层。

## 总结

这个迁移方案提供了一个完整的路径，从当前的架构迁移到基于 Supabase 的现代化架构。主要优势包括：

1. **简化架构**：减少技术栈复杂度
2. **增强功能**：获得第三方登录、实时同步等功能
3. **更好的扩展性**：PostgreSQL 和 RLS 提供强大的多租户支持
4. **降低维护成本**：利用 Supabase 的托管服务

迁移过程需要仔细规划和执行，建议采用渐进式迁移策略，确保服务的稳定性和数据的完整性。