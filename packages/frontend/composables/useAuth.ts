/**
 * 用户认证 composable
 */

import type { Ref } from 'vue'
import { extractErrorMessage } from '~/utils/error'

interface User {
  id: string
  username: string
  email: string
  isActive: boolean
  isSuperAdmin: boolean
  createdAt?: string
  lastLoginAt?: string
  loginCount?: number
}

interface AuthState {
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

interface LoginCredentials {
  username?: string
  email?: string
  password: string
  rememberMe?: boolean
}

interface RegisterData {
  username: string
  email: string
  password: string
}

export const useAuth = (): AuthState & {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
} => {
  const config = useRuntimeConfig()
  const router = useRouter()
  
  // 全局状态
  const user = useState<User | null>('auth.user', () => null)
  const isAuthenticated = useState<boolean>('auth.isAuthenticated', () => false)
  const isLoading = useState<boolean>('auth.isLoading', () => false)
  const error = useState<string | null>('auth.error', () => null)

  // 登录
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null

    try {
      // 根据输入判断是用户名还是邮箱登录
      const isEmail = credentials.email || (credentials.username && credentials.username.includes('@'))
      const endpoint = isEmail ? '/api/auth/login/email' : '/api/auth/login'
      
      const body = isEmail 
        ? { email: credentials.email || credentials.username, password: credentials.password }
        : { username: credentials.username, password: credentials.password }

      const response = await $fetch<{
        user: User
        sessionId: string
      }>(endpoint, {
        method: 'POST',
        baseURL: config.public.apiBaseUrl,
        body,
        credentials: 'include' // 重要：包含 cookies
      })

      if (response.user) {
        user.value = response.user
        isAuthenticated.value = true
        
        // 登录成功后跳转到管理后台
        await router.push('/admin')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      error.value = extractErrorMessage(err, '登录失败，请检查用户名和密码')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const register = async (data: RegisterData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        user: User
        sessionId: string
      }>('/api/auth/register', {
        method: 'POST',
        baseURL: config.public.apiBaseUrl,
        body: data,
        credentials: 'include'
      })

      if (response.user) {
        user.value = response.user
        isAuthenticated.value = true
        
        // 注册成功后自动登录并跳转
        await router.push('/admin')
      }
    } catch (err: any) {
      console.error('Register error:', err)
      error.value = extractErrorMessage(err, '注册失败，请重试')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async () => {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        baseURL: config.public.apiBaseUrl,
        credentials: 'include'
      })

      // 清除用户状态
      user.value = null
      isAuthenticated.value = false
      
      // 跳转到登录页（主页）
      await router.push('/')
    } catch (err: any) {
      console.error('Logout error:', err)
      error.value = extractErrorMessage(err, '登出失败')
    } finally {
      isLoading.value = false
    }
  }

  // 检查会话
  const checkSession = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        user: User
        session: { id: string; expiresAt: string }
      }>('/api/auth/session', {
        method: 'GET',
        baseURL: config.public.apiBaseUrl,
        credentials: 'include'
      })

      if (response.user) {
        user.value = response.user
        isAuthenticated.value = true
      } else {
        user.value = null
        isAuthenticated.value = false
      }
    } catch (err: any) {
      // 会话无效或已过期
      user.value = null
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  // 清除错误
  const clearError = () => {
    error.value = null
  }

  return {
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    error: readonly(error),
    login,
    register,
    logout,
    checkSession,
    clearError
  }
}