<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-20 right-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      <div class="absolute bottom-20 left-20 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
    </div>
    
    <!-- 顶部导航 -->
    <nav class="relative z-50 bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-3">
            <NuxtLink to="/admin" class="flex items-center space-x-3">
              <div class="h-9 w-9 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h1 class="text-lg font-semibold text-gray-900">
                Prism Hub
              </h1>
            </NuxtLink>
          </div>
          
          <!-- 用户下拉菜单 -->
          <div class="flex items-center">
            <div class="relative" data-user-menu>
              <button @click.stop="toggleUserMenu" class="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200">
                <div class="h-8 w-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-medium">{{ userInitial }}</span>
                </div>
                <span class="text-sm font-medium text-gray-700">{{ user?.username }}</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <!-- 下拉菜单 -->
              <div v-if="showUserMenu" @click.stop class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-medium text-gray-900">{{ user?.username || '管理员' }}</p>
                  <p v-if="user?.email" class="text-xs text-gray-500">{{ user.email }}</p>
                  <p v-else class="text-xs text-gray-500">管理员账户</p>
                </div>
                <NuxtLink to="/admin" @click="showUserMenu = false" class="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <span>管理中心</span>
                  </div>
                </NuxtLink>
                <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span>退出登录</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- 个人信息内容 -->
    <div class="relative z-10 max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <!-- 个人资料卡片 -->
      <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-orange-100/50">
        <!-- 头部背景 -->
        <div class="h-32 relative overflow-hidden bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600">
          <!-- 装饰性图案 -->
          <svg class="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 100" preserveAspectRatio="none">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="white"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
          <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/20 to-transparent"></div>
        </div>
        
        <!-- 用户信息 -->
        <div class="relative px-8 pb-8">
          <div class="flex items-end space-x-5 -mt-14 mb-8">
            <div class="h-28 w-28 bg-white rounded-2xl shadow-xl p-1">
              <div class="h-full w-full bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                <span class="text-white text-4xl font-bold">{{ userInitial }}</span>
              </div>
            </div>
            <div class="flex-1 pb-3">
              <h2 class="text-2xl font-bold text-gray-900">{{ user?.username }}</h2>
              <p class="text-gray-500 text-sm mt-1">
                {{ user?.isSuperAdmin ? '超级管理员' : '系统用户' }}
              </p>
            </div>
          </div>
          
          <!-- 信息网格 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- 账户信息 -->
            <div>
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">账户信息</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">用户名</span>
                  <span class="text-sm text-gray-900">{{ user?.username }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">邮箱</span>
                  <span class="text-sm text-gray-900">{{ user?.email }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">账户状态</span>
                  <span v-if="user?.isActive" class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">活跃</span>
                  <span v-else class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">未激活</span>
                </div>
                <div v-if="user?.createdAt" class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">注册时间</span>
                  <span class="text-sm text-gray-900">{{ formatDate(user.createdAt) }}</span>
                </div>
              </div>
            </div>
            
            <!-- 安全设置 -->
            <div>
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">安全设置</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <span class="text-sm font-medium text-gray-700">密码</span>
                  </div>
                  <button @click="showPasswordModal = true" class="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">修改</button>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    <span class="text-sm font-medium text-gray-700">当前会话</span>
                  </div>
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">活跃</span>
                </div>
                <div v-if="user?.lastLoginAt" class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">上次登录</span>
                  <span class="text-sm text-gray-900">{{ formatDate(user.lastLoginAt) }}</span>
                </div>
                <div v-if="user?.loginCount" class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">登录次数</span>
                  <span class="text-sm text-gray-900">{{ user.loginCount }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 权限信息 -->
          <div class="mt-8">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">权限信息</h3>
            <div class="flex flex-wrap gap-3">
              <span v-if="user?.isSuperAdmin" class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                超级管理员
              </span>
              <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                管理中心访问
              </span>
              <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                API 访问
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 修改密码模态框 -->
      <Teleport to="body">
        <div v-if="showPasswordModal" class="fixed inset-0 z-50 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen px-4">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showPasswordModal = false"></div>
            
            <div class="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">修改密码</h3>
              
              <form @submit.prevent="handleChangePassword" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                  <input 
                    v-model="passwordForm.currentPassword"
                    type="password"
                    required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                  <input 
                    v-model="passwordForm.newPassword"
                    type="password"
                    required
                    minlength="8"
                    class="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                  <input 
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                </div>
                
                <div v-if="passwordError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-sm text-red-600">{{ passwordError }}</p>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    @click="showPasswordModal = false"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    :disabled="isChangingPassword"
                    class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {{ isChangingPassword ? '修改中...' : '确认修改' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: '个人中心 - Claude Relay',
  meta: [
    { name: 'description', content: '管理您的 Claude Relay 账户信息' }
  ]
})

const auth = useAuth()
const router = useRouter()
const config = useRuntimeConfig()

// UI 状态
const showUserMenu = ref(false)
const showPasswordModal = ref(false)
const isChangingPassword = ref(false)
const passwordError = ref('')

// 密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 计算用户信息
const user = computed(() => auth.user.value)
const userInitial = computed(() => {
  return user.value?.username?.charAt(0).toUpperCase() || 'A'
})

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 切换用户菜单
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

// 处理登出
const handleLogout = async () => {
  showUserMenu.value = false
  await auth.logout()
}

// 处理修改密码
const handleChangePassword = async () => {
  passwordError.value = ''
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '两次输入的密码不一致'
    return
  }
  
  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = '新密码至少需要8个字符'
    return
  }
  
  isChangingPassword.value = true
  
  try {
    // TODO: 调用后端 API 修改密码
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      baseURL: config.public.apiBaseUrl,
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      },
      credentials: 'include'
    })
    
    // 成功后关闭模态框
    showPasswordModal.value = false
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    
    // 显示成功提示（可以使用 toast 组件）
    alert('密码修改成功')
  } catch (err: any) {
    passwordError.value = err.data?.message || '密码修改失败，请重试'
  } finally {
    isChangingPassword.value = false
  }
}

// 点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const userMenuElement = document.querySelector('[data-user-menu]')
  if (userMenuElement && !userMenuElement.contains(target)) {
    showUserMenu.value = false
  }
}

// ESC 键关闭菜单
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showUserMenu.value) {
    showUserMenu.value = false
  }
}

// 使用 watch 确保事件监听器在菜单打开后添加
watch(showUserMenu, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
    })
  } else {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscKey)
  }
})

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscKey)
})

// 获取最新用户信息
onMounted(async () => {
  try {
    const response = await $fetch('/api/auth/me', {
      method: 'GET',
      baseURL: config.public.apiBaseUrl,
      credentials: 'include'
    })
    
    // 更新用户信息
    if (response) {
      user.value = response as any
    }
  } catch (err) {
    console.error('Failed to fetch user info:', err)
  }
})
</script>