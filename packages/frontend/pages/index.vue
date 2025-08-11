<template>
  <div class="bg-gradient-to-br from-orange-50 via-white to-amber-50 min-h-screen">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-200 to-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style="animation-delay: 2s;"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
    </div>

    <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-8">
            <!-- Logo 和标题 -->
            <div class="text-center mb-6">
              <div class="inline-flex h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl items-center justify-center mb-4 shadow-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900">
                欢迎回来
              </h2>
              <p class="mt-2 text-sm text-gray-600">
                登录到 Prism Hub 管理中心
              </p>
            </div>

            <!-- 登录表单 -->
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <!-- 用户名/邮箱输入 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  用户名或邮箱
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input 
                    v-model="form.username"
                    type="text" 
                    required
                    class="block w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                    placeholder="admin 或 admin@example.com"
                    :disabled="isLoading"
                  >
                </div>
              </div>

              <!-- 密码输入 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  密码
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input 
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    class="block w-full pl-12 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                    placeholder="输入您的密码"
                    :disabled="isLoading"
                  >
                  <button 
                    type="button" 
                    @click="showPassword = !showPassword"
                    class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg v-if="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 记住我和忘记密码 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input 
                    v-model="form.rememberMe"
                    type="checkbox" 
                    class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  >
                  <label class="ml-2 block text-sm text-gray-700">
                    记住我（30天）
                  </label>
                </div>
                <a href="#" class="text-sm text-orange-600 hover:text-orange-500">
                  忘记密码？
                </a>
              </div>

              <!-- 错误提示 -->
              <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>

              <!-- 登录按钮 -->
              <button 
                type="submit"
                :disabled="isLoading"
                class="w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="!isLoading" class="flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                  </svg>
                  安全登录
                </span>
                <span v-else class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </span>
              </button>

              <!-- 注册链接 -->
              <div class="text-center pt-4">
                <span class="text-gray-600 text-sm">还没有账号？</span>
                <NuxtLink to="/auth/register" class="text-orange-600 hover:text-orange-700 font-semibold text-sm ml-1 transition-colors">
                  立即注册
                </NuxtLink>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: '登录 - Prism Hub',
  meta: [
    { name: 'description', content: '登录到 Prism Hub 管理中心' }
  ]
})

const { login, error, isLoading, clearError, isAuthenticated, checkSession } = useAuth()
const router = useRouter()

const form = ref({
  username: '',
  password: '',
  rememberMe: false
})

const showPassword = ref(false)

const handleSubmit = async () => {
  clearError()
  
  try {
    await login({
      username: form.value.username,
      password: form.value.password,
      rememberMe: form.value.rememberMe
    })
  } catch (err) {
    // 错误已经在 useAuth 中处理
  }
}

// 检查是否已经登录，如果已登录直接跳转到仪表板
onMounted(async () => {
  await checkSession()
  
  if (isAuthenticated.value) {
    await router.push('/admin')
  }
})
</script>