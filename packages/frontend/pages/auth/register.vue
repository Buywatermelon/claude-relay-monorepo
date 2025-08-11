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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-semibold text-gray-900">
                创建新账号
              </h2>
              <p class="mt-2 text-sm text-gray-600">
                注册 Prism Hub 管理账号
              </p>
            </div>

            <!-- 注册表单 -->
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- 用户名输入 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  用户名
                </label>
                <div class="relative">
                  <input 
                    v-model="form.username"
                    @blur="checkUsername"
                    type="text" 
                    required
                    minlength="3"
                    class="block w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                    :class="{ 'border-green-500': usernameAvailable === true, 'border-red-500': usernameAvailable === false }"
                    placeholder="选择一个独特的用户名"
                    :disabled="isLoading"
                  >
                  <div v-if="usernameAvailable !== null" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg v-if="usernameAvailable" class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <p v-if="usernameFeedback" class="mt-2 text-sm" :class="usernameAvailable ? 'text-green-600' : 'text-red-600'">
                  {{ usernameFeedback }}
                </p>
              </div>

              <!-- 邮箱输入 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  邮箱地址
                </label>
                <div class="relative">
                  <input 
                    v-model="form.email"
                    @blur="checkEmail"
                    type="email" 
                    required
                    class="block w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                    :class="{ 'border-green-500': emailValid === true, 'border-red-500': emailValid === false }"
                    placeholder="your@email.com"
                    :disabled="isLoading"
                  >
                  <div v-if="emailValid !== null" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg v-if="emailValid" class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <p v-if="emailFeedback" class="mt-2 text-sm" :class="emailValid ? 'text-green-600' : 'text-red-600'">
                  {{ emailFeedback }}
                </p>
              </div>

              <!-- 密码输入 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  密码
                </label>
                <input 
                  v-model="form.password"
                  @input="checkPasswordStrength"
                  type="password"
                  required
                  minlength="8"
                  class="block w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                  placeholder="至少8个字符，包含大小写及数字"
                  :disabled="isLoading"
                >
                <div v-if="form.password" class="mt-3">
                  <div class="flex justify-between mb-1.5">
                    <span class="text-xs font-medium text-gray-600">密码强度</span>
                    <span class="text-xs font-medium" :class="strengthTextColor">{{ strengthText }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      class="h-2.5 rounded-full transition-all duration-500"
                      :class="strengthBarColor"
                      :style="`width: ${strengthPercent}%`"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- 确认密码 -->
              <div class="group">
                <label class="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-orange-600 transition-colors">
                  确认密码
                </label>
                <div class="relative">
                  <input 
                    v-model="form.confirmPassword"
                    @input="checkPasswordMatch"
                    type="password"
                    required
                    class="block w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent focus:bg-white transition-all duration-200 hover:border-gray-300"
                    :class="{ 'border-green-500': passwordMatch === true, 'border-red-500': passwordMatch === false }"
                    placeholder="再次输入密码"
                    :disabled="isLoading"
                  >
                  <div v-if="passwordMatch !== null" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg v-if="passwordMatch" class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg v-else class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <p v-if="passwordMatchFeedback" class="mt-2 text-sm" :class="passwordMatch ? 'text-green-600' : 'text-red-600'">
                  {{ passwordMatchFeedback }}
                </p>
              </div>

              <!-- 服务条款 -->
              <div class="flex items-start">
                <input 
                  v-model="form.agreeToTerms"
                  type="checkbox" 
                  required
                  class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-0.5"
                >
                <label class="ml-3 text-sm text-gray-600 leading-relaxed">
                  我已阅读并同意 
                  <a href="#" class="text-orange-600 hover:text-orange-700 font-medium underline decoration-dotted underline-offset-2">服务条款</a> 
                  及 
                  <a href="#" class="text-orange-600 hover:text-orange-700 font-medium underline decoration-dotted underline-offset-2">隐私政策</a>
                </label>
              </div>

              <!-- 错误提示 -->
              <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p class="text-sm text-red-600">{{ error }}</p>
              </div>

              <!-- 注册按钮 -->
              <button 
                type="submit"
                :disabled="isLoading || !canSubmit"
                class="w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="!isLoading" class="flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  创建账号
                </span>
                <span v-else class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  注册中...
                </span>
              </button>

              <!-- 登录链接 -->
              <div class="text-center pt-4">
                <span class="text-gray-600 text-sm">已有账号？</span>
                <NuxtLink to="/" class="text-orange-600 hover:text-orange-700 font-semibold text-sm ml-1 transition-colors">
                  立即登录
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
  title: '注册 - Prism Hub',
  meta: [
    { name: 'description', content: '注册 Prism Hub 管理账号' }
  ]
})

const { register, error, isLoading, clearError } = useAuth()
const router = useRouter()

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})

// 验证状态
const usernameAvailable = ref<boolean | null>(null)
const usernameFeedback = ref('')
const emailValid = ref<boolean | null>(null)
const emailFeedback = ref('')
const passwordMatch = ref<boolean | null>(null)
const passwordMatchFeedback = ref('')
const passwordStrength = ref(0)

// 密码强度计算
const strengthPercent = computed(() => [0, 25, 50, 75, 100][passwordStrength.value])
const strengthText = computed(() => ['-', '弱', '一般', '中等', '强'][passwordStrength.value])
const strengthBarColor = computed(() => [
  '',
  'bg-gradient-to-r from-red-500 to-red-600',
  'bg-gradient-to-r from-orange-500 to-orange-600',
  'bg-gradient-to-r from-yellow-500 to-yellow-600',
  'bg-gradient-to-r from-green-500 to-green-600'
][passwordStrength.value])
const strengthTextColor = computed(() => [
  'text-gray-600',
  'text-red-600',
  'text-orange-600',
  'text-yellow-600',
  'text-green-600'
][passwordStrength.value])

// 是否可以提交
const canSubmit = computed(() => {
  return usernameAvailable.value === true &&
         emailValid.value === true &&
         passwordMatch.value === true &&
         passwordStrength.value >= 2 &&
         form.value.agreeToTerms
})

// 检查用户名
const checkUsername = () => {
  if (form.value.username.length < 3) {
    usernameAvailable.value = false
    usernameFeedback.value = '用户名至少需要3个字符'
    return
  }
  
  // 基本格式验证
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  if (!usernameRegex.test(form.value.username)) {
    usernameAvailable.value = false
    usernameFeedback.value = '用户名只能包含字母、数字、下划线和连字符'
    return
  }
  
  usernameAvailable.value = true
  usernameFeedback.value = '✓ 格式正确'
}

// 检查邮箱
const checkEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.value.email)) {
    emailValid.value = false
    emailFeedback.value = '请输入有效的邮箱地址'
    return
  }
  
  emailValid.value = true
  emailFeedback.value = '✓ 格式正确'
}

// 检查密码强度
const checkPasswordStrength = () => {
  const password = form.value.password
  let strength = 0
  
  if (password.length >= 8) strength++
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
  if (password.match(/[0-9]/)) strength++
  if (password.match(/[^a-zA-Z0-9]/)) strength++
  
  passwordStrength.value = strength
}

// 检查密码匹配
const checkPasswordMatch = () => {
  if (form.value.confirmPassword === '') {
    passwordMatch.value = null
    passwordMatchFeedback.value = ''
    return
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    passwordMatch.value = false
    passwordMatchFeedback.value = '两次输入的密码不一致'
  } else {
    passwordMatch.value = true
    passwordMatchFeedback.value = '✓ 密码匹配'
  }
}

// 提交注册
const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  clearError()
  
  try {
    await register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password
    })
  } catch (err: any) {
    // 根据错误信息更新验证状态
    if (err?.data?.error?.message) {
      const message = err.data.error.message
      if (message.includes('用户名已存在')) {
        usernameAvailable.value = false
        usernameFeedback.value = '该用户名已被使用'
      } else if (message.includes('邮箱已被使用')) {
        emailValid.value = false
        emailFeedback.value = '该邮箱已被注册'
      }
    }
  }
}

// 检查是否已经登录
onMounted(async () => {
  const { isAuthenticated, checkSession } = useAuth()
  
  await checkSession()
  
  if (isAuthenticated.value) {
    await router.push('/admin')
  }
})
</script>