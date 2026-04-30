/**
 * 全局共享类型定义
 */

// 物流商结果
export interface CarrierResult {
  carrier_id?: number;
  carrier_name: string;
  billed_weight_lb?: number;
  billed_weight_int?: number;
  actual_weight_lb?: number;
  dim_weight_lb?: number;
  zone?: number;
  base_freight?: number;
  highest_surcharge?: number;
  highest_surcharge_type?: string;
  residential_fee?: number;
  remote_fee?: number;
  dar_fee?: number;
  non_mach_fee?: number;
  fuel_fee?: number;
  fuel_rate?: number;
  total: number;
  total_without_fuel?: number;
  transit_time: string;
  is_cheapest: boolean;
  cg_category?: string;
  base_rate?: number;
  per_lb_rate?: number;
  excess_weight?: number;
  warehouse?: string;
  warehouse_name?: string;
}

// 比价结果
export interface CompareResult {
  sku: string;
  product: {
    sku: string;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    gross_weight_kg: number;
  };
  warehouse: string;
  zip_code: string;
  is_residential: boolean;
  results: CarrierResult[];
  errors: { carrier_name: string; reason: string }[];
  error?: string;
}

// 区域比价结果
export interface ZoneCompareResult {
  sku: string;
  zip_code: string;
  is_residential: boolean;
  warehouses: {
    warehouse: string;
    warehouse_name: string;
    zone: number;
    results: CarrierResult[];
    errors: { carrier_name: string; reason: string }[];
  }[];
  all_carriers: CarrierResult[];
  error?: string;
}

// 产品（双版本单位）
export interface Product {
  id?: number;
  sku: string;
  name: string;
  model?: string | null;
  specification?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  gross_weight_kg: number;
  length_inch?: number | null;
  width_inch?: number | null;
  height_inch?: number | null;
  gross_weight_lb?: number | null;
  unit_converted?: boolean;
  converted_at?: string | null;
  category?: string | null;
  brand?: string | null;
  supplier?: string | null;
  description?: string | null;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

// 产品导入结果
export interface ImportResult {
  success: boolean;
  message: string;
  total: number;
  success_count: number;
  failed_count: number;
  parse_errors: Array<{ row: number; sku: string; errors: string[] }>;
  import_errors: Array<{ sku: string; errors: string[] }>;
}

// 对账批次
export interface ReconBatch {
  id: number;
  batch_no: string;
  name: string;
  file_name: string;
  total_records: number;
  matched_records: number;
  diff_records: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

// 对账明细
export interface ReconDetail {
  id: number;
  row_no: number;
  file_order_no: string | null;
  file_tracking_no: string | null;
  file_sku: string | null;
  file_carrier: string | null;
  file_total_amount: number | null;
  file_base_amount: number | null;
  file_weight_lb: number | null;
  file_billed_weight: number | null;
  file_zone: string | null;
  file_warehouse: string | null;
  file_zip_code: string | null;
  sys_total_amount: number | null;
  sys_base_amount: number | null;
  sys_weight_lb: number | null;
  sys_billed_weight: number | null;
  sys_zone: number | null;
  has_diff: boolean;
  diff_types: string[];
  diff_amount: number;
  diff_details: Record<string, any>;
}
