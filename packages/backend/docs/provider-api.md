# Provider API 文档

## 概述

Provider（供应商）API 用于管理 AI 模型供应商的配置。系统支持三种类型的供应商：
- `claude` - Claude 官方 API（OAuth 认证）
- `openai` - OpenAI 兼容 API（API Key 认证）
- `gemini` - Google Gemini API（API Key 认证）

## 认证方式

### API Key 认证
适用于 OpenAI、Gemini 以及所有 OpenAI 兼容的供应商（如魔搭、智谱等）。

### OAuth 认证
仅用于 Claude 官方账号。OAuth 的 client_id 和 client_secret 通过环境变量配置：
```bash
CLAUDE_CLIENT_ID=your_client_id
CLAUDE_CLIENT_SECRET=your_client_secret
```

## API 端点

### 1. 获取供应商列表
```http
GET /api/providers
```

### 2. 获取供应商详情
```http
GET /api/providers/:id
```

### 3. 创建供应商
```http
POST /api/providers
```

请求体示例：

**OpenAI 供应商**
```json
{
  "name": "OpenAI",
  "type": "openai",
  "endpoint": "https://api.openai.com/v1",
  "config": {
    "auth_method": "api_key"
  },
  "models": ["gpt-4", "gpt-3.5-turbo"],
  "description": "OpenAI 官方服务",
  "icon": "openai"
}
```

**Claude 供应商**
```json
{
  "name": "Claude",
  "type": "claude",
  "config": {
    "auth_method": "oauth"
  },
  "models": ["claude-3-opus", "claude-3-sonnet"],
  "description": "Anthropic Claude",
  "icon": "claude"
}
```

**智谱 AI（OpenAI 兼容）**
```json
{
  "name": "智谱 AI",
  "type": "openai",
  "endpoint": "https://open.bigmodel.cn/api/paas/v4",
  "config": {
    "auth_method": "api_key"
  },
  "models": ["glm-4", "glm-3-turbo"],
  "description": "智谱清言大模型",
  "icon": "zhipu"
}
```

### 4. 更新供应商
```http
PUT /api/providers/:id
```

### 5. 删除供应商
```http
DELETE /api/providers/:id
```

### 6. 测试连接
```http
POST /api/providers/:id/test
```

## 权限要求

- `read` - 查看供应商列表和详情
- `create` - 创建新供应商
- `update` - 更新供应商信息
- `delete` - 删除供应商

默认情况下：
- workspace 的 owner 和 admin 拥有所有权限
- member 只有 read 权限

## 下一步

创建供应商后，需要为其添加凭证（Credentials）：
- 对于 `auth_method: "api_key"` 的供应商，需要添加 API Key
- 对于 `auth_method: "oauth"` 的供应商，需要通过 OAuth 流程添加账号