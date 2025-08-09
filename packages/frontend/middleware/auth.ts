/**
 * 认证中间件
 * 保护需要登录才能访问的页面
 */

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, checkSession } = useAuth()
  
  // 检查会话状态
  await checkSession()
  
  // 如果未登录，重定向到登录页（主页）
  if (!isAuthenticated.value) {
    return navigateTo('/')
  }
})