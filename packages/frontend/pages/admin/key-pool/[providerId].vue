<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-amber-50">
    <div class="p-8">
      <!-- 页面标题 -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">密钥池管理</h1>
            <p class="text-sm text-gray-600 mt-2">{{ providerName }} - 管理 API 密钥池</p>
          </div>
          <NuxtLink to="/admin?tab=providers" 
                   class="text-orange-600 hover:text-orange-700 flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>返回供应商列表</span>
          </NuxtLink>
        </div>
      </div>

      <!-- 统计信息卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">总密钥数</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalKeys }}</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">活跃密钥</p>
              <p class="text-2xl font-bold text-emerald-600">{{ stats.activeKeys }}</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">限流密钥</p>
              <p class="text-2xl font-bold text-yellow-600">{{ stats.exhaustedKeys }}</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">错误密钥</p>
              <p class="text-2xl font-bold text-red-600">{{ stats.errorKeys }}</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-orange-100">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-900">密钥管理</h2>
          <div class="flex space-x-3">
            <button @click="showAddKeyModal = true"
                    class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>添加密钥</span>
            </button>
            <button @click="showBatchImportModal = true"
                    class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span>批量导入</span>
            </button>
          </div>
        </div>

        <!-- 密钥列表 -->
        <div v-if="keys.length > 0" class="space-y-4">
          <div v-for="key in keys" :key="key.id" 
               class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-orange-200 rounded-xl p-4 hover:shadow-md transition duration-300">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div :class="getStatusColor(key.status)"
                     class="w-3 h-3 rounded-full"></div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ maskApiKey(key.key) }}</p>
                  <p class="text-xs text-gray-500">
                    ID: {{ key.id }} | 
                    成功: {{ key.successCount }} | 
                    失败: {{ key.failureCount }}
                    <span v-if="key.lastUsedAt"> | 最后使用: {{ formatDate(key.lastUsedAt) }}</span>
                  </p>
                  <p v-if="key.errorMessage" class="text-xs text-red-600 mt-1">{{ key.errorMessage }}</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <select v-model="key.status" @change="updateKeyStatus(key.id, key.status)"
                        class="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="active">活跃</option>
                  <option value="disabled">禁用</option>
                  <option value="exhausted">限流</option>
                  <option value="error">错误</option>
                </select>
                <button @click="showDeleteConfirm(key.id, key.key)"
                        class="text-red-600 hover:text-red-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
          <p class="text-gray-500">暂无密钥，请添加第一个 API 密钥</p>
        </div>
      </div>

      <!-- 维护操作 -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-orange-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">维护操作</h2>
        <div class="flex space-x-3">
          <button @click="performMaintenance"
                  class="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200">
            重置过期密钥
          </button>
          <button @click="refreshStats"
                  class="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition duration-200">
            刷新统计信息
          </button>
        </div>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogConfig?.title"
      :message="confirmDialogConfig?.message"
      :description="confirmDialogConfig?.description"
      :type="confirmDialogConfig?.type || 'danger'"
      :loading="confirmLoading"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
    />

    <!-- 添加密钥模态框 -->
    <div v-if="showAddKeyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 class="text-xl font-bold text-gray-900 mb-4">添加 API 密钥</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API 密钥</label>
            <input v-model="newKey" type="text"
                   class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                   placeholder="输入 API 密钥...">
          </div>
          <div class="flex space-x-3">
            <button @click="showAddKeyModal = false"
                    class="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition duration-200">
              取消
            </button>
            <button @click="addKey" :disabled="!newKey"
                    class="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              添加
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入模态框 -->
    <div v-if="showBatchImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 class="text-xl font-bold text-gray-900 mb-4">批量导入密钥</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API 密钥列表</label>
            <textarea v-model="batchKeys" rows="6"
                      class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="每行一个 API 密钥..."></textarea>
            <p class="text-xs text-gray-500 mt-1">每行输入一个 API 密钥</p>
          </div>
          <div class="flex space-x-3">
            <button @click="showBatchImportModal = false"
                    class="flex-1 py-2 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition duration-200">
              取消
            </button>
            <button @click="batchImport" :disabled="!batchKeys"
                    class="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiKey, KeyPoolStats } from '../../../../../shared/types/key-pool'
import type { ModelProvider } from '../../../../../shared/types/admin/providers'

// 添加认证中间件
definePageMeta({
  middleware: 'auth'
})
import ConfirmDialog from '../../../components/ui/ConfirmDialog.vue'

const route = useRoute()
const config = useRuntimeConfig()
const router = useRouter()

const providerId = route.params.providerId as string
const providerName = ref('加载中...')
const keys = ref<ApiKey[]>([])
const stats = ref<KeyPoolStats>({
  totalKeys: 0,
  activeKeys: 0,
  exhaustedKeys: 0,
  errorKeys: 0,
  disabledKeys: 0,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0
})

const showAddKeyModal = ref(false)
const showBatchImportModal = ref(false)
const newKey = ref('')
const batchKeys = ref('')

// 确认删除相关状态
const showConfirmDialog = ref(false)
const confirmLoading = ref(false)
const confirmDialogConfig = ref<{
  title: string
  message: string
  description: string
  type: 'danger' | 'warning' | 'info'
} | null>(null)
const deletingKeyId = ref<string | null>(null)

// 加载数据
onMounted(async () => {
  await loadProviderInfo()
  await loadKeyPoolData()
})

// 加载供应商信息
const loadProviderInfo = async () => {
  try {
    const response = await $fetch<{ success: boolean; data: ModelProvider[] }>(
      '/api/admin/providers',
      { baseURL: config.public.apiBaseUrl }
    )
    if (response.success) {
      const provider = response.data.find((p: ModelProvider) => p.id === providerId)
      if (provider) {
        providerName.value = provider.name
      }
    }
  } catch (error) {
    console.error('Failed to load provider info:', error)
  }
}

// 加载密钥池数据
const loadKeyPoolData = async () => {
  try {
    console.log(`[Frontend] Loading key pool data for provider: ${providerId}`)
    console.log(`[Frontend] API URL: ${config.public.apiBaseUrl}/api/admin/key-pool/${providerId}`)
    
    const response = await $fetch<{ 
      providerId: string
      providerName: string
      keys: ApiKey[]
      stats: KeyPoolStats
      hasKeys: boolean
    }>(
      `/api/admin/key-pool/${providerId}`,
      { baseURL: config.public.apiBaseUrl }
    )
    
    console.log('[Frontend] Key pool data loaded successfully:', response)
    keys.value = response.keys
    stats.value = response.stats
  } catch (error: any) {
    console.error('[Frontend] Failed to load key pool data:', error)
    console.error('[Frontend] Error status:', error.statusCode || error.status)
    console.error('[Frontend] Error data:', error.data)
    console.error('[Frontend] Full error object:', error)
  }
}

// 添加密钥
const addKey = async () => {
  if (!newKey.value) return
  
  try {
    await $fetch(`/api/admin/key-pool/${providerId}/keys`, {
      method: 'POST',
      baseURL: config.public.apiBaseUrl,
      body: { key: newKey.value }
    })
    
    newKey.value = ''
    showAddKeyModal.value = false
    await loadKeyPoolData()
  } catch (error) {
    console.error('Failed to add key:', error)
  }
}

// 批量导入
const batchImport = async () => {
  if (!batchKeys.value) return
  
  const keyList = batchKeys.value.split('\n').filter((k: string) => k.trim())
  if (keyList.length === 0) return
  
  try {
    await $fetch(`/api/admin/key-pool/${providerId}/keys/batch`, {
      method: 'POST',
      baseURL: config.public.apiBaseUrl,
      body: { keys: keyList }
    })
    
    batchKeys.value = ''
    showBatchImportModal.value = false
    await loadKeyPoolData()
  } catch (error) {
    console.error('Failed to batch import keys:', error)
  }
}

// 更新密钥状态
const updateKeyStatus = async (keyId: string, status: string) => {
  try {
    await $fetch(`/api/admin/key-pool/${providerId}/keys/${keyId}`, {
      method: 'PUT',
      baseURL: config.public.apiBaseUrl,
      body: { status }
    })
    
    await loadKeyPoolData()
  } catch (error) {
    console.error('Failed to update key status:', error)
  }
}

// 显示删除确认对话框
const showDeleteConfirm = (keyId: string, keyValue: string) => {
  deletingKeyId.value = keyId
  confirmDialogConfig.value = {
    title: '删除密钥',
    message: '确定要删除这个 API 密钥吗？',
    description: `密钥: ${maskApiKey(keyValue)}\n\n删除后将无法恢复，请谨慎操作。`,
    type: 'danger'
  }
  showConfirmDialog.value = true
}

// 处理确认删除
const handleConfirmDialogConfirm = async () => {
  if (!deletingKeyId.value) return
  
  confirmLoading.value = true
  
  try {
    await $fetch(`/api/admin/key-pool/${providerId}/keys/${deletingKeyId.value}`, {
      method: 'DELETE',
      baseURL: config.public.apiBaseUrl
    })
    
    await loadKeyPoolData()
  } catch (error) {
    console.error('Failed to delete key:', error)
  } finally {
    confirmLoading.value = false
    showConfirmDialog.value = false
    deletingKeyId.value = null
    confirmDialogConfig.value = null
  }
}

// 取消删除
const handleConfirmDialogCancel = () => {
  showConfirmDialog.value = false
  deletingKeyId.value = null
  confirmDialogConfig.value = null
}

// 执行维护
const performMaintenance = async () => {
  try {
    await $fetch(`/api/admin/key-pool/${providerId}/maintenance`, {
      method: 'POST',
      baseURL: config.public.apiBaseUrl
    })
    
    await loadKeyPoolData()
  } catch (error) {
    console.error('Failed to perform maintenance:', error)
  }
}

// 刷新统计信息
const refreshStats = async () => {
  await loadKeyPoolData()
}

// 工具函数
const maskApiKey = (key: string): string => {
  if (key.length <= 8) return '***'
  return key.substring(0, 4) + '...' + key.substring(key.length - 4)
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-emerald-500'
    case 'exhausted': return 'bg-yellow-500'
    case 'error': return 'bg-red-500'
    case 'disabled': return 'bg-gray-500'
    default: return 'bg-gray-300'
  }
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>