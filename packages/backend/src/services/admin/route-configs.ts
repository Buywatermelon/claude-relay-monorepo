/**
 * 路由配置管理服务
 */

import type { RouteConfig, AddRouteConfigRequest, EditRouteConfigRequest } from '../../../../../shared/types/admin/routes'
import { RouteConfigRepository } from '../../repositories/provider/route-config-repository'

export class RouteConfigService {
  private repository: RouteConfigRepository
  
  constructor(kv: KVNamespace) {
    this.repository = new RouteConfigRepository(kv)
  }
  
  /**
   * 获取所有路由配置
   */
  async getAllConfigs(): Promise<RouteConfig[]> {
    return await this.repository.getAllConfigs()
  }
  
  /**
   * 获取单个路由配置
   */
  async getConfig(id: string): Promise<RouteConfig | null> {
    return await this.repository.getRouteConfig(id)
  }
  
  /**
   * 创建路由配置
   */
  async createConfig(request: AddRouteConfigRequest): Promise<RouteConfig> {
    const configs = await this.repository.getAllConfigs()
    
    const newConfig: RouteConfig = {
      id: Date.now().toString(),
      name: request.name,
      description: request.description,
      rules: request.rules,
      config: request.config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    configs.push(newConfig)
    await this.repository.saveAllConfigs(configs)
    
    return newConfig
  }
  
  /**
   * 更新路由配置
   */
  async updateConfig(id: string, request: EditRouteConfigRequest): Promise<RouteConfig | null> {
    const configs = await this.repository.getAllConfigs()
    const index = configs.findIndex(c => c.id === id)
    
    if (index === -1) {
      return null
    }
    
    const updatedConfig: RouteConfig = {
      ...configs[index],
      ...(request.name !== undefined && { name: request.name }),
      ...(request.description !== undefined && { description: request.description }),
      ...(request.rules !== undefined && { rules: request.rules }),
      ...(request.config !== undefined && { config: request.config }),
      updatedAt: new Date().toISOString()
    }
    
    configs[index] = updatedConfig
    await this.repository.saveAllConfigs(configs)
    
    return updatedConfig
  }
  
  /**
   * 删除路由配置
   */
  async deleteConfig(id: string): Promise<void> {
    const configs = await this.repository.getAllConfigs()
    const filteredConfigs = configs.filter(c => c.id !== id)
    
    if (filteredConfigs.length === configs.length) {
      throw new Error('路由配置不存在')
    }
    
    await this.repository.saveAllConfigs(filteredConfigs)
  }
}