/**
 * 审计日志数据访问层
 */

import { BaseRepository } from '../base-repository';
import { auditLogs, type NewAuditLog } from '../../database/schema';
import { safeJsonStringify } from '../../utils/database';

export class AuditRepository extends BaseRepository {
  /**
   * 记录审计日志
   */
  async log(data: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    await this.db
      .insert(auditLogs)
      .values({
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: safeJsonStringify(data.details),
        ipAddress: data.ipAddress
      })
      .run();
  }
}