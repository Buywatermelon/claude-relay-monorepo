<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 供应商选择 (仅新增时显示) -->
    <div v-if="!isEdit && !selectedProviderType">
      <h3 class="text-lg font-medium text-gray-900 mb-4">选择供应商类型</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(config, key) in PROVIDER_CONFIGS" :key="key" 
             @click="selectProviderType(key)"
             class="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition duration-200">
          <div class="flex items-center space-x-3">
            <div :class="config.icon" class="w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ config.name }}</h4>
              <p class="text-sm text-gray-500">{{ config.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 表单字段 -->
    <div v-if="selectedProviderType || isEdit" class="space-y-4">
      <!-- 自定义名称 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          供应商名称 <span class="text-red-500">*</span>
        </label>
        <input type="text" 
               v-model="form.name"
               required
               class="block w-full px-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200"
               :placeholder="isEdit ? '供应商名称' : `例如：我的${currentProviderConfig?.name}账号`">
      </div>

      <!-- API 端点 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          API 端点 <span class="text-red-500">*</span>
        </label>
        <input type="url" 
               v-model="form.endpoint"
               required
               :readonly="isEndpointReadonly"
               class="block w-full px-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200"
               :class="{ 'bg-gray-50': isEndpointReadonly }"
               placeholder="https://api.example.com/v1/chat/completions">
      </div>

      <!-- 模型管理 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          支持的模型 <span class="text-red-500">*</span>
        </label>
        <div class="space-y-3">
          <!-- 预设模型快速添加 -->
          <div v-if="availableModels.length > 0" class="bg-gray-50 p-4 rounded-xl">
            <label class="block text-sm font-medium text-gray-600 mb-2">快速添加预设模型</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="model in availableModels" 
                      :key="model"
                      @click="addModel(model)"
                      type="button"
                      :disabled="form.models.includes(model)"
                      class="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="form.models.includes(model) ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-white text-gray-600'">
                <span v-if="form.models.includes(model)">✓</span>
                {{ model }}
              </button>
            </div>
          </div>

          <!-- 当前选择的模型列表 -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              已选模型 ({{ form.models.length }})
            </label>
            <div v-if="form.models.length === 0" class="text-sm text-gray-500 italic py-3 px-4 border border-dashed border-gray-200 rounded-xl text-center">
              请添加至少一个模型
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-2">
              <div v-for="(model, index) in form.models" 
                   :key="index"
                   class="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 group hover:border-orange-200 transition-colors">
                <span class="text-sm text-gray-700 font-mono">{{ model }}</span>
                <button @click="removeModel(index)"
                        type="button" 
                        class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 添加自定义模型 -->
          <div class="flex space-x-2">
            <input type="text" 
                   v-model="customModel"
                   @keyup.enter="addCustomModel"
                   class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200"
                   placeholder="输入模型名称后按回车添加">
            <button @click="addCustomModel"
                    type="button"
                    :disabled="!customModel.trim() || form.models.includes(customModel.trim())"
                    class="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              添加
            </button>
          </div>
        </div>
      </div>


      <!-- 描述 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          描述
        </label>
        <textarea v-model="form.description"
                  rows="3"
                  class="block w-full px-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200 resize-none"
                  placeholder="供应商描述信息">
        </textarea>
      </div>

      <!-- API Key 管理提示 -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h4 class="text-sm font-medium text-blue-900">API 密钥管理</h4>
            <p class="mt-1 text-sm text-blue-700">
              创建供应商后，请前往 <strong>密钥池管理</strong> 页面添加和管理 API 密钥。密钥池支持批量导入、智能轮换和故障恢复功能。
            </p>
          </div>
        </div>
      </div>

      <!-- 按钮 -->
      <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button type="button" @click="handleCancel"
                class="px-6 py-3 border border-orange-300 text-orange-600 rounded-xl hover:bg-orange-50 transition duration-200 font-medium">
          {{ isEdit ? '取消' : '重新选择' }}
        </button>
        <button type="submit" 
                :disabled="loading"
                class="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition duration-200 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {{ loading ? (isEdit ? '保存中...' : '添加中...') : (isEdit ? '保存' : '添加供应商') }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ModelProvider, AddProviderRequest, EditProviderRequest } from '../../../shared/types/admin/providers'
import { PROVIDER_CONFIGS } from '../../../shared/constants/admin/providers'

interface Props {
  provider?: ModelProvider // 编辑时传入
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: AddProviderRequest | EditProviderRequest): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.provider)
const selectedProviderType = ref<string | null>(props.provider?.type || null)
const customModel = ref('')

const form = ref({
  name: props.provider?.name || '',
  endpoint: props.provider?.endpoint || '',
  models: props.provider?.models || [],
  description: props.provider?.description || ''
})

// 多模型管理方法
const addModel = (model: string) => {
  if (model && !form.value.models.includes(model)) {
    form.value.models.push(model)
  }
}

const removeModel = (index: number) => {
  form.value.models.splice(index, 1)
}

const addCustomModel = () => {
  const model = customModel.value.trim()
  if (model && !form.value.models.includes(model)) {
    form.value.models.push(model)
    customModel.value = ''
  }
}


const currentProviderConfig = computed(() => {
  if (!selectedProviderType.value) return null
  return PROVIDER_CONFIGS[selectedProviderType.value as keyof typeof PROVIDER_CONFIGS]
})

const availableModels = computed(() => {
  return currentProviderConfig.value?.models || []
})

// 判断 endpoint 是否应该是只读的
const isEndpointReadonly = computed(() => {
  // 编辑模式下可以编辑
  if (isEdit.value) return false
  // 对于预定义供应商，端点是只读的
  return currentProviderConfig.value?.isPreset || false
})

// 监听选择的供应商类型，自动填充配置
watch(selectedProviderType, (newType) => {
  if (newType && !isEdit.value) {
    const config = PROVIDER_CONFIGS[newType as keyof typeof PROVIDER_CONFIGS]
    if (config) {
      form.value.name = config.name
      form.value.endpoint = config.endpoint || ''
      // 自动添加预设模型
      form.value.models = [...config.models]
    }
  }
})

const selectProviderType = (configKey: string) => {
  selectedProviderType.value = configKey
  const config = PROVIDER_CONFIGS[configKey as keyof typeof PROVIDER_CONFIGS]
  console.log('Selected provider config:', configKey, config)
}

const handleSubmit = () => {
  // 验证至少有一个模型
  if (form.value.models.length === 0) {
    alert('请至少添加一个模型')
    return
  }
  
  if (isEdit.value) {
    const editData: EditProviderRequest = {
      name: form.value.name,
      endpoint: form.value.endpoint,
      models: form.value.models,
      description: form.value.description
    }
    emit('submit', editData)
  } else {
    const config = currentProviderConfig.value
    if (!config) return
    
    const addData: AddProviderRequest = {
      name: form.value.name,
      type: config.type,
      endpoint: form.value.endpoint,
      models: form.value.models,
      transformer: config.transformer,
      description: form.value.description
    }
    emit('submit', addData)
  }
}

const handleCancel = () => {
  if (isEdit.value) {
    emit('cancel')
  } else {
    selectedProviderType.value = null
    form.value = {
      name: '',
      endpoint: '',
      models: [],
      description: ''
    }
    customModel.value = ''
  }
}

// 重置表单（供父组件调用）
const resetForm = () => {
  selectedProviderType.value = null
  form.value = {
    name: '',
    endpoint: '',
    models: [],
    description: ''
  }
  customModel.value = ''
}

defineExpose({
  resetForm
})
</script>