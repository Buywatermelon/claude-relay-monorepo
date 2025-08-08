/**
 * 路由配置数据访问层
 */

import type { RouteConfig } from '../../../../shared/types/admin/routes'
import type { SelectedConfig } from '../services/proxy/engines/types'

export class RouteConfigRepository {
  private readonly ROUTE_CONFIGS_KEY = 'admin_route_configs'
  
  constructor(private kv: KVNamespace) {}

  /**
   * 获取所有路由配置
   */
  async getAllConfigs(): Promise<RouteConfig[]> {
    const data = await this.kv.get(this.ROUTE_CONFIGS_KEY)
    if (!data) {
      return []
    }
    
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }
  
  /**
   * 保存所有路由配置
   */
  async saveAllConfigs(configs: RouteConfig[]): Promise<void> {
    await this.kv.put(this.ROUTE_CONFIGS_KEY, JSON.stringify(configs))
  }

  /**
   * 获取当前选择的配置
   */
  async getSelectedConfig(): Promise<SelectedConfig | null> {
    const data = await this.kv.get('admin_selected_config')
    if (!data) {
      return null
    }
    return JSON.parse(data) as SelectedConfig
  }

  /**
   * 获取路由配置
   */
  async getRouteConfig(routeId: string): Promise<RouteConfig | null> {
    const configs = await this.getAllConfigs()
    return configs.find(c => c.id === routeId) || null
  }

  /**
   * 获取当前激活的路由配置
   */
  async getActiveRouteConfig(): Promise<RouteConfig | null> {
    const selectedConfig = await this.getSelectedConfig()
    
    if (!selectedConfig || selectedConfig.type !== 'route' || !selectedConfig.routeId) {
      return null
    }
    
    return await this.getRouteConfig(selectedConfig.routeId)
  }

  /**
   * 保存选择的配置
   */
  async setSelectedConfig(config: SelectedConfig): Promise<void> {
    await this.kv.put('admin_selected_config', JSON.stringify(config))
  }

  /**
   * 保存路由配置（兼容旧的单个保存方式）
   */
  async saveRouteConfig(routeConfig: RouteConfig): Promise<void> {
    const configs = await this.getAllConfigs()
    const index = configs.findIndex(c => c.id === routeConfig.id)
    
    if (index >= 0) {
      configs[index] = routeConfig
    } else {
      configs.push(routeConfig)
    }
    
    await this.saveAllConfigs(configs)
  }
}