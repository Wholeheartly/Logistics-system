/**
 * 物流费用查询 API 服务层单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateSku,
  queryShippingFees,
  clearAllCache,
  getCacheStats,
} from './shippingFeeApi';
import type { ShippingFeeQueryResult } from '../../../types/shipping';

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;

describe('validateSku', () => {
  it('应拒绝空字符串', () => {
    const result = validateSku('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('SKU 不能为空');
  });

  it('应拒绝仅包含空格的字符串', () => {
    const result = validateSku('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('SKU 不能为空');
  });

  it('应拒绝长度小于3的SKU', () => {
    const result = validateSku('AB');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('SKU 长度不能少于3个字符');
  });

  it('应拒绝长度超过50的SKU', () => {
    const result = validateSku('A'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.message).toBe('SKU 长度不能超过50个字符');
  });

  it('应拒绝包含特殊字符的SKU', () => {
    const result = validateSku('SKU@123');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('SKU 只能包含字母、数字、连字符和下划线');
  });

  it('应接受有效的SKU格式', () => {
    const validSkus = ['SKU-123', 'PROD_456', 'ABC123', 'TEST-PROD_01'];
    validSkus.forEach((sku) => {
      const result = validateSku(sku);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  it('应自动去除首尾空格', () => {
    const result = validateSku('  SKU-123  ');
    expect(result.valid).toBe(true);
  });
});

describe('queryShippingFees', () => {
  beforeEach(() => {
    clearAllCache();
    mockFetch.mockClear();
  });

  it('应在 SKU 无效时抛出错误', async () => {
    await expect(queryShippingFees('token', { sku: '' })).rejects.toThrow('SKU 不能为空');
  });

  it('应在未登录时抛出错误', async () => {
    await expect(queryShippingFees(null, { sku: 'TEST-123' })).rejects.toThrow('未登录');
  });

  it('应成功查询并缓存结果', async () => {
    const mockResult: ShippingFeeQueryResult = {
      sku: 'TEST-123',
      product: {
        sku: 'TEST-123',
        name: '测试产品',
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        gross_weight_kg: 1.5,
        volume_weight_kg: 0.5,
        chargeable_weight_kg: 1.5,
        category: '电子产品',
      },
      warehouse: 'CA',
      query_time: new Date().toISOString(),
      carriers: [
        {
          carrier_id: 1,
          carrier_name: 'FedEx',
          carrier_code: 'FEDEX',
          service_type: 'Ground',
          zones: [
            {
              zone: 'zone1',
              zone_name: '本地',
              base_fee: 10.0,
              additional_fee: 2.0,
              fuel_fee: 1.5,
              residential_fee: 0,
              remote_fee: 0,
              total_fee: 13.5,
              transit_days: 2,
            },
          ],
          min_total: 13.5,
          max_total: 25.0,
          avg_total: 19.25,
        },
      ],
      errors: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    const result = await queryShippingFees('test-token', { sku: 'TEST-123' });

    expect(result.sku).toBe('TEST-123');
    expect(result.carriers).toHaveLength(1);
    expect(result.carriers[0].carrier_name).toBe('FedEx');

    // 验证缓存
    const stats = getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('应从缓存读取重复查询', async () => {
    const mockResult: ShippingFeeQueryResult = {
      sku: 'TEST-123',
      product: {
        sku: 'TEST-123',
        name: '测试产品',
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        gross_weight_kg: 1.5,
        volume_weight_kg: 0.5,
        chargeable_weight_kg: 1.5,
        category: '电子产品',
      },
      warehouse: 'CA',
      query_time: new Date().toISOString(),
      carriers: [],
      errors: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    // 第一次查询
    await queryShippingFees('test-token', { sku: 'TEST-123' });

    // 第二次查询（应从缓存读取）
    const result2 = await queryShippingFees('test-token', { sku: 'TEST-123' });

    // 验证 fetch 只被调用一次
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result2.sku).toBe('TEST-123');
  });

  it('应在请求超时时抛出友好错误', async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
    );

    await expect(
      queryShippingFees('test-token', { sku: 'TEST-123' })
    ).rejects.toThrow();
  });

  it('应在服务器返回错误时抛出错误信息', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: '产品不存在' }),
    });

    await expect(
      queryShippingFees('test-token', { sku: 'INVALID' })
    ).rejects.toThrow('产品不存在');
  });

  it('应支持跳过缓存', async () => {
    const mockResult: ShippingFeeQueryResult = {
      sku: 'TEST-123',
      product: {
        sku: 'TEST-123',
        name: '测试产品',
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        gross_weight_kg: 1.5,
        volume_weight_kg: 0.5,
        chargeable_weight_kg: 1.5,
        category: '电子产品',
      },
      warehouse: 'CA',
      query_time: new Date().toISOString(),
      carriers: [],
      errors: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    });

    // 第一次查询
    await queryShippingFees('test-token', { sku: 'TEST-123' });

    // 第二次查询跳过缓存
    await queryShippingFees('test-token', { sku: 'TEST-123' }, false);

    // fetch 应该被调用两次
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('缓存管理', () => {
  it('应能清除所有缓存', () => {
    clearAllCache();
    expect(getCacheStats().size).toBe(0);
  });
});
