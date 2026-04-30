/**
 * 物流费用查询模块类型定义
 */

// 区域费用明细
export interface ZoneFeeDetail {
  zone: string;
  zone_name: string;
  base_fee: number;
  additional_fee: number;
  fuel_fee: number;
  residential_fee: number;
  remote_fee: number;
  total_fee: number;
  transit_days: number;
}

// 物流商费用结果
export interface CarrierFeeResult {
  carrier_id: number;
  carrier_name: string;
  carrier_code: string;
  logo_url?: string;
  service_type: string;
  zones: ZoneFeeDetail[];
  min_total: number;
  max_total: number;
  avg_total: number;
}

// 产品属性
export interface ProductAttributes {
  sku: string;
  name: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  gross_weight_kg: number;
  volume_weight_kg: number;
  chargeable_weight_kg: number;
  category: string;
}

// 费用查询请求参数
export interface ShippingFeeQueryParams {
  sku: string;
  warehouse?: string;
}

// 费用查询结果
export interface ShippingFeeQueryResult {
  sku: string;
  product: ProductAttributes;
  warehouse: string;
  query_time: string;
  carriers: CarrierFeeResult[];
  errors: { carrier_name: string; reason: string }[];
  error?: string;
}

// 排序配置
export type SortField = 'carrier_name' | 'min_total' | 'avg_total' | 'max_total' | 'transit_days';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

// 筛选配置
export interface FilterConfig {
  carrierName: string;
  zone: string;
  minFee: number | null;
  maxFee: number | null;
}

// 缓存条目
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
