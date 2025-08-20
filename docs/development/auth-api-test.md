# Auth API 测试文档

本文档包含所有 auth 相关接口的 curl 测试命令，可直接导入 Apifox 进行测试。

## 基础配置

- **基础 URL**: `http://localhost:8787`
- **Content-Type**: `application/json`

## 1. 用户注册

```bash
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "username": "Test User"
  }'
```

### 预期响应
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User"
  },
  "workspace": {
    "id": "workspace-uuid",
    "name": "workspace-name",
    "slug": "workspace-slug"
  }
}
```

## 2. 用户登录

```bash
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

### 预期响应
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_token_string",
    "expires_at": 1234567890
  }
}
```

## 3. 验证会话

```bash
# 需要从登录响应中获取 access_token
curl -X GET http://localhost:8787/auth/session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 预期响应（已认证）
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User"
  },
  "authenticated": true
}
```

### 预期响应（未认证）
```json
{
  "user": null,
  "session": null,
  "authenticated": false
}
```

## 4. 刷新访问令牌

```bash
# 需要从登录响应中获取 refresh_token
curl -X POST http://localhost:8787/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### 预期响应
```json
{
  "session": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token",
    "expires_at": 1234567890
  }
}
```

## 5. 获取当前用户信息

```bash
# 需要从登录响应中获取 access_token
curl -X GET http://localhost:8787/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 预期响应
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "fullName": "Test User",
  "workspaces": [
    {
      "id": "workspace-uuid",
      "name": "workspace-name",
      "slug": "workspace-slug",
      "role": "owner"
    }
  ]
}
```

## 6. 用户登出（仅客户端）

**注意**: Supabase 使用 JWT token，登出操作需要在客户端进行：

客户端登出步骤：
1. 调用 `supabase.auth.signOut()`
2. 清除本地存储的 access_token 和 refresh_token
3. 重定向到登录页

```javascript
// 客户端示例代码
await supabase.auth.signOut()
// 清除本地存储
localStorage.removeItem('access_token')
localStorage.removeItem('refresh_token')
// 重定向
window.location.href = '/login'
```

**说明**: 
- JWT token 是无状态的，服务端无法撤销已签发的 token
- Token 会保持有效直到自然过期
- 因此服务端不提供 logout 接口

## 错误响应示例

### 400 Bad Request（参数验证失败）
```json
{
  "error": {
    "message": "Validation error",
    "details": [
      {
        "field": "email",
        "message": "Invalid email"
      }
    ]
  }
}
```

### 401 Unauthorized（未授权）
```json
{
  "error": {
    "message": "未登录"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "服务器内部错误"
  }
}
```

## 测试流程建议

1. **注册新用户** - 使用接口 1
2. **用户登录** - 使用接口 2，保存返回的 `access_token` 和 `refresh_token`
3. **验证会话** - 使用接口 3，传入 `access_token`
4. **获取用户信息** - 使用接口 5，传入 `access_token`
5. **刷新令牌** - 使用接口 4，传入 `refresh_token`
6. **用户登出** - 在客户端执行（见上述说明）

## 注意事项

1. **Token 管理**：登录成功后需要保存 `access_token` 和 `refresh_token`，用于后续请求
2. **Token 过期**：`access_token` 有效期通常较短，过期后需要使用 `refresh_token` 刷新
3. **密码要求**：注册时密码需要满足一定的复杂度要求（如：至少8位，包含大小写字母和数字）
4. **环境变量**：确保后端已配置 Supabase 相关环境变量（SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY）

## Apifox 导入说明

1. 在 Apifox 中创建新项目或选择现有项目
2. 导入时选择 "cURL" 格式
3. 将上述 curl 命令逐个导入
4. 设置环境变量：
   - `baseUrl`: `http://localhost:8787`
   - `accessToken`: 登录后获取的 token
   - `refreshToken`: 登录后获取的 refresh token
5. 在需要认证的接口中，使用 `{{accessToken}}` 变量