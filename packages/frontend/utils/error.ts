/**
 * 错误处理工具函数
 */

/**
 * 从错误对象中提取错误信息
 * 后端标准错误格式: { success: false, error: { message: "..." } }
 * 
 * @param error - 错误对象
 * @param defaultMessage - 默认错误信息
 * @returns 提取的错误信息
 */
export function extractErrorMessage(error: any, defaultMessage: string = '操作失败，请重试'): string {
  // 优先使用后端标准格式
  if (error?.data?.error?.message) {
    return error.data.error.message
  }
  
  // 备用：其他可能的错误格式
  if (error?.data?.message) {
    return error.data.message
  }
  
  if (error?.message) {
    return error.message
  }
  
  return defaultMessage
}