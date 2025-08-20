/**
 * Bun 本地开发服务器
 * 复用 index.ts 中的 Cloudflare Workers 应用
 */

import workerApp from './index'

// 创建一个包装函数，注入本地环境变量
const localFetch = async (request: Request) => {
  // 创建与 Cloudflare Workers 兼容的环境对象
  const env = {
    NODE_ENV: 'development'
  }
  
  // 调用 worker 的 fetch 函数并传入环境变量
  // 创建一个最小的 ExecutionContext 用于本地开发
  const ctx = {
    waitUntil: (promise: Promise<any>) => { /* 本地开发中不执行 */ },
    passThroughOnException: () => { /* 本地开发中不执行 */ }
  }
  
  return workerApp.fetch(request, env, ctx as any)
}

// 启动服务器
const port = process.env.PORT || 8787
console.log(`🚀 Claude Relay 后端 (Bun) 运行在 http://localhost:${port}`)
console.log(`🔥 热重载已启用 - 代码变更时自动重启`)

export default {
  port,
  fetch: localFetch
}