/**
 * 模型数据访问层
 */

import { SelectedModel } from '../../../../../shared/types/admin/models'
import { ADMIN_STORAGE_KEYS } from '../../../../../shared/constants/admin/storage'

export class ModelRepository {
  constructor(private adminKv: KVNamespace) {}

  // 获取当前选中的模型
  async getSelectedModel(): Promise<SelectedModel> {
    const data = await this.adminKv.get(ADMIN_STORAGE_KEYS.SELECTED_MODEL)
    return data 
      ? JSON.parse(data)
      : { id: 'claude', name: '官方 Claude', type: 'claude' }
  }

  // 设置选中的模型
  async setSelectedModel(model: SelectedModel): Promise<void> {
    await this.adminKv.put(ADMIN_STORAGE_KEYS.SELECTED_MODEL, JSON.stringify(model))
  }
}