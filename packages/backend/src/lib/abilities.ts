import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Tables } from './database.types';

type Permission = Tables<'permissions'>;

// 定义应用中的主体类型
export type AppSubjects = 
  | 'Workspace'
  | 'Membership'
  | 'Provider'
  | 'Model'
  | 'ClaudeAccount'
  | 'RouteConfig'
  | 'all';

// 定义应用中的动作类型
export type AppActions = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'manage';

// 定义 Ability 类型
export type AppAbility = MongoAbility<[AppActions, AppSubjects]>;

/**
 * 根据权限列表构建 CASL Ability
 */
export function buildAbility(permissions: Permission[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // 将数据库权限转换为 CASL 规则
  permissions.forEach(permission => {
    const action = permission.action as AppActions;
    const subject = permission.subject as AppSubjects;

    // 基础权限
    if (!permission.conditions && !permission.fields) {
      can(action, subject);
    } 
    // 带条件的权限（预留，当前业务暂不使用）
    else if (permission.conditions) {
      can(action, subject, permission.conditions);
    }
    // 字段级权限（预留，当前业务暂不使用）
    else if (permission.fields) {
      can(action, subject, permission.fields as string[]);
    }
  });

  return build();
}

/**
 * 创建空的 Ability（无任何权限）
 */
export function createEmptyAbility(): AppAbility {
  return createMongoAbility();
}