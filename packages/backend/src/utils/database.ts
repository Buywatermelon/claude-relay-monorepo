/**
 * 数据库相关的工具函数
 */

import { sql } from 'drizzle-orm';

/**
 * 获取当前时间戳（ISO 格式）
 * @returns ISO 格式的时间字符串
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 格式化日期为数据库存储格式
 * @param date - 日期对象
 * @returns ISO 格式的时间字符串
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * 解析数据库日期字符串
 * @param dateStr - ISO 格式的时间字符串
 * @returns Date 对象
 */
export function parseDateFromDB(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * 批量插入时忽略冲突的辅助函数
 * @param items - 要插入的数据数组
 * @param batchSize - 批次大小
 * @returns 分批后的数组
 */
export function batchArray<T>(items: T[], batchSize: number = 100): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * 生成分页信息
 * @param page - 当前页码（从 1 开始）
 * @param pageSize - 每页大小
 * @param total - 总数
 * @returns 分页信息
 */
export function generatePagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * 构建模糊搜索条件
 * @param searchTerm - 搜索词
 * @returns SQL LIKE 格式的搜索词
 */
export function buildLikeQuery(searchTerm: string): string {
  return `%${searchTerm.replace(/[%_]/g, '\\$&')}%`;
}

/**
 * 清理和验证排序字段
 * @param field - 排序字段
 * @param allowedFields - 允许的字段列表
 * @param defaultField - 默认字段
 * @returns 验证后的排序字段
 */
export function validateSortField(
  field: string | undefined,
  allowedFields: string[],
  defaultField: string
): string {
  if (!field || !allowedFields.includes(field)) {
    return defaultField;
  }
  return field;
}

/**
 * 清理和验证排序方向
 * @param direction - 排序方向
 * @returns 'asc' 或 'desc'
 */
export function validateSortDirection(direction: string | undefined): 'asc' | 'desc' {
  return direction === 'desc' ? 'desc' : 'asc';
}

/**
 * JSON 安全解析
 * @param jsonStr - JSON 字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T>(jsonStr: string | null | undefined, defaultValue: T): T {
  if (!jsonStr) return defaultValue;
  
  try {
    return JSON.parse(jsonStr);
  } catch {
    return defaultValue;
  }
}

/**
 * JSON 安全序列化
 * @param obj - 要序列化的对象
 * @returns JSON 字符串或 null
 */
export function safeJsonStringify(obj: any): string | null {
  if (obj === undefined || obj === null) return null;
  
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}