/**
 * 配置管理模块 (Config Module)
 *
 * 核心功能：
 * - 系统字段自动识别与扫描
 * - 配置项分类管理
 * - 字段变更追踪与历史版本
 * - 配置对比与回滚
 * - 操作审计日志
 */

export { default as ConfigModule } from './ConfigModule';
export { default as ConfigListView } from './views/ConfigListView';
export { default as ConfigDetailView } from './views/ConfigDetailView';
export { default as ConfigAuditView } from './views/ConfigAuditView';
export { default as ZoneConfigView } from './views/ZoneConfigView';

// 模块上下文
export { ConfigProvider, useConfig } from './context/ConfigContext';
export type { ConfigContextType } from './context/ConfigContext';
