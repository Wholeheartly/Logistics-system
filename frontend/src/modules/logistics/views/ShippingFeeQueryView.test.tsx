/**
 * 物流费用查询视图组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShippingFeeQueryView from './ShippingFeeQueryView';

// 模拟认证上下文
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

// 模拟物流上下文
vi.mock('../context/LogisticsContext', () => ({
  useLogistics: () => ({
    sharedSku: '',
    setSharedSku: vi.fn(),
    sharedWarehouse: 'CA',
  }),
}));

// 模拟 API 服务
vi.mock('../services/shippingFeeApi', () => ({
  queryShippingFees: vi.fn(),
  validateSku: vi.fn((sku: string) => {
    if (!sku || !sku.trim()) return { valid: false, message: 'SKU 不能为空' };
    if (sku.length < 3) return { valid: false, message: 'SKU 长度不能少于3个字符' };
    return { valid: true };
  }),
  clearAllCache: vi.fn(),
}));

import { queryShippingFees } from '../services/shippingFeeApi';

describe('ShippingFeeQueryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染查询界面', () => {
    render(<ShippingFeeQueryView />);

    expect(screen.getByPlaceholderText('输入产品 SKU')).toBeInTheDocument();
    expect(screen.getByText('查询费用')).toBeInTheDocument();
    expect(screen.getByText('发货仓')).toBeInTheDocument();
  });

  it('应在点击查询时验证 SKU', async () => {
    render(<ShippingFeeQueryView />);

    const queryBtn = screen.getByText('查询费用');
    fireEvent.click(queryBtn);

    await waitFor(() => {
      expect(screen.getByText('SKU 不能为空')).toBeInTheDocument();
    });
  });

  it('应在输入无效 SKU 时显示错误', async () => {
    render(<ShippingFeeQueryView />);

    const input = screen.getByPlaceholderText('输入产品 SKU');
    fireEvent.change(input, { target: { value: 'AB' } });

    const queryBtn = screen.getByText('查询费用');
    fireEvent.click(queryBtn);

    await waitFor(() => {
      expect(screen.getByText('SKU 长度不能少于3个字符')).toBeInTheDocument();
    });
  });

  it('应成功执行查询并显示结果', async () => {
    const mockResult = {
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

    (queryShippingFees as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResult);

    render(<ShippingFeeQueryView />);

    const input = screen.getByPlaceholderText('输入产品 SKU');
    fireEvent.change(input, { target: { value: 'TEST-123' } });

    const queryBtn = screen.getByText('查询费用');
    fireEvent.click(queryBtn);

    await waitFor(() => {
      expect(screen.getByText('产品SKU:')).toBeInTheDocument();
      expect(screen.getByText('TEST-123')).toBeInTheDocument();
      expect(screen.getByText('FedEx')).toBeInTheDocument();
    });
  });

  it('应在查询失败时显示错误信息', async () => {
    (queryShippingFees as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('产品不存在')
    );

    render(<ShippingFeeQueryView />);

    const input = screen.getByPlaceholderText('输入产品 SKU');
    fireEvent.change(input, { target: { value: 'INVALID' } });

    const queryBtn = screen.getByText('查询费用');
    fireEvent.click(queryBtn);

    await waitFor(() => {
      expect(screen.getByText('产品不存在')).toBeInTheDocument();
    });
  });

  it('应支持回车键触发查询', () => {
    render(<ShippingFeeQueryView />);

    const input = screen.getByPlaceholderText('输入产品 SKU');
    fireEvent.change(input, { target: { value: 'TEST-123' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(queryShippingFees).toHaveBeenCalled();
  });

  it('应显示筛选面板', async () => {
    const mockResult = {
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

    (queryShippingFees as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResult);

    render(<ShippingFeeQueryView />);

    const input = screen.getByPlaceholderText('输入产品 SKU');
    fireEvent.change(input, { target: { value: 'TEST-123' } });

    const queryBtn = screen.getByText('查询费用');
    fireEvent.click(queryBtn);

    await waitFor(() => {
      expect(screen.getByText('筛选')).toBeInTheDocument();
    });

    // 点击筛选按钮
    const filterBtn = screen.getByText('筛选');
    fireEvent.click(filterBtn);

    await waitFor(() => {
      expect(screen.getByText('重置筛选')).toBeInTheDocument();
    });
    expect(screen.getAllByText('物流商').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('区域').length).toBeGreaterThanOrEqual(1);
  });
});
