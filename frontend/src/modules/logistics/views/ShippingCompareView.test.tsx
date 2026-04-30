/**
 * 物流比价视图组件测试（含区域比价功能）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShippingCompareView from './ShippingCompareView';

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

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;

describe('ShippingCompareView - 区域比价', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染区域比价界面', () => {
    render(<ShippingCompareView />);

    expect(screen.getByPlaceholderText('输入 SKU')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('5位邮编')).toBeInTheDocument();
    expect(screen.getByText('区域比价')).toBeInTheDocument();
  });

  it('应能切换到区域比价模式', () => {
    render(<ShippingCompareView />);

    const zoneBtn = screen.getByText('区域比价');
    fireEvent.click(zoneBtn);

    expect(screen.getByText('选择发货仓（多选）')).toBeInTheDocument();
    expect(screen.getByText('CA 西部仓')).toBeInTheDocument();
    expect(screen.getByText('NJ 东部仓')).toBeInTheDocument();
  });

  it('应在未选择仓库时禁用比价按钮', () => {
    render(<ShippingCompareView />);

    // 切换到区域比价
    fireEvent.click(screen.getByText('区域比价'));

    // 取消所有仓库选择 - 直接点击 label 上的 checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => {
      if ((cb as HTMLInputElement).checked) {
        fireEvent.click(cb);
      }
    });

    // 输入 SKU 和邮编
    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'TEST-123' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });

    // 比价按钮应该被禁用
    const compareBtn = screen.getByText('比价').closest('button');
    expect(compareBtn).toBeDisabled();
  });

  it('应携带认证头请求 zone-compare 接口', async () => {
    const mockResult = {
      sku: 'TEST-123',
      zip_code: '90210',
      is_residential: false,
      warehouses: [
        {
          warehouse: 'CA',
          warehouse_name: 'CA 西部仓',
          zone: 'zone2',
          results: [
            {
              carrier_name: 'FedEx',
              base_freight: 10.0,
              highest_surcharge: 2.0,
              highest_surcharge_type: 'DAS',
              residential_fee: 0,
              remote_fee: 0,
              fuel_fee: 1.5,
              total_without_fuel: 12.0,
              total: 13.5,
              transit_time: '2-3天',
              is_cheapest: true,
            },
          ],
          errors: [],
        },
      ],
      all_carriers: [
        {
          warehouse: 'CA',
          warehouse_name: 'CA 西部仓',
          zone: 'zone2',
          carrier_name: 'FedEx',
          base_freight: 10.0,
          highest_surcharge: 2.0,
          highest_surcharge_type: 'DAS',
          residential_fee: 0,
          remote_fee: 0,
          fuel_fee: 1.5,
          total_without_fuel: 12.0,
          total: 13.5,
          transit_time: '2-3天',
          is_cheapest: true,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    render(<ShippingCompareView />);

    // 切换到区域比价
    fireEvent.click(screen.getByText('区域比价'));

    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'TEST-123' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });

    fireEvent.click(screen.getByText('比价'));

    await waitFor(() => {
      expect(screen.getAllByText('FedEx').length).toBeGreaterThanOrEqual(1);
    });

    // 验证请求携带了认证头
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shipping/zone-compare'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('应在接口返回 401 时显示认证错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: '认证失败' }),
    });

    render(<ShippingCompareView />);

    // 切换到区域比价
    fireEvent.click(screen.getByText('区域比价'));

    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'TEST-123' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });

    fireEvent.click(screen.getByText('比价'));

    await waitFor(() => {
      expect(screen.getByText('认证失败')).toBeInTheDocument();
    });
  });

  it('应在网络异常时显示友好错误', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ShippingCompareView />);

    // 切换到区域比价
    fireEvent.click(screen.getByText('区域比价'));

    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'TEST-123' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });

    fireEvent.click(screen.getByText('比价'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('应正确显示最低费用高亮', async () => {
    const mockResult = {
      sku: 'TEST-123',
      zip_code: '90210',
      is_residential: false,
      warehouses: [
        {
          warehouse: 'CA',
          warehouse_name: 'CA 西部仓',
          zone: 'zone2',
          results: [
            {
              carrier_name: 'FedEx',
              base_freight: 10.0,
              highest_surcharge: 2.0,
              highest_surcharge_type: 'DAS',
              residential_fee: 0,
              remote_fee: 0,
              fuel_fee: 1.5,
              total_without_fuel: 12.0,
              total: 13.5,
              transit_time: '2-3天',
              is_cheapest: true,
            },
            {
              carrier_name: 'UPS',
              base_freight: 12.0,
              highest_surcharge: 1.5,
              highest_surcharge_type: 'DAS',
              residential_fee: 0,
              remote_fee: 0,
              fuel_fee: 1.8,
              total_without_fuel: 13.5,
              total: 15.3,
              transit_time: '2-3天',
              is_cheapest: false,
            },
          ],
          errors: [],
        },
      ],
      all_carriers: [
        {
          warehouse: 'CA',
          warehouse_name: 'CA 西部仓',
          zone: 'zone2',
          carrier_name: 'FedEx',
          base_freight: 10.0,
          highest_surcharge: 2.0,
          highest_surcharge_type: 'DAS',
          residential_fee: 0,
          remote_fee: 0,
          fuel_fee: 1.5,
          total_without_fuel: 12.0,
          total: 13.5,
          transit_time: '2-3天',
          is_cheapest: true,
        },
        {
          warehouse: 'CA',
          warehouse_name: 'CA 西部仓',
          zone: 'zone2',
          carrier_name: 'UPS',
          base_freight: 12.0,
          highest_surcharge: 1.5,
          highest_surcharge_type: 'DAS',
          residential_fee: 0,
          remote_fee: 0,
          fuel_fee: 1.8,
          total_without_fuel: 13.5,
          total: 15.3,
          transit_time: '2-3天',
          is_cheapest: false,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    render(<ShippingCompareView />);

    fireEvent.click(screen.getByText('区域比价'));
    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'TEST-123' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });
    fireEvent.click(screen.getByText('比价'));

    await waitFor(() => {
      // 只有 FedEx 应该显示"最低"标签
      const lowestLabels = screen.getAllByText('最低');
      expect(lowestLabels.length).toBe(2); // 全仓库排名 + 仓库详情各一次
    });
  });

  it('切换模式时应清空之前的结果和错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'SKU不存在' }),
    });

    render(<ShippingCompareView />);

    // 区域比价模式下查询失败
    fireEvent.click(screen.getByText('区域比价'));
    fireEvent.change(screen.getByPlaceholderText('输入 SKU'), { target: { value: 'BAD' } });
    fireEvent.change(screen.getByPlaceholderText('5位邮编'), { target: { value: '90210' } });
    fireEvent.click(screen.getByText('比价'));

    await waitFor(() => {
      expect(screen.getByText('SKU不存在')).toBeInTheDocument();
    });

    // 切换到单仓模式，错误应该被清空
    fireEvent.click(screen.getByText('单仓比价'));

    expect(screen.queryByText('SKU不存在')).not.toBeInTheDocument();
  });
});
