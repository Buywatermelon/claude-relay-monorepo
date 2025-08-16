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
            <div class="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
                Claude Code 管理中心
              </h1>
              <p class="text-xs text-gray-500">统一管理您的 AI 模型服务</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <!-- 当前使用模型 -->
            <div class="flex items-center space-x-2 bg-white/50 rounded-xl px-3 py-2">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-sm text-gray-700">当前:</span>
              <span class="text-sm font-medium text-orange-600">{{ currentModelDisplay }}</span>
            </div>
            
            <button @click="logout" 
                    class="text-gray-500 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-white/50 transition duration-200">
              退出登录
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="relative z-10 max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- 统计卡片 -->
        <DashboardStats :dashboard="dashboard" />

        <!-- 标签页导航 -->
        <div class="bg-white/50 backdrop-blur-sm rounded-2xl p-1 mb-8">
          <nav class="flex space-x-1">
            <button @click="activeTab = 'claude-accounts'"
                    :class="activeTab === 'claude-accounts' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'"
                    class="flex-1 py-3 px-6 text-sm font-medium rounded-xl transition duration-200">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>Claude 账号</span>
              </div>
            </button>
            <button @click="activeTab = 'providers'" 
                    :class="activeTab === 'providers' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'"
                    class="flex-1 py-3 px-6 text-sm font-medium rounded-xl transition duration-200">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <span>模型供应商</span>
              </div>
            </button>
            <button @click="activeTab = 'models'"
                    :class="activeTab === 'models' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'"
                    class="flex-1 py-3 px-6 text-sm font-medium rounded-xl transition duration-200">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <span>模型选择</span>
              </div>
            </button>
            <button @click="activeTab = 'routes'"
                    :class="activeTab === 'routes' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'"
                    class="flex-1 py-3 px-6 text-sm font-medium rounded-xl transition duration-200">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                <span>路由配置</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- 内容区域 -->
        <div class="space-y-8">
          <!-- Claude 账号管理 -->
          <ClaudeAccountManager v-if="activeTab === 'claude-accounts'" />
          
          <!-- 供应商管理 -->
          <ProviderManager v-if="activeTab === 'providers'" />
          
          <!-- 模型选择 -->
          <ModelSelector 
            v-if="activeTab === 'models'"
            @navigate-to-routes="activeTab = 'routes'" />
          
          <!-- 路由配置管理 -->
          <RouteConfigManager 
            v-if="activeTab === 'routes'"
            :available-providers="providers" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide, watch } from 'vue'
import type { DashboardData } from '../../../../shared/types/admin/dashboard'
import type { ModelProvider } from '../../../../shared/types/admin/providers'
import { API_ENDPOINTS } from '../../../../shared/constants/endpoints'
import { useModelSelection } from '../../composables/useModelSelection'

// 导入组件
import DashboardStats from '../../components/admin/DashboardStats.vue'
import ClaudeAccountManager from '../../components/admin/ClaudeAccountManager.vue'
import ProviderManager from '../../components/admin/ProviderManager.vue'
import ModelSelector from '../../components/admin/ModelSelector.vue'
import RouteConfigManager from '../../components/admin/RouteConfigManager.vue'

// 页面元信息
useHead({
  title: 'Claude Code 管理中心 - 仪表板',
  meta: [
    { name: 'description', content: 'Claude Code 管理中心仪表板' }
  ]
})

const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()

// 使用模型选择 composable
const { loadAvailableRouteConfigs } = useModelSelection()

// 响应式数据
const activeTab = ref(route.query.tab as string || 'claude-accounts')
const dashboard = ref<DashboardData | null>(null)
const providers = ref<ModelProvider[]>([])

// 计算属性
const currentModelDisplay = computed(() => {
  if (!dashboard.value?.currentModel) return '官方 Claude'
  return dashboard.value.currentModel.name || '官方 Claude'
})

// 监听标签页切换，在切换到路由配置时重新加载供应商数据
watch(activeTab, async (newTab) => {
  await router.replace({ query: {...route.query, tab: newTab } })
  
  if (newTab === 'routes') {
    // 切换到路由配置页面时，重新加载供应商列表以确保数据最新
    await loadProviders()
  }
})

// 页面初始化
onMounted(async () => {
  // 检查认证状态
  if (sessionStorage.getItem('admin_authenticated') !== 'true') {
    await router.push('/admin')
    return
  }
  
  // 加载数据
  await Promise.all([
    loadDashboardData(),
    loadProviders()
  ])
})

// 数据加载方法
const loadDashboardData = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: DashboardData }>(
      API_ENDPOINTS.ADMIN_DASHBOARD,
      { baseURL: config.public.apiBaseUrl }
    )
    if (response.success) {
      dashboard.value = response.data
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

const loadProviders = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: ModelProvider[] }>(
      API_ENDPOINTS.ADMIN_PROVIDERS,
      { baseURL: config.public.apiBaseUrl }
    )
    if (response.success) {
      providers.value = response.data
    }
  } catch (error) {
    console.error('Failed to load providers:', error)
  }
}

// 用户操作
const logout = async () => {
  sessionStorage.removeItem('admin_authenticated')
  sessionStorage.removeItem('admin_username')
  await router.push('/admin')
}

// 提供刷新 dashboard 数据的方法给子组件
const refreshDashboard = async () => {
  await Promise.all([
    loadDashboardData(),
    loadAvailableRouteConfigs() // 刷新模型选择的路由配置列表
  ])
}

// 通过 provide/inject 向子组件提供刷新方法
provide('refreshDashboard', refreshDashboard)
</script>