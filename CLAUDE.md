# CLAUDE.md

此文件为 Claude Code 在此代码仓库中工作时提供指导。

## 开发命令

### 核心命令
- `npm run dev:frontend` - 启动 Nuxt 前端开发服务器 (localhost:3000)
- `npm run dev:backend` - 使用 Bun 启动后端开发服务器 (localhost:8787)
- `npm run build:all` - 构建前后端
- `npm run deploy:all` - 统一部署到 Cloudflare Workers
- `npm run test:backend` - 运行集成测试 (Vitest)
- `npm run lint` - 代码检查
- `npm run type-check` - TypeScript 类型检查

## 项目架构

这是一个 Cloudflare 全栈应用的 **monorepo**：

```
├── packages/
│   ├── frontend/          # Nuxt 4 + Vue 3 + Tailwind CSS
│   └── backend/           # Hono + Cloudflare Workers
│       ├── src/           # 源代码
│       └── test/          # 集成测试
├── shared/                # 共享 TypeScript 类型和常量
├── docs/                  # 项目文档
│   ├── deployment.md      # 部署指南
│   ├── development.md     # 开发指南
│   ├── api.md            # API 文档
│   └── images/           # 项目截图和演示 GIF
└── .github/workflows/     # GitHub Actions 配置
```

### 技术栈
- **前端**: Nuxt 4, Vue 3, Tailwind CSS
- **后端**: Hono, TypeScript, Bun 运行时
- **部署**: Cloudflare Workers (统一部署架构，前后端合并)
- **数据库**: Supabase (PostgreSQL) - 主要数据存储
- **认证**: Supabase Auth - 用户认证和会话管理
- **测试**: Vitest (专注集成测试)
- **静态资源**: Workers Assets (前端构建产物)

## 🚨 后端开发核心原则

### 1. 异常处理架构
- **Service 层**: 抛出具体的业务异常（`ValidationError`、`ResourceNotFoundError` 等）
- **Route 层**: 不捕获异常，让异常冒泡到全局处理器
- **全局处理**: 在 `app.onError` 中统一处理所有异常，返回标准格式

### 2. 中间件执行顺序
```typescript
route.post('/',
  requireAuth,                              // 1. 身份验证
  requireWorkspaceMember,                   // 2. 工作空间成员验证
  requirePermission('action', 'Resource'),  // 3. CASL 权限检查
  zValidator('json', schema),               // 4. 参数验证
  async (c) => { /* 业务逻辑 */ }         // 5. 处理请求
)
```

### 3. 权限管理
- 使用 **CASL** 进行细粒度权限控制
- 权限检查通过 `requirePermission` 中间件实现
- 支持基于角色的访问控制（RBAC）

### 4. 参数验证
- 使用 **Zod** 定义 schema
- 使用 `@hono/zod-validator` 的 `zValidator` 中间件
- 验证失败自动返回 400 错误

### 5. 数据库操作
- 使用 **Supabase** 作为主数据库
- Service 层使用 `getSupabaseAdmin()` 获取管理员客户端
- 所有数据库错误转换为对应的业务异常

## 核心功能

### Claude Relay 后端
- **智能代理**: 自动路由请求到官方 Claude API 或第三方 LLM 供应商
- **多格式转换**: 支持 Claude-OpenAI、Claude-Gemini 格式转换
- **Key Pool 管理**: 企业级 API 密钥池管理，支持智能轮换和故障恢复
- **供应商管理**: 支持魔搭 Qwen、智谱 AI、Google Gemini 等多个供应商
- **统一错误处理**: 全局异常捕获和标准化错误响应

### 管理中心前端
- **Claude 账号管理**: OAuth 认证，Token 自动刷新
- **供应商配置**: 添加、编辑第三方 AI 模型供应商
- **模型选择**: 在官方 Claude 和第三方模型间切换
- **凭证管理**: 支持两种凭证类型管理 - API 密钥池和 OAuth 账号，凭证从属于供应商，支持批量管理操作，使用 key_hint 字段安全显示密钥部分信息
- **Key Pool 界面**: 批量导入、状态管理、统计监控

## 开发模式

### 后端开发
1. **Bun 模式 (推荐)**: `npm run dev:backend` - 快速开发，连接 Supabase
2. **Wrangler 模式**: `npm run dev:backend:wrangler` - 生产环境模拟

### 前端开发
- 开发环境自动连接本地后端 API (localhost:8787)
- 生产环境连接部署的后端 API

## API 端点

### Claude API 代理
- `POST /v1/messages` - 智能代理 Claude API，支持官方和第三方供应商路由
- `GET /v1/health` - 服务健康检查

### 管理中心 API
- `POST /api/admin/auth` - 管理员认证
- `GET /api/admin/dashboard` - 仪表板数据
- `GET/POST/PUT/DELETE /api/admin/providers` - 供应商管理
- `GET/POST /api/admin/models` - 模型管理
- `GET/POST/DELETE /api/admin/claude-accounts` - Claude 账号管理

### Key Pool 管理 API
- `GET /api/admin/key-pool/:providerId` - 获取密钥池状态
- `POST /api/admin/key-pool/:providerId/keys` - 添加密钥
- `POST /api/admin/key-pool/:providerId/keys/batch` - 批量添加密钥
- `POST /api/admin/key-pool/:providerId/keys/batch-operation` - 批量操作

## 环境配置

### 后端环境变量
```bash
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Claude OAuth 配置（可选）
CLAUDE_CLIENT_ID=your_client_id
CLAUDE_CLIENT_SECRET=your_client_secret
```

## 部署流程

### 统一部署架构
项目采用 **Cloudflare Workers + Assets** 统一部署架构：
- 前端构建产物通过 Workers Assets 提供静态文件服务
- 后端 Hono 应用处理 API 请求
- 单个 Worker 同时处理前后端请求，简化部署和维护

### 部署命令
1. `npm run deploy:all` - 自动化完整部署（推荐）
2. `npm run deploy:backend` - 仅部署后端
3. `npm run deploy:frontend` - 仅部署前端（通常不需要单独执行）

### 部署配置
通过 GitHub Actions 自动部署，配置文件：`.github/workflows/deploy.yml`

## 测试策略

- **集成测试优先**: 专注于 API 端点和完整功能验证
- **测试文件**: 如 `claude-proxy.gemini.test.ts` 进行自动化验证
- **测试命令**: `npm run test:backend` 运行所有集成测试
- **可视化**: `npm run test:backend:ui` 启动 Vitest UI 界面
- **监听模式**: `npm run test:backend:watch` 文件变化时自动运行测试

## 访问方式

### 开发环境
- 前端: `http://localhost:3000/admin`
- 后端: `http://localhost:8787`

### 生产环境
- **统一访问地址**: `https://claude-relay-unified.{你的子域名}.workers.dev`
- **管理中心**: `https://claude-relay-unified.{你的子域名}.workers.dev/admin`
- **API 端点**: `https://claude-relay-unified.{你的子域名}.workers.dev/v1/messages`

## 代码组织原则

- **分层架构**: 路由 → 服务 → 存储，职责明确
- **类型安全**: 全链路 TypeScript，共享类型定义
- **模块化设计**: 按功能域组织（admin、proxy、key-pool、transformers）
- **错误优先**: 完善的错误处理和用户友好的错误信息
- **集成测试**: 确保系统整体功能正常工作