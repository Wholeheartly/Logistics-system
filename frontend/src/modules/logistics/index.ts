/**
 * 物流管理模块 (Logistics Module)
 *
 * 整合功能：
 * - 物流比价 (Shipping Comparison)
 * - 订单对账 (Order Reconciliation)
 *
 * 内部通信：
 * - 通过模块上下文共享数据
 * - 支持从对账结果跳转至比价查询
 */

export { default as LogisticsModule } from './LogisticsModule';
export { default as LogisticsLayout } from './components/LogisticsLayout';
export { default as ShippingCompareView } from './views/ShippingCompareView';
export { default as ShippingFeeQueryView } from './views/ShippingFeeQueryView';
export { default as ReconciliationView } from './views/ReconciliationView';

// 模块上下文
export { LogisticsProvider, useLogistics } from './context/LogisticsContext';

// 类型
export type { LogisticsContextType } from './context/LogisticsContext';
