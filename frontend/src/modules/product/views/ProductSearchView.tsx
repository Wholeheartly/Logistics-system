import { useState } from 'react';
import { useProduct } from '../context/ProductContext';
import { useAuth } from '../../../context/AuthContext';
import type { Product } from '../../../types';

const API = 'http://localhost:8000';

type UnitVersion = 'original' | 'converted';

export default function ProductSearchView() {
  const { searchHistory, addToHistory } = useProduct();
  const { token } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitVersion, setUnitVersion] = useState<UnitVersion>('original');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSelectedProduct(null);
    try {
      const savedToken = token || localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!savedToken) {
        setError('未登录或登录已过期，请重新登录');
        setProducts([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API}/api/products/search?token=${savedToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('搜索请求失败:', data);
        setError(data.detail || '搜索失败，请稍后重试');
        setProducts([]);
        return;
      }
      setProducts(data.products || []);
      if (keyword.trim()) addToHistory(keyword.trim());
    } catch (err) {
      console.error('搜索请求异常:', err);
      setError('网络请求失败，请检查网络连接或后端服务是否正常运行');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const hasConverted = products.some((p) => p.unit_converted);

  return (
    <div>
      {/* Search Bar */}
      <div
        className="animate-fadeInUp"
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 250 }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 16,
                color: focused ? 'var(--primary-500)' : 'var(--gray-400)',
                transition: 'color var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                zIndex: 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入 SKU 关键词搜索，留空查看全部"
              style={{
                padding: '13px 16px 13px 48px',
                border: `2px solid ${focused ? 'var(--primary-500)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-base)',
                width: '100%',
                outline: 'none',
                transition: 'all var(--transition-base)',
                background: 'var(--surface-primary)',
                color: 'var(--gray-800)',
                fontFamily: 'inherit',
                boxShadow: focused ? '0 0 0 4px var(--primary-100), var(--shadow-md)' : 'var(--shadow-sm)',
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                style={{
                  position: 'absolute',
                  right: 16,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div
              className="animate-fadeInUp"
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                历史搜索
              </span>
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setKeyword(h); handleSearch(); }}
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '5px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--surface-secondary)',
                    cursor: 'pointer',
                    color: 'var(--gray-600)',
                    fontWeight: 'var(--font-medium)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-50)';
                    e.currentTarget.style.borderColor = 'var(--primary-200)';
                    e.currentTarget.style.color = 'var(--primary-600)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.color = 'var(--gray-600)';
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            ...primaryBtnStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '13px 28px',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
              搜索中...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              搜索
            </span>
          )}
        </button>
      </div>

      {/* Unit Version Toggle */}
      {products.length > 0 && hasConverted && (
        <div
          className="animate-fadeInUp"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            padding: '10px 16px',
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', fontWeight: 'var(--font-medium)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: 'text-bottom', marginRight: 6 }}>
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            单位显示:
          </span>
          <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setUnitVersion('original')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: unitVersion === 'original' ? 'var(--surface-primary)' : 'transparent',
                color: unitVersion === 'original' ? 'var(--primary-600)' : 'var(--gray-500)',
                fontWeight: unitVersion === 'original' ? 'var(--font-semibold)' : 'var(--font-medium)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                boxShadow: unitVersion === 'original' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              原始单位 (cm / kg)
            </button>
            <button
              onClick={() => setUnitVersion('converted')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: unitVersion === 'converted' ? 'var(--surface-primary)' : 'transparent',
                color: unitVersion === 'converted' ? 'var(--primary-600)' : 'var(--gray-500)',
                fontWeight: unitVersion === 'converted' ? 'var(--font-semibold)' : 'var(--font-medium)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                boxShadow: unitVersion === 'converted' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              转换单位 (inch / lb)
            </button>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginLeft: 'auto' }}>
            1cm = 0.393701inch · 1kg = 2.20462lb
          </span>
        </div>
      )}

      {/* Results */}
      {products.length > 0 && (
        <div className="animate-fadeInUp">
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-bold)',
              }}
            >
              {products.length}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
              条产品记录
            </span>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>名称</th>
                  {unitVersion === 'original' ? (
                    <>
                      <th style={{ ...thStyle, textAlign: 'center' }}>长 (cm)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>宽 (cm)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>高 (cm)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>毛重 (kg)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ ...thStyle, textAlign: 'center' }}>长 (inch)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>宽 (inch)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>高 (inch)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>毛重 (lb)</th>
                    </>
                  )}
                  <th style={{ ...thStyle, textAlign: 'center' }}>转换状态</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.sku}
                    className="animate-fadeInUp"
                    style={{
                      transition: 'background var(--transition-fast)',
                      animationDelay: `${i * 40}ms`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 'var(--font-bold)', color: 'var(--primary-600)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          </svg>
                        </div>
                        {p.sku}
                      </div>
                    </td>
                    <td style={tdStyle}>{p.name}</td>
                    {unitVersion === 'original' ? (
                      <>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.length_cm}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.width_cm}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.height_cm}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-bold)', color: 'var(--gray-800)' }}>{p.gross_weight_kg}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.length_inch ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.width_inch ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-semibold)' }}>{p.height_inch ?? '-'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'var(--font-bold)', color: 'var(--gray-800)' }}>{p.gross_weight_lb ?? '-'}</td>
                      </>
                    )}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {p.unit_converted ? (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--success-50)',
                          color: 'var(--success-600)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                        }}>
                          已转换
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--warning-50)',
                          color: 'var(--warning-600)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                        }}>
                          未转换
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedProduct(selectedProduct?.sku === p.sku ? null : p)}
                        style={{
                          padding: '5px 12px',
                          border: '1px solid var(--primary-300)',
                          borderRadius: 'var(--radius-md)',
                          background: selectedProduct?.sku === p.sku ? 'var(--primary-500)' : 'var(--surface-primary)',
                          color: selectedProduct?.sku === p.sku ? '#fff' : 'var(--primary-600)',
                          fontSize: 'var(--text-xs)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {selectedProduct?.sku === p.sku ? '收起' : '详情'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Product Detail Panel */}
          {selectedProduct && (
            <div
              className="animate-fadeInUp"
              style={{
                marginTop: 20,
                padding: '24px',
                background: 'var(--surface-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)', color: 'var(--gray-800)' }}>
                      {selectedProduct.sku}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
                      {selectedProduct.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gray-400)',
                    padding: 4,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {/* Original Units */}
                <div style={{
                  padding: 16,
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    原始单位 (cm / kg)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <DetailRow label="长度" value={`${selectedProduct.length_cm} cm`} />
                    <DetailRow label="宽度" value={`${selectedProduct.width_cm} cm`} />
                    <DetailRow label="高度" value={`${selectedProduct.height_cm} cm`} />
                    <DetailRow label="毛重" value={`${selectedProduct.gross_weight_kg} kg`} />
                  </div>
                </div>

                {/* Converted Units */}
                <div style={{
                  padding: 16,
                  background: selectedProduct.unit_converted ? 'var(--success-50)' : 'var(--warning-50)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedProduct.unit_converted ? 'var(--success-200)' : 'var(--warning-200)'}`,
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    转换单位 (inch / lb)
                  </div>
                  {selectedProduct.unit_converted ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <DetailRow label="长度" value={`${selectedProduct.length_inch} inch`} />
                      <DetailRow label="宽度" value={`${selectedProduct.width_inch} inch`} />
                      <DetailRow label="高度" value={`${selectedProduct.height_inch} inch`} />
                      <DetailRow label="毛重" value={`${selectedProduct.gross_weight_lb} lb`} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--warning-600)', textAlign: 'center', padding: '20px 0' }}>
                      尚未进行单位转换
                    </div>
                  )}
                </div>

                {/* Other Info */}
                <div style={{
                  padding: 16,
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    其他信息
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <DetailRow label="型号" value={selectedProduct.model || '-'} />
                    <DetailRow label="规格" value={selectedProduct.specification || '-'} />
                    <DetailRow label="价格" value={selectedProduct.price != null ? `¥${selectedProduct.price}` : '-'} />
                    <DetailRow label="库存" value={selectedProduct.stock_quantity != null ? `${selectedProduct.stock_quantity}` : '-'} />
                    <DetailRow label="分类" value={selectedProduct.category || '-'} />
                    <DetailRow label="品牌" value={selectedProduct.brand || '-'} />
                    <DetailRow label="供应商" value={selectedProduct.supplier || '-'} />
                  </div>
                </div>
              </div>

              {/* Conversion Formula */}
              {selectedProduct.unit_converted && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: 'var(--primary-50)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--primary-700)',
                }}>
                  <span style={{ fontWeight: 'var(--font-semibold)' }}>转换公式：</span>
                  长度: {selectedProduct.length_cm}cm × 0.393701 = {selectedProduct.length_inch}inch
                  &nbsp;|&nbsp;
                  重量: {selectedProduct.gross_weight_kg}kg × 2.20462 = {selectedProduct.gross_weight_lb}lb
                  &nbsp;|&nbsp;
                  转换时间: {selectedProduct.converted_at ? new Date(selectedProduct.converted_at).toLocaleString('zh-CN') : '-'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="animate-fadeInUp"
          style={{
            padding: '12px 16px',
            background: 'var(--danger-50, #fef2f2)',
            border: '1px solid var(--danger-200, #fecaca)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--danger-600, #dc2626)',
            fontSize: 'var(--text-sm)',
            marginBottom: 16,
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
          {error}
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && !loading && !error && (
        <div
          className="animate-fadeInUp"
          style={{
            textAlign: 'center',
            padding: '80px 40px',
            color: 'var(--gray-400)',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gray-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-600)', marginBottom: 8 }}>
            暂无产品数据
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)' }}>
            请输入关键词搜索产品信息
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--gray-800)' }}>{value}</span>
    </div>
  );
}

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
