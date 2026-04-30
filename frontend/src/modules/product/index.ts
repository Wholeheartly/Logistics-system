/**
 * 产品管理模块 (Product Module)
 *
 * 独立功能：
 * - 产品查询 (Product Search)
 * - 产品详情查看
 *
 * 设计原则：
 * - 完全独立，不依赖物流模块
 * - 提供清晰的产品数据接口
 * - 支持未来扩展产品管理功能
 */

export { default as ProductModule } from './ProductModule';
export { default as ProductSearchView } from './views/ProductSearchView';

// 模块上下文
export { ProductProvider, useProduct } from './context/ProductContext';

// 类型
export type { ProductContextType } from './context/ProductContext';
