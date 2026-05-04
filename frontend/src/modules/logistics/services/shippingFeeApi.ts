/**
 * 物流费用查询 API 服务层
 *
 * 特性：
 * - 带认证的请求封装
 * - 请求超时控制（3秒内响应）
 * - 数据缓存机制
 * - 完善的错误处理
 */

import type { ShippingFeeQueryParams, ShippingFeeQueryResult, CacheEntry } from '../../../types/shipping';

import API from '../../../config/api';
const CACHE_TTL = 5 * 60 * 1000; // 缓存5分钟
const REQUEST_TIMEOUT = 3000; // 3秒超时

// 内存缓存存储
const cacheStore = new Map<string, CacheEntry<ShippingFeeQueryResult>>();

/**
 * 生成缓存键
 */
function generateCacheKey(params: ShippingFeeQueryParams): string {
  return `shipping_fee_${params.sku}_${params.warehouse || 'default'}`;
}

/**
 * 从缓存获取数据
 */
function getFromCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * 写入缓存
 */
function setCache<T>(key: string, data: T, ttl = CACHE_TTL): void {
  cacheStore.set(key, {
    data: data as ShippingFeeQueryResult,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * 清除过期缓存
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
    }
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  cacheStore.clear();
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试', { cause: error });
    }
    throw error;
  }
}

/**
 * 带认证的请求封装
 */
async function authFetch(
  token: string | null,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!token) {
    throw new Error('未登录，请先登录系统');
  }
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetchWithTimeout(url, {
    ...options,
    headers,
  });
}

/**
 * 提取错误信息
 */
function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '请求失败';
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.message === 'string') return d.message;
  if (typeof d.error === 'string') return d.error;
  return '请求失败';
}

/**
 * 验证 SKU 格式
 */
export function validateSku(sku: string): { valid: boolean; message?: string } {
  const trimmed = sku.trim();
  if (!trimmed) {
    return { valid: false, message: 'SKU 不能为空' };
  }
  if (trimmed.length < 3) {
    return { valid: false, message: 'SKU 长度不能少于3个字符' };
  }
  if (trimmed.length > 50) {
    return { valid: false, message: 'SKU 长度不能超过50个字符' };
  }
  // SKU 格式：字母、数字、连字符、下划线
  const skuPattern = /^[A-Za-z0-9\-_]+$/;
  if (!skuPattern.test(trimmed)) {
    return { valid: false, message: 'SKU 只能包含字母、数字、连字符和下划线' };
  }
  return { valid: true };
}

/**
 * 查询物流费用
 *
 * @param token 认证令牌
 * @param params 查询参数
 * @param useCache 是否使用缓存（默认true）
 * @returns 查询结果
 */
export async function queryShippingFees(
  token: string | null,
  params: ShippingFeeQueryParams,
  useCache = true
): Promise<ShippingFeeQueryResult> {
  // 参数验证
  const validation = validateSku(params.sku);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const cacheKey = generateCacheKey(params);

  // 尝试从缓存读取
  if (useCache) {
    const cached = getFromCache<ShippingFeeQueryResult>(cacheKey);
    if (cached) {
      return { ...cached, query_time: new Date().toISOString() };
    }
  }

  // 发起请求
  const url = `${API}/api/shipping/fees`;
  const body: Record<string, unknown> = { sku: params.sku.trim().toUpperCase() };
  if (params.warehouse) {
    body.warehouse = params.warehouse;
  }

  const response = await authFetch(token, url, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(extractErrorMessage(data));
  }

  const result: ShippingFeeQueryResult = {
    ...data,
    query_time: new Date().toISOString(),
  };

  // 写入缓存
  if (useCache && !result.error) {
    setCache(cacheKey, result);
  }

  return result;
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}
