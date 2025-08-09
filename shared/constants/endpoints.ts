// API 端点常量
export const API_ENDPOINTS = {
  // 系统端点
  HEALTH: '/health',
  
  // Claude API 代理端点（保持原路径兼容性）
  CLAUDE_MESSAGES: '/v1/messages',
  
  // 管理中心端点
  ADMIN_DASHBOARD: '/api/admin/dashboard', // 仪表板数据
  ADMIN_PROVIDERS: '/api/admin/providers', // 模型供应商管理
  ADMIN_MODELS: '/api/admin/models',   // 可用模型列表
  ADMIN_SELECT_MODEL: '/api/admin/select-model', // 选择模型
  ADMIN_CURRENT_MODEL: '/api/admin/current-model', // 获取当前模型选择
  
  // 路由配置管理端点
  ADMIN_ROUTE_CONFIGS: '/api/admin/route-configs', // 路由配置管理
  
  // Claude 账号管理端点
  ADMIN_CLAUDE_ACCOUNTS: '/api/admin/claude-accounts', // Claude 账号管理
  ADMIN_CLAUDE_GENERATE_AUTH: '/api/admin/claude-accounts/generate-auth', // 生成授权链接
  ADMIN_CLAUDE_EXCHANGE_TOKEN: '/api/admin/claude-accounts/exchange-token', // 交换授权码
  
  // Key Pool 管理端点
  ADMIN_KEY_POOL: '/api/admin/key-pool/:providerId', // 获取 Key Pool 状态
  ADMIN_KEY_POOL_KEYS: '/api/admin/key-pool/:providerId/keys', // 添加密钥
  ADMIN_KEY_POOL_KEY: '/api/admin/key-pool/:providerId/keys/:keyId', // 更新/删除密钥
  ADMIN_KEY_POOL_BATCH: '/api/admin/key-pool/:providerId/keys/batch', // 批量添加密钥
  ADMIN_KEY_POOL_BATCH_OP: '/api/admin/key-pool/:providerId/keys/batch-operation', // 批量操作
  ADMIN_KEY_POOL_STATS: '/api/admin/key-pool/:providerId/stats', // 统计信息
  ADMIN_KEY_POOL_MAINTENANCE: '/api/admin/key-pool/:providerId/maintenance' // 维护任务
} as const