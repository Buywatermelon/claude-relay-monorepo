-- 创建工作空间表
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  join_code text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建工作空间成员表
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected')),
  permissions jsonb DEFAULT '{}',
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  applied_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  reject_reason text,
  UNIQUE(workspace_id, user_id)
);

-- 创建供应商表
CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('claude', 'openai', 'gemini')),
  endpoint text,
  config jsonb DEFAULT '{}',
  models jsonb DEFAULT '[]',  -- 模型列表，存储模型名称数组
  description text,
  icon text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- 创建用户 API Keys 表
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

-- 创建供应商凭证表（统一管理 API Keys 和 OAuth 账号）
CREATE TABLE provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  
  -- 凭证类型
  credential_type text NOT NULL CHECK (credential_type IN ('api_key', 'oauth_account')),
  
  -- 基础信息
  name text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'rate_limited')),
  
  -- API Key 相关（加密存储）
  encrypted_key text,
  key_hint text,
  
  -- OAuth 相关（JSON 存储，灵活扩展）
  oauth_data jsonb,
  /* 示例结构:
  {
    "email": "user@example.com",
    "user_id": "user_123",
    "tokens": {
      "access_token": "encrypted_token",
      "refresh_token": "encrypted_token",
      "expires_at": "2024-01-01T00:00:00Z"
    },
    "scopes": ["messages:read", "messages:write"],
    "profile": {...}
  }
  */
  
  -- 配置信息
  config jsonb DEFAULT '{}',  -- 速率限制、特殊配置等
  
  -- 元数据
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- 确保每个供应商下的凭证名称唯一
  UNIQUE(provider_id, name)
);

-- 创建使用统计表（高频更新）
CREATE TABLE credential_usage_stats (
  credential_id uuid PRIMARY KEY REFERENCES provider_credentials(id) ON DELETE CASCADE,
  
  -- 实时统计
  total_requests bigint DEFAULT 0,
  failed_requests bigint DEFAULT 0,
  last_used_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  
  -- 周期统计
  hourly_usage integer DEFAULT 0,
  daily_usage integer DEFAULT 0,
  monthly_usage integer DEFAULT 0,
  
  -- 性能指标
  avg_latency_ms integer,
  p95_latency_ms integer,
  success_rate numeric(5,2),
  
  -- 重置时间（用于周期统计）
  hourly_reset_at timestamptz DEFAULT now(),
  daily_reset_at timestamptz DEFAULT now(),
  monthly_reset_at timestamptz DEFAULT now(),
  
  updated_at timestamptz DEFAULT now()
);

-- 创建索引优化查询
CREATE INDEX idx_credential_status ON provider_credentials(status);
CREATE INDEX idx_credential_provider ON provider_credentials(provider_id);
CREATE INDEX idx_usage_stats_updated ON credential_usage_stats(updated_at);


-- 创建路由配置表
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

-- 创建审计日志表
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

-- 创建用户 API Key 使用记录表
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

-- 创建索引以优化查询性能
CREATE INDEX idx_workspaces_join_code ON workspaces(join_code);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);
CREATE INDEX idx_providers_workspace ON providers(workspace_id);
CREATE INDEX idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_workspace ON user_api_keys(workspace_id);
CREATE INDEX idx_provider_credentials_provider ON provider_credentials(provider_id);
CREATE INDEX idx_provider_credentials_status ON provider_credentials(status);
CREATE INDEX idx_provider_credentials_type ON provider_credentials(credential_type);
CREATE INDEX idx_route_configs_workspace ON route_configs(workspace_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_user_api_key_logs_key ON user_api_key_logs(api_key_id);
CREATE INDEX idx_user_api_key_logs_created ON user_api_key_logs(created_at);

-- 添加注释说明
COMMENT ON TABLE workspaces IS '工作空间表，用于多租户隔离';
COMMENT ON COLUMN workspaces.join_code IS '工作空间加入码，用于邀请新成员';
COMMENT ON TABLE workspace_members IS '工作空间成员表，管理用户与工作空间的关系';
COMMENT ON COLUMN workspace_members.status IS '成员状态：pending-待审批，active-已激活，rejected-已拒绝';
COMMENT ON COLUMN workspace_members.applied_at IS '申请加入时间';
COMMENT ON COLUMN workspace_members.approved_at IS '审批通过时间';
COMMENT ON COLUMN workspace_members.approved_by IS '审批人';
COMMENT ON COLUMN workspace_members.reject_reason IS '拒绝原因';
COMMENT ON TABLE providers IS '供应商配置表，存储 AI 服务提供商信息';
COMMENT ON COLUMN providers.type IS '供应商类型：claude, openai, gemini';
COMMENT ON COLUMN providers.models IS '支持的模型列表，JSON 数组格式';
COMMENT ON COLUMN providers.config IS '供应商配置，包含认证方式等信息';
COMMENT ON TABLE user_api_keys IS '用户 API 密钥表，用于访问 Claude Relay API';
COMMENT ON TABLE provider_credentials IS '供应商凭证表，统一管理 API Keys 和 OAuth 账号';
COMMENT ON COLUMN provider_credentials.credential_type IS '凭证类型：api_key 或 oauth_account';
COMMENT ON TABLE route_configs IS '路由配置表，定义请求路由规则';
COMMENT ON TABLE audit_logs IS '审计日志表，记录所有重要操作';
COMMENT ON TABLE user_api_key_logs IS '用户 API Key 访问日志表';

-- ==================== RBAC 权限系统表 ====================

-- 创建角色表
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建权限表
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  subject text NOT NULL,
  conditions jsonb,     -- CASL 条件，如 {"created_by": "${user.id}"}
  fields jsonb,         -- 字段限制，如 ["name", "type"]
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(action, subject)
);

-- 创建角色权限关联表
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(role_id, permission_id)
);

-- 创建 RBAC 相关索引
CREATE INDEX idx_permissions_action_subject ON permissions(action, subject);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 添加 RBAC 表注释
COMMENT ON TABLE roles IS '角色表，定义系统中的角色';
COMMENT ON COLUMN roles.name IS '角色名称，系统内部使用';
COMMENT ON COLUMN roles.display_name IS '角色显示名称，用于界面展示';
COMMENT ON COLUMN roles.is_system IS '是否为系统角色，系统角色不可删除';

COMMENT ON TABLE permissions IS '权限表，定义系统中的权限点';
COMMENT ON COLUMN permissions.action IS '权限动作：create, read, update, delete, approve, reject, manage';
COMMENT ON COLUMN permissions.subject IS '权限对象：Workspace, Membership, Provider, Model, ClaudeAccount, RouteConfig';
COMMENT ON COLUMN permissions.conditions IS 'CASL 条件规则，支持动态权限检查';
COMMENT ON COLUMN permissions.fields IS '字段级权限控制，限制可访问的字段列表';

COMMENT ON TABLE role_permissions IS '角色权限关联表，定义角色拥有的权限';