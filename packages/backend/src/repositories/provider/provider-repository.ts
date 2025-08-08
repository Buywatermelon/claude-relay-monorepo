/**
 * 供应商数据访问层
 */

import { ModelProvider } from '../../../../shared/types/admin/providers'
import { ADMIN_STORAGE_KEYS } from '../../../../shared/constants/admin/storage'

export class ProviderRepository {
  constructor(private adminKv: KVNamespace) {}

  // 获取所有供应商
  async getAll(): Promise<ModelProvider[]> {
    const data = await this.adminKv.get(ADMIN_STORAGE_KEYS.MODEL_PROVIDERS)
    return data ? JSON.parse(data) : []
  }

  // 根据 ID 获取供应商
  async getById(id: string): Promise<ModelProvider | null> {
    const providers = await this.getAll()
    return providers.find(p => p.id === id) || null
  }

  // 保存供应商列表
  async save(providers: ModelProvider[]): Promise<void> {
    await this.adminKv.put(ADMIN_STORAGE_KEYS.MODEL_PROVIDERS, JSON.stringify(providers))
  }

  // 添加供应商
  async add(provider: ModelProvider): Promise<void> {
    const providers = await this.getAll()
    providers.push(provider)
    await this.save(providers)
  }

  // 更新供应商
  async update(id: string, updatedProvider: ModelProvider): Promise<boolean> {
    const providers = await this.getAll()
    const index = providers.findIndex(p => p.id === id)
    
    if (index === -1) {
      return false
    }

    providers[index] = updatedProvider
    await this.save(providers)
    return true
  }

  // 删除供应商
  async delete(id: string): Promise<boolean> {
    const providers = await this.getAll()
    const originalLength = providers.length
    const updatedProviders = providers.filter(p => p.id !== id)
    
    if (updatedProviders.length === originalLength) {
      return false
    }

    await this.save(updatedProviders)
    return true
  }

  // 检查供应商是否存在
  async exists(name: string, endpoint: string): Promise<boolean> {
    const providers = await this.getAll()
    return providers.some(p => p.name === name || p.endpoint === endpoint)
  }
}