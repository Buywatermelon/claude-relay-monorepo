<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-amber-50">
    <div class="container mx-auto px-4 py-8 max-w-5xl">
      <div class="mb-6">
      <div class="flex items-center space-x-3 mb-2">
        <button @click="() => navigateBack()" class="text-gray-500 hover:text-gray-700">
          <Icon name="material-symbols:arrow-back" class="w-6 h-6" />
        </button>
        <h1 class="text-xl font-semibold text-gray-900">添加路由配置</h1>
      </div>
      <p class="text-sm text-gray-500 ml-9">配置不同场景下的模型路由策略</p>
    </div>

    <RouteConfigForm
      :loading="loading"
      :available-providers="providers"
      @submit="handleSubmit"
      @cancel="navigateBack"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProviders } from '~/composables/useProviders'
import { useRouteConfigs } from '~/composables/useRouteConfigs'
import type { AddRouteConfigRequest } from '../../../../shared/types/admin/routes'

// 添加认证中间件
definePageMeta({
  middleware: 'auth'
})

const { providers, fetchProviders } = useProviders()
const { addRouteConfig } = useRouteConfigs()

const loading = ref(false)

// 加载供应商数据
onMounted(async () => {
  await fetchProviders()
})

const handleSubmit = async (data: AddRouteConfigRequest) => {
  loading.value = true
  try {
    await addRouteConfig(data)
    // 成功后导航回列表页面，通知已在 composable 中处理
    await navigateBack()
  } catch (error) {
    console.error('Failed to create route config:', error)
    // 错误通知已在 composable 中处理
  } finally {
    loading.value = false
  }
}

const navigateBack = () => {
  // 导航回仪表板的路由配置标签页
  return navigateTo('/admin?tab=routes')
}
</script>