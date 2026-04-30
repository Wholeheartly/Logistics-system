import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLogistics } from '../context/LogisticsContext';
import type { CarrierResult, CompareResult, ZoneCompareResult } from '../../../types';

const API = 'http://localhost:8000';

const WAREHOUSES = [
  { code: 'CA', name: 'CA 西部仓' },
  { code: 'NJ', name: 'NJ 东部仓' },
  { code: 'TX', name: 'TX 南部仓' },
  { code: 'SAV', name: 'SAV 东南部仓' },
];

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

export default function ShippingCompareView() {
  const { token } = useAuth();
  const { sharedSku, sharedWarehouse, setSharedSku } = useLogistics();
  const [sku, setSku] = useState(sharedSku);
  const [zipCode, setZipCode] = useState('');
  const [warehouse, setWarehouse] = useState(sharedWarehouse);
  const [isResidential, setIsResidential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [zoneCompareResult, setZoneCompareResult] = useState<ZoneCompareResult | null>(null);
  const [requestError, setRequestError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'single' | 'zone'>('single');
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>(['CA', 'NJ', 'TX', 'SAV']);

  useEffect(() => {
    if (sharedSku) {
      setSku(sharedSku);
      setSharedSku('');
    }
  }, [sharedSku, setSharedSku]);

  const handleSubmit = async () => {
    if (!sku || !zipCode) return;
    if (!token) {
      setRequestError('未登录，请先登录系统');
      return;
    }

    setLoading(true);
    setRequestError('');
    setResult(null);
    setZoneCompareResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      if (compareMode === 'single') {
        const res = await fetch(`${API}/api/shipping/compare`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sku: sku.trim(),
            zip_code: zipCode.trim(),
            warehouse,
            is_residential: isResidential,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRequestError(extractErrorMessage(data));
          return;
        }
        setResult(data as CompareResult);
      } else {
        if (selectedWarehouses.length === 0) {
          setRequestError('请至少选择一个发货仓');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/api/shipping/zone-compare`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sku: sku.trim(),
            zip_code: zipCode.trim(),
            warehouses: selectedWarehouses,
            is_residential: isResidential,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRequestError(extractErrorMessage(data));
          return;
        }
        setZoneCompareResult(data as ZoneCompareResult);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '网络请求失败，请检查网络连接或稍后重试';
      setRequestError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleWarehouse = (code: string) => {
    setSelectedWarehouses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const switchMode = (mode: 'single' | 'zone') => {
    setCompareMode(mode);
    setResult(null);
    setZoneCompareResult(null);
    setRequestError('');
  };

  return (
    <div>
      {/* Search Panel */}
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
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <label style={fieldLabelStyle}>SKU</label>
          <div style={{ position: 'relative' }}>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="输入 SKU"
              disabled={loading}
              style={{
                ...inputStyle,
                borderColor: focusedField === 'sku' ? 'var(--primary-500)' : 'var(--border-light)',
                boxShadow: focusedField === 'sku' ? '0 0 0 3px var(--primary-100)' : undefined,
              }}
              onFocus={() => setFocusedField('sku')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>
        <div style={{ flex: '0 1 120px', minWidth: 100 }}>
          <label style={fieldLabelStyle}>邮编</label>
          <input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="5位邮编"
            maxLength={5}
            disabled={loading}
            style={{
              ...inputStyle,
              borderColor: focusedField === 'zip' ? 'var(--primary-500)' : 'var(--border-light)',
              boxShadow: focusedField === 'zip' ? '0 0 0 3px var(--primary-100)' : undefined,
            }}
            onFocus={() => setFocusedField('zip')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        {/* 比价模式切换 */}
        <div style={{ flex: '0 1 200px', minWidth: 160 }}>
          <label style={fieldLabelStyle}>比价模式</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => switchMode('single')}
              disabled={loading}
              style={{
                ...modeBtnStyle,
                background: compareMode === 'single' ? 'var(--primary-500)' : 'var(--surface-secondary)',
                color: compareMode === 'single' ? '#fff' : 'var(--gray-600)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              单仓比价
            </button>
            <button
              onClick={() => switchMode('zone')}
              disabled={loading}
              style={{
                ...modeBtnStyle,
                background: compareMode === 'zone' ? 'var(--primary-500)' : 'var(--surface-secondary)',
                color: compareMode === 'zone' ? '#fff' : 'var(--gray-600)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              区域比价
            </button>
          </div>
        </div>

        {compareMode === 'single' ? (
          <div style={{ flex: '0 1 160px', minWidth: 120 }}>
            <label style={fieldLabelStyle}>发货仓</label>
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              disabled={loading}
              style={inputStyle}
            >
              {WAREHOUSES.map((wh) => (
                <option key={wh.code} value={wh.code}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ flex: '1 1 300px', minWidth: 200 }}>
            <label style={fieldLabelStyle}>选择发货仓（多选）</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {WAREHOUSES.map((wh) => (
                <label
                  key={wh.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedWarehouses.includes(wh.code) ? 'var(--primary-500)' : 'var(--border-light)'}`,
                    background: selectedWarehouses.includes(wh.code) ? 'var(--primary-50)' : 'var(--surface-primary)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: selectedWarehouses.includes(wh.code) ? 'var(--primary-700)' : 'var(--gray-600)',
                    fontWeight: selectedWarehouses.includes(wh.code) ? 'var(--font-semibold)' : 'var(--font-medium)',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedWarehouses.includes(wh.code)}
                    onChange={() => toggleWarehouse(wh.code)}
                    disabled={loading}
                    style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                  />
                  {wh.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            color: 'var(--gray-600)',
            fontWeight: 'var(--font-medium)',
            paddingBottom: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `2px solid ${isResidential ? 'var(--primary-500)' : 'var(--gray-300)'}`,
              background: isResidential ? 'var(--primary-500)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => setIsResidential(!isResidential)}
          >
            {isResidential && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          住宅地址
        </label>
        <button
          onClick={handleSubmit}
          disabled={loading || (compareMode === 'zone' && selectedWarehouses.length === 0)}
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
              计算中...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              比价
            </span>
          )}
        </button>
      </div>

      {/* Request Error */}
      {requestError && (
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
          {requestError}
        </div>
      )}

      {/* Backend Error */}
      {(result?.error || zoneCompareResult?.error) && (
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
          {result?.error || zoneCompareResult?.error}
        </div>
      )}

      {/* Single Warehouse Results */}
      {compareMode === 'single' && result?.results && result.results.length > 0 && (
        <div className="animate-fadeInUp">
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
            <SummaryItem label="产品" value={result.sku} />
            <SummaryItem label="仓库" value={result.warehouse} />
            <SummaryItem label="邮编" value={result.zip_code} />
            <SummaryItem label="计费重" value={`${result.results[0]?.billed_weight_lb?.toFixed(2)} lbs`} />
          </div>

          <ResultsTable results={result.results} showWarehouse={false} />
        </div>
      )}

      {/* Zone Compare Results */}
      {compareMode === 'zone' && zoneCompareResult?.warehouses && zoneCompareResult.warehouses.length > 0 && (
        <div className="animate-fadeInUp">
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
            <SummaryItem label="产品" value={zoneCompareResult.sku} />
            <SummaryItem label="邮编" value={zoneCompareResult.zip_code} />
            <SummaryItem label="比价仓库数" value={`${zoneCompareResult.warehouses.length} 个`} />
          </div>

          {/* 跨仓库综合排名 */}
          {zoneCompareResult.all_carriers && zoneCompareResult.all_carriers.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-800)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>🏆</span>
                全仓库综合排名（按总价升序）
              </h3>
              <ResultsTable results={zoneCompareResult.all_carriers} showWarehouse={true} />
            </div>
          )}

          {/* 各仓库详情 */}
          {zoneCompareResult.warehouses.map((wh) => (
            <div key={wh.warehouse} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--gray-800)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>📦</span>
                {wh.warehouse_name} (Zone {wh.zone})
              </h3>
              <ResultsTable results={wh.results} showWarehouse={false} />
            </div>
          ))}
        </div>
      )}

      {/* Empty result hint */}
      {compareMode === 'zone' && zoneCompareResult && !zoneCompareResult.error && zoneCompareResult.warehouses && zoneCompareResult.warehouses.length === 0 && (
        <div
          className="animate-fadeInUp"
          style={{
            textAlign: 'center',
            padding: '40px 20px',
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
            未找到有效比价结果
          </div>
          <div style={{ fontSize: 'var(--text-sm)' }}>请检查 SKU 和邮编是否正确，或尝试其他仓库组合</div>
        </div>
      )}

      {/* Errors */}
      {compareMode === 'single' && result?.errors && result.errors.length > 0 && (
        <ErrorsPanel errors={result.errors} />
      )}
      {compareMode === 'zone' && zoneCompareResult?.warehouses && (
        <>
          {zoneCompareResult.warehouses.map((wh) =>
            wh.errors.length > 0 ? (
              <div key={wh.warehouse} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 8, color: 'var(--gray-700)' }}>
                  {wh.warehouse_name} 计算异常
                </div>
                <ErrorsPanel errors={wh.errors} />
              </div>
            ) : null
          )}
        </>
      )}
    </div>
  );
}

function ResultsTable({ results, showWarehouse }: { results: CarrierResult[]; showWarehouse: boolean }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {showWarehouse && <th style={{ ...thStyle, width: 100 }}>发货仓</th>}
            <th style={{ ...thStyle, width: 140 }}>物流商</th>
            <th style={thStyle}>基础运费</th>
            <th style={thStyle}>最高附加费</th>
            <th style={thStyle}>住宅费</th>
            <th style={thStyle}>偏远费</th>
            <th style={thStyle}>燃油费</th>
            <th style={{ ...thStyle, color: 'var(--success-600)' }}>不含燃油总价</th>
            <th style={{ ...thStyle, color: 'var(--primary-600)' }}>总价</th>
            <th style={thStyle}>时效</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r: CarrierResult, i: number) => (
            <tr
              key={`${r.carrier_name}-${i}`}
              className="animate-fadeInUp"
              style={{
                background: r.is_cheapest ? 'var(--success-50)' : undefined,
                transition: 'background var(--transition-fast)',
                animationDelay: `${i * 60}ms`,
              }}
            >
              {showWarehouse && (
                <td style={{ ...tdStyle, fontWeight: 'var(--font-medium)', color: 'var(--gray-600)' }}>
                  {r.warehouse_name}
                </td>
              )}
              <td style={{ ...tdStyle, fontWeight: 'var(--font-semibold)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.carrier_name}
                  {r.is_cheapest && (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        padding: '3px 8px',
                        background: 'var(--success-500)',
                        color: '#fff',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 'var(--font-bold)',
                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      最低
                    </span>
                  )}
                </div>
              </td>
              <td style={tdStyle}>${r.base_freight?.toFixed(2)}</td>
              <td style={tdStyle}>
                {r.highest_surcharge_type && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', display: 'block', marginBottom: 2 }}>
                    {r.highest_surcharge_type}
                  </span>
                )}
                ${r.highest_surcharge?.toFixed(2)}
              </td>
              <td style={tdStyle}>${r.residential_fee?.toFixed(2)}</td>
              <td style={tdStyle}>${r.remote_fee?.toFixed(2)}</td>
              <td style={tdStyle}>${r.fuel_fee?.toFixed(2)}</td>
              <td style={{ ...tdStyle, color: 'var(--success-600)', fontWeight: 'var(--font-semibold)' }}>
                ${r.total_without_fuel?.toFixed(2) ?? r.total.toFixed(2)}
              </td>
              <td style={{ ...tdStyle, color: 'var(--primary-600)', fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)' }}>
                ${r.total.toFixed(2)}
              </td>
              <td style={tdStyle}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                }}>
                  {r.transit_time}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorsPanel({ errors }: { errors: { carrier_name: string; reason: string }[] }) {
  return (
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
      <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 10, color: 'var(--error-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        计算异常
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', padding: '4px 0' }}>
          <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--gray-700)' }}>{e.carrier_name}:</span> {e.reason}
        </div>
      ))}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--gray-400)', fontWeight: 'var(--font-medium)' }}>{label}:</span>
      <span style={{ color: 'var(--gray-800)', fontWeight: 'var(--font-semibold)' }}>{value}</span>
    </div>
  );
}

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

const modeBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
  flex: 1,
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
