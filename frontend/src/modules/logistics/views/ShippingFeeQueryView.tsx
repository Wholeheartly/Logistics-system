import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLogistics } from '../context/LogisticsContext';
import { queryShippingFees, validateSku, clearAllCache } from '../services/shippingFeeApi';
import type {
  ShippingFeeQueryResult,
  ZoneFeeDetail,
  SortConfig,
  FilterConfig,
  SortField,
  SortOrder,
} from '../../../types/shipping';

// 区域名称映射
const zoneNameMap: Record<string, string> = {
  zone1: 'Zone 1 (本地)',
  zone2: 'Zone 2 (邻近)',
  zone3: 'Zone 3 (区域)',
  zone4: 'Zone 4 (跨区)',
  zone5: 'Zone 5 (远距离)',
  zone6: 'Zone 6 (偏远)',
  zone7: 'Zone 7 (超远)',
  zone8: 'Zone 8 (阿拉斯加/夏威夷)',
};

export default function ShippingFeeQueryView() {
  const { token } = useAuth();
  const { sharedSku, setSharedSku, sharedWarehouse } = useLogistics();

  // 查询输入状态
  const [sku, setSku] = useState(sharedSku || '');
  const [warehouse, setWarehouse] = useState(sharedWarehouse || 'CA');
  const [skuError, setSkuError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 查询结果状态
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShippingFeeQueryResult | null>(null);
  const [queryError, setQueryError] = useState('');
  const [queryTime, setQueryTime] = useState(0);

  // 排序和筛选状态
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'min_total', order: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    carrierName: '',
    zone: '',
    minFee: null,
    maxFee: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 清理共享SKU
  useEffect(() => {
    if (sharedSku) {
      setSku(sharedSku);
      setSharedSku('');
    }
  }, [sharedSku, setSharedSku]);

  // SKU输入验证
  const handleSkuChange = (value: string) => {
    setSku(value);
    if (skuError) {
      const validation = validateSku(value);
      if (validation.valid) {
        setSkuError('');
      }
    }
  };

  // 执行查询
  const handleQuery = useCallback(async () => {
    const validation = validateSku(sku);
    if (!validation.valid) {
      setSkuError(validation.message || 'SKU格式错误');
      return;
    }

    setSkuError('');
    setQueryError('');
    setLoading(true);
    setResult(null);
    setCurrentPage(1);

    const startTime = performance.now();

    try {
      const data = await queryShippingFees(token, {
        sku: sku.trim(),
        warehouse,
      });
      setResult(data);
      setQueryTime(Math.round(performance.now() - startTime));
    } catch (err) {
      const message = err instanceof Error ? err.message : '查询失败，请稍后重试';
      setQueryError(message);
    } finally {
      setLoading(false);
    }
  }, [sku, warehouse, token]);

  // 键盘回车触发查询
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  };

  // 获取所有可用区域
  const allZones = useMemo(() => {
    if (!result?.carriers) return [];
    const zoneSet = new Set<string>();
    result.carriers.forEach((carrier) => {
      carrier.zones.forEach((z) => zoneSet.add(z.zone));
    });
    return Array.from(zoneSet).sort();
  }, [result]);

  // 获取所有物流商名称
  const allCarriers = useMemo(() => {
    if (!result?.carriers) return [];
    return result.carriers.map((c) => c.carrier_name);
  }, [result]);

  // 过滤和排序后的数据
  const processedData = useMemo(() => {
    if (!result?.carriers) return [];

    const filtered = result.carriers.filter((carrier) => {
      if (filterConfig.carrierName && carrier.carrier_name !== filterConfig.carrierName) {
        return false;
      }
      if (filterConfig.zone) {
        const hasZone = carrier.zones.some((z) => z.zone === filterConfig.zone);
        if (!hasZone) return false;
      }
      if (filterConfig.minFee !== null && carrier.min_total < filterConfig.minFee) {
        return false;
      }
      if (filterConfig.maxFee !== null && carrier.max_total > filterConfig.maxFee) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const { field, order } = sortConfig;
      let comparison = 0;
      switch (field) {
        case 'carrier_name':
          comparison = a.carrier_name.localeCompare(b.carrier_name);
          break;
        case 'min_total':
          comparison = a.min_total - b.min_total;
          break;
        case 'avg_total':
          comparison = a.avg_total - b.avg_total;
          break;
        case 'max_total':
          comparison = a.max_total - b.max_total;
          break;
        case 'transit_days':
          comparison = (a.zones[0]?.transit_days || 0) - (b.zones[0]?.transit_days || 0);
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [result, filterConfig, sortConfig]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // 切换排序
  const toggleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };



  // 找出最低费用
  const minFeeValue = useMemo(() => {
    if (!processedData.length) return null;
    return Math.min(...processedData.map((c) => c.min_total));
  }, [processedData]);

  return (
    <div>
      {/* 查询面板 */}
      <div
        className="animate-fadeInUp"
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 28,
          flexWrap: 'wrap',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, var(--primary-50), var(--gray-50))',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--primary-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 180 }}>
          <label style={fieldLabelStyle}>
            SKU <span style={{ color: 'var(--error-500)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={sku}
              onChange={(e) => handleSkuChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入产品 SKU"
              disabled={loading}
              style={{
                ...inputStyle,
                borderColor: skuError
                  ? 'var(--error-500)'
                  : focusedField === 'sku'
                    ? 'var(--primary-500)'
                    : 'var(--border-light)',
                boxShadow: skuError
                  ? '0 0 0 3px var(--error-100)'
                  : focusedField === 'sku'
                    ? '0 0 0 3px var(--primary-100)'
                    : undefined,
              }}
              onFocus={() => setFocusedField('sku')}
              onBlur={() => setFocusedField(null)}
            />
            {skuError && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -20,
                  left: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--error-500)',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                {skuError}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: '0 1 160px', minWidth: 120 }}>
          <label style={fieldLabelStyle}>发货仓</label>
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            disabled={loading}
            style={inputStyle}
          >
            <option value="CA">CA 西部仓</option>
            <option value="NJ">NJ 东部仓</option>
            <option value="TX">TX 南部仓</option>
            <option value="SAV">SAV 东南部仓</option>
          </select>
        </div>

        <button
          onClick={handleQuery}
          disabled={loading}
          style={{
            ...primaryBtnStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '11px 28px',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
              查询中...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              查询费用
            </span>
          )}
        </button>

        {result && (
          <button
            onClick={() => { clearAllCache(); handleQuery(); }}
            disabled={loading}
            style={{
              ...secondaryBtnStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            title="清除缓存并重新查询"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            刷新
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {queryError && (
        <div
          className="animate-fadeInUp"
          style={{
            padding: '14px 18px',
            background: 'var(--error-50)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--error-600)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {queryError}
        </div>
      )}

      {/* 查询结果 */}
      {result && !result.error && (
        <div className="animate-fadeInUp">
          {/* 产品信息摘要 */}
          <div
            style={{
              padding: '14px 20px',
              background: 'var(--surface-secondary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              fontSize: 'var(--text-sm)',
              color: 'var(--gray-600)',
              border: '1px solid var(--border-light)',
            }}
          >
            <SummaryItem label="产品SKU" value={result.sku} />
            <SummaryItem label="产品名称" value={result.product.name} />
            <SummaryItem label="发货仓" value={result.warehouse} />
            <SummaryItem
              label="实重"
              value={`${result.product.gross_weight_kg.toFixed(2)} kg`}
            />
            <SummaryItem
              label="体积重"
              value={`${result.product.volume_weight_kg.toFixed(2)} kg`}
            />
            <SummaryItem
              label="计费重"
              value={`${result.product.chargeable_weight_kg.toFixed(2)} kg`}
            />
            <SummaryItem
              label="尺寸"
              value={`${result.product.length_cm}×${result.product.width_cm}×${result.product.height_cm} cm`}
            />
            {queryTime > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                查询耗时: {queryTime}ms
              </span>
            )}
          </div>

          {/* 筛选和排序工具栏 */}
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...toolBtnStyle,
                background: showFilters ? 'var(--primary-50)' : 'var(--surface-secondary)',
                borderColor: showFilters ? 'var(--primary-300)' : 'var(--border-light)',
                color: showFilters ? 'var(--primary-600)' : 'var(--gray-600)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              筛选
            </button>

            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              共 {processedData.length} 条结果
            </span>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div
              className="animate-fadeInUp"
              style={{
                padding: '16px 20px',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                marginBottom: 16,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ flex: '0 1 160px' }}>
                <label style={{ ...fieldLabelStyle, marginBottom: 4 }}>物流商</label>
                <select
                  value={filterConfig.carrierName}
                  onChange={(e) => {
                    setFilterConfig((prev) => ({ ...prev, carrierName: e.target.value }));
                    setCurrentPage(1);
                  }}
                  style={{ ...inputStyle, padding: '8px 10px' }}
                >
                  <option value="">全部物流商</option>
                  {allCarriers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '0 1 140px' }}>
                <label style={{ ...fieldLabelStyle, marginBottom: 4 }}>区域</label>
                <select
                  value={filterConfig.zone}
                  onChange={(e) => {
                    setFilterConfig((prev) => ({ ...prev, zone: e.target.value }));
                    setCurrentPage(1);
                  }}
                  style={{ ...inputStyle, padding: '8px 10px' }}
                >
                  <option value="">全部区域</option>
                  {allZones.map((z) => (
                    <option key={z} value={z}>
                      {zoneNameMap[z] || z}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '0 1 120px' }}>
                <label style={{ ...fieldLabelStyle, marginBottom: 4 }}>最低费用</label>
                <input
                  type="number"
                  min={0}
                  placeholder="$0"
                  value={filterConfig.minFee ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setFilterConfig((prev) => ({ ...prev, minFee: val }));
                    setCurrentPage(1);
                  }}
                  style={{ ...inputStyle, padding: '8px 10px' }}
                />
              </div>

              <div style={{ flex: '0 1 120px' }}>
                <label style={{ ...fieldLabelStyle, marginBottom: 4 }}>最高费用</label>
                <input
                  type="number"
                  min={0}
                  placeholder="不限"
                  value={filterConfig.maxFee ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setFilterConfig((prev) => ({ ...prev, maxFee: val }));
                    setCurrentPage(1);
                  }}
                  style={{ ...inputStyle, padding: '8px 10px' }}
                />
              </div>

              <button
                onClick={() => {
                  setFilterConfig({ carrierName: '', zone: '', minFee: null, maxFee: null });
                  setCurrentPage(1);
                }}
                style={{
                  ...secondaryBtnStyle,
                  padding: '8px 16px',
                  fontSize: 'var(--text-xs)',
                }}
              >
                重置筛选
              </button>
            </div>
          )}

          {/* 结果表格 */}
          {processedData.length > 0 ? (
            <>
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 160 }}>
                        <SortHeader label="物流商" field="carrier_name" onSort={toggleSort} sortConfig={sortConfig} />
                      </th>
                      <th style={thStyle}>
                        <SortHeader label="服务类型" field="carrier_name" onSort={() => {}} sortConfig={sortConfig} />
                      </th>
                      {allZones.map((zone) => (
                        <th key={zone} style={{ ...thStyle, textAlign: 'center' }}>
                          {zoneNameMap[zone] || zone}
                        </th>
                      ))}
                      <th style={thStyle}>
                        <SortHeader label="最低费用" field="min_total" onSort={toggleSort} sortConfig={sortConfig} />
                      </th>
                      <th style={thStyle}>
                        <SortHeader label="平均费用" field="avg_total" onSort={toggleSort} sortConfig={sortConfig} />
                      </th>
                      <th style={thStyle}>
                        <SortHeader label="最高费用" field="max_total" onSort={toggleSort} sortConfig={sortConfig} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((carrier, index) => {
                      const isLowest = minFeeValue !== null && carrier.min_total === minFeeValue;
                      return (
                        <tr
                          key={carrier.carrier_id}
                          className="animate-fadeInUp"
                          style={{
                            background: isLowest ? 'var(--success-50)' : undefined,
                            transition: 'background var(--transition-fast)',
                            animationDelay: `${index * 40}ms`,
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 'var(--font-semibold)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {carrier.carrier_name}
                              {isLowest && (
                                <span
                                  style={{
                                    fontSize: 'var(--text-xs)',
                                    padding: '2px 8px',
                                    background: 'var(--success-500)',
                                    color: '#fff',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 'var(--font-bold)',
                                  }}
                                >
                                  最低
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--font-semibold)',
                                background: 'var(--primary-50)',
                                color: 'var(--primary-600)',
                              }}
                            >
                              {carrier.service_type}
                            </span>
                          </td>
                          {allZones.map((zone) => {
                            const zoneData = carrier.zones.find((z) => z.zone === zone);
                            return (
                              <td key={zone} style={{ ...tdStyle, textAlign: 'center' }}>
                                {zoneData ? (
                                  <ZoneFeeCell data={zoneData} isLowest={isLowest} />
                                ) : (
                                  <span style={{ color: 'var(--gray-300)' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ ...tdStyle, fontWeight: 'var(--font-bold)', color: 'var(--primary-600)' }}>
                            ${carrier.min_total.toFixed(2)}
                          </td>
                          <td style={tdStyle}>${carrier.avg_total.toFixed(2)}</td>
                          <td style={tdStyle}>${carrier.max_total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <PageButton disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                    上一页
                  </PageButton>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
                    第 {currentPage} 页 / 共 {totalPages} 页
                  </span>
                  <PageButton disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                    下一页
                  </PageButton>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--gray-400)',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 4 }}>
                未找到匹配结果
              </div>
              <div style={{ fontSize: 'var(--text-sm)' }}>请调整筛选条件后重试</div>
            </div>
          )}
        </div>
      )}

      {/* 查询异常 */}
      {result?.errors && result.errors.length > 0 && (
        <div
          className="animate-fadeInUp"
          style={{
            marginTop: 20,
            padding: '18px 20px',
            background: 'var(--error-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          <div
            style={{
              fontWeight: 'var(--font-semibold)',
              marginBottom: 10,
              color: 'var(--error-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            部分物流商查询异常
          </div>
          {result.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', padding: '4px 0' }}>
              <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--gray-700)' }}>{e.carrier_name}:</span>{' '}
              {e.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 区域费用单元格组件
function ZoneFeeCell({ data, isLowest }: { data: ZoneFeeDetail; isLowest: boolean }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
    >
      <span
        style={{
          fontWeight: 'var(--font-semibold)',
          color: isLowest ? 'var(--success-600)' : 'var(--gray-700)',
          cursor: 'help',
        }}
      >
        ${data.total_fee.toFixed(2)}
      </span>
      {showDetail && (
        <div
          className="animate-fadeInScale"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            padding: 12,
            minWidth: 200,
            marginBottom: 8,
            fontSize: 'var(--text-xs)',
          }}
        >
          <div style={{ fontWeight: 'var(--font-bold)', marginBottom: 8, color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>
            {zoneNameMap[data.zone] || data.zone} 费用明细
          </div>
          <FeeDetailRow label="基础费用" value={data.base_fee} />
          <FeeDetailRow label="附加费用" value={data.additional_fee} />
          <FeeDetailRow label="燃油费" value={data.fuel_fee} />
          <FeeDetailRow label="住宅费" value={data.residential_fee} />
          <FeeDetailRow label="偏远费" value={data.remote_fee} />
          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 6, paddingTop: 6 }}>
            <FeeDetailRow label="总费用" value={data.total_fee} isTotal />
          </div>
          <div style={{ marginTop: 6, color: 'var(--gray-500)' }}>
            预计时效: {data.transit_days} 天
          </div>
        </div>
      )}
    </div>
  );
}

function FeeDetailRow({ label, value, isTotal = false }: { label: string; value: number; isTotal?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: isTotal ? 'var(--font-bold)' : 'var(--font-medium)', color: isTotal ? 'var(--primary-600)' : 'var(--gray-700)' }}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

// 排序表头组件
function SortHeader({
  label,
  field,
  onSort,
  sortConfig,
}: {
  label: string;
  field: SortField;
  onSort: (field: SortField) => void;
  sortConfig: SortConfig;
}) {
  const isActive = sortConfig.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
        padding: 0,
        fontFamily: 'inherit',
        textTransform: 'inherit',
        letterSpacing: 'inherit',
      }}
    >
      {label}
      <SortIcon isActive={isActive} order={sortConfig.order} />
    </button>
  );
}

// 排序图标组件
function SortIcon({ isActive, order }: { isActive: boolean; order: SortOrder }) {
  if (!isActive) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }
  return order === 'asc' ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// 摘要项组件
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--gray-400)', fontWeight: 'var(--font-medium)' }}>{label}:</span>
      <span style={{ color: 'var(--gray-800)', fontWeight: 'var(--font-semibold)' }}>{value}</span>
    </div>
  );
}

// 分页按钮
function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '7px 16px',
        border: '1px solid var(--border-light)',
        background: 'var(--surface-primary)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        color: disabled ? 'var(--gray-400)' : 'var(--gray-700)',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
      }}
    >
      {children}
    </button>
  );
}

// 样式定义
const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--gray-600)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '2px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  width: '100%',
  outline: 'none',
  transition: 'all var(--transition-base)',
  background: 'var(--surface-primary)',
  color: 'var(--gray-800)',
  fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'var(--surface-secondary)',
  color: 'var(--gray-700)',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const toolBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: 'var(--text-sm)',
};

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '2px solid var(--border-light)',
  textAlign: 'left' as const,
  background: 'var(--surface-secondary)',
  fontWeight: 'var(--font-semibold)',
  whiteSpace: 'nowrap' as const,
  color: 'var(--gray-600)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--border-light)',
  color: 'var(--gray-700)',
};
