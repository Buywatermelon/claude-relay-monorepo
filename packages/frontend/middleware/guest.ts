/**
 * 访客中间件
 * 已登录用户访问登录/注册页时自动跳转到仪表板
 */

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, checkSession } = useAuth()
  
  // 检查会话状态
  await checkSession()
  
  // 如果已登录，重定向到管理后台
  if (isAuthenticated.value) {
    return navigateTo('/admin')
  }
})