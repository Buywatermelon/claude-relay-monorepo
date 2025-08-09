<template>
  <div class="bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 min-h-screen">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-20 right-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      <div class="absolute bottom-20 left-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
    </div>

    <!-- 顶部导航 -->
    <nav class="relative z-10 bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/admin?tab=providers" 
                     class="flex items-center space-x-2 text-orange-600 hover:text-orange-700 px-3 py-2 rounded-xl hover:bg-white/50 transition duration-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              <span>返回</span>
            </NuxtLink>
            <div class="h-6 w-px bg-orange-200"></div>
            <div>
              <h1 class="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
                添加模型供应商
              </h1>
              <p class="text-xs text-gray-500">接入第三方AI模型服务</p>
            </div>
          </div>
          <div class="flex items-center">
            <button @click="logout" 
                    class="text-gray-500 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-white/50 transition duration-200">
              退出登录
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="relative z-10 max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- 标题 -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">添加模型供应商</h2>
        <p class="text-gray-600">选择您要接入的AI模型供应商，配置相关参数</p>
      </div>

      <!-- 使用 ProviderForm 组件 -->
      <div class="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-orange-100 p-6">
        <ProviderForm 
          :loading="loading"
          @submit="handleSubmit"
          @cancel="handleCancel" />
      </div>
      
      <!-- 全局错误提示组件 -->
      <GlobalErrorAlert />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AddProviderRequest, EditProviderRequest } from '../../../../shared/types/admin/providers'
import { API_ENDPOINTS } from '../../../../shared/constants/endpoints'
import ProviderForm from '~/components/ProviderForm.vue'

// 添加认证中间件
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: '添加模型供应商 - Claude Code 管理中心',
  meta: [
    { name: 'description', content: '添加第三方AI模型供应商' }
  ]
})

const config = useRuntimeConfig()
const router = useRouter()

const loading = ref(false)
const { showNotification, withErrorHandling } = useErrorHandler()


const handleSubmit = async (data: AddProviderRequest | EditProviderRequest) => {
  // 添加供应商页面只会收到 AddProviderRequest
  const addData = data as AddProviderRequest
  
  loading.value = true

  await withErrorHandling(
    async () => {
      const response = await $fetch<{ success: boolean; data: any }>(
        API_ENDPOINTS.ADMIN_PROVIDERS,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: addData
        }
      )

      if (response.success) {
        showNotification('模型供应商添加成功！', 'success')
        setTimeout(() => {
          router.push('/admin?tab=providers')
        }, 1500)
        return response
      }
    },
    '添加模型供应商'
  )

  loading.value = false
}

const handleCancel = () => {
  router.push('/admin?tab=providers')
}

</script>