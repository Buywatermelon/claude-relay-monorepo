<template>
  <div class="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-orange-100">
    <div class="px-6 py-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-900">模型供应商管理</h3>
          <p class="text-sm text-gray-600 mt-1">管理接入的第三方模型供应商，如魔搭、智谱 AI 等</p>
        </div>
        <NuxtLink to="/admin/add-provider" 
                 class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>添加供应商</span>
        </NuxtLink>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="provider in providers" :key="provider.id" 
             class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition duration-300 group">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">{{ provider.name }}</h4>
                <p class="text-sm text-gray-500">
                  <span v-if="provider.type === 'openai'">OpenAI 兼容模型</span>
                  <span v-else-if="provider.type === 'gemini'">Google Gemini 模型</span>
                  <span v-else>{{ provider.type }} 模型</span>
                </p>
              </div>
            </div>
            <span :class="provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  class="px-3 py-1 text-xs font-medium rounded-full">
              {{ provider.status === 'active' ? '• 活跃' : '• 停用' }}
            </span>
          </div>
          
          <div class="space-y-3 mb-6">
            <div class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <span class="text-gray-600 truncate">{{ provider.endpoint }}</span>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center space-x-2 text-sm">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span class="text-gray-600">
                  支持模型 ({{ provider.models?.length || 0 }}):
                </span>
              </div>
              
              <!-- 模型列表显示 -->
              <div class="ml-6">
                <div v-if="!provider.models?.length" 
                     class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md italic">
                  未配置模型
                </div>
                <div v-else class="space-y-2">
                  <!-- 默认显示前3个模型 -->
                  <div class="flex flex-wrap gap-1">
                    <span v-for="model in (expandedProviders.has(provider.id) ? provider.models : provider.models.slice(0, 3))" 
                          :key="model"
                          class="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md font-mono hover:bg-blue-100 transition-colors">
                      {{ model }}
                    </span>
                  </div>
                  <!-- 展开/收起按钮 -->
                  <button v-if="provider.models.length > 3"
                          @click="toggleProviderExpansion(provider.id)"
                          class="text-xs text-orange-500 hover:text-orange-600 flex items-center space-x-1 transition-colors">
                    <span>{{ expandedProviders.has(provider.id) ? '收起' : `查看全部 ${provider.models.length} 个模型` }}</span>
                    <svg class="w-3 h-3 transition-transform" 
                         :class="expandedProviders.has(provider.id) ? 'rotate-180' : ''"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              <span class="text-gray-600">密钥池: {{ keyPoolStatuses.get(provider.id) || '加载中...' }}</span>
            </div>
            
            <!-- 备注描述显示 -->
            <div v-if="provider.description" class="flex items-start space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4 4z"></path>
              </svg>
              <span class="text-gray-600 break-words">{{ provider.description }}</span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <NuxtLink :to="`/admin/key-pool/${provider.id}`" 
                    class="px-4 py-2 text-emerald-600 hover:text-emerald-700 rounded-xl border border-emerald-200 hover:border-emerald-300 transition duration-200 text-sm inline-flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              密钥池
            </NuxtLink>
            <button @click="editProvider(provider)" 
                    class="px-4 py-2 text-orange-600 hover:text-orange-700 rounded-xl border border-orange-200 hover:border-orange-300 transition duration-200 text-sm">
              编辑
            </button>
            <button @click="deleteProvider(provider.id)" 
                    class="px-4 py-2 text-red-600 hover:text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition duration-200 text-sm">
              删除
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="providers.length === 0" class="text-center py-8">
        <p class="text-gray-500">暂无模型供应商</p>
      </div>
    </div>
  </div>

  <!-- 编辑供应商模态框 -->
  <div v-if="showEditModal && editingProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center px-6 py-4 border-b">
        <h3 class="text-xl font-bold text-gray-900">编辑供应商</h3>
        <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="px-6 py-4 overflow-y-auto flex-1">
        <ProviderForm 
          :provider="editingProvider"
          :loading="editLoading"
          @submit="updateProvider"
          @cancel="cancelEdit" />
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
</template>

<script setup lang="ts">
import { useProviders } from '../../composables/useProviders'
import ConfirmDialog from '../ui/ConfirmDialog.vue'

// 使用 composable 来管理供应商相关逻辑
const {
  providers,
  keyPoolStatuses,
  expandedProviders,
  showEditModal,
  editingProvider,
  editLoading,
  showConfirmDialog,
  confirmDialogConfig,
  confirmLoading,
  editProvider,
  updateProvider,
  cancelEdit,
  deleteProvider,
  toggleProviderExpansion,
  handleConfirmDialogCancel,
  handleConfirmDialogConfirm
} = useProviders()
</script>