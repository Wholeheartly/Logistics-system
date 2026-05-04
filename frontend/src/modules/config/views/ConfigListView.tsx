import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../context/ConfigContext';

import API from '../../../config/api';

interface ConfigItem {
  id: number;
  config_key: string;
  category: string;
  sub_category: string | null;
  display_name: string;
  description: string | null;
  current_value: string;
  default_value: string | null;
  suggested_value: string | null;
  value_type: string;
  unit: string | null;
  is_editable: boolean;
  is_sensitive: boolean;
  min_value: number | null;
  max_value: number | null;
  updated_at: string;
}

interface CategoryInfo {
  key: string;
  name: string;
  count: number;
}

const categoryConfig: Record<string, { color: string; bg: string; name: string; icon: React.ReactNode }> = {
  carrier: {
    color: 'var(--primary-600)',
    bg: 'var(--primary-50)',
    name: '物流商配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/></svg>,
  },
  surcharge: {
    color: 'var(--warning-600)',
    bg: 'var(--warning-50)',
    name: '附加费配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  },
  system: {
    color: 'var(--success-600)',
    bg: 'var(--success-50)',
    name: '系统配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
  zone: {
    color: '#7c3aed',
    bg: '#f3e8ff',
    name: 'Zone配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  },
  rate: {
    color: '#db2777',
    bg: '#fce7f3',
    name: '费率配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  product: {
    color: '#0891b2',
    bg: '#cffafe',
    name: '产品配置',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
};

export default function ConfigListView() {
  const { selectedCategory, setSelectedCategory, navigateToDetail, navigateToAudit, navigateToZones, refreshKey, triggerRefresh } = useConfig();
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/config/categories`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      console.error('加载分类失败');
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/config/items?page=${page}&page_size=50`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      alert('加载配置项失败');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, keyword, page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/config/sync`, { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      triggerRefresh();
      fetchCategories();
    } catch {
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (item: ConfigItem) => {
    if (!editValue.trim()) return;
    try {
      const res = await fetch(`${API}/api/config/item/${item.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_value: editValue, reason: editReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || '更新失败');
      } else {
        setEditingId(null);
        setEditValue('');
        setEditReason('');
        triggerRefresh();
      }
    } catch {
      alert('更新请求失败');
    }
  };

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id);
    setEditValue(item.current_value);
    setEditReason('');
  };

  const formatValue = (item: ConfigItem) => {
    if (item.value_type === 'boolean') {
      return item.current_value === 'true' ? '是' : '否';
    }
    return `${item.current_value}${item.unit || ''}`;
  };

  const renderValueInput = (item: ConfigItem) => {
    if (item.value_type === 'boolean') {
      return (
        <select value={editValue} onChange={(e) => setEditValue(e.target.value)} style={editInputStyle}>
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      );
    }
    return (
      <input
        type={item.value_type === 'int' ? 'number' : item.value_type === 'float' ? 'number' : 'text'}
        step={item.value_type === 'float' ? 'any' : item.value_type === 'int' ? 1 : undefined}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        style={editInputStyle}
        placeholder={item.min_value !== null && item.max_value !== null ? `范围: ${item.min_value ?? '-'} ~ ${item.max_value ?? '-'}` : '请输入数值'}
      />
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>系统配置管理</h2>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>管理系统可配置参数，支持字段变更追踪与历史版本对比</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSync} disabled={syncing} style={{ ...successBtnStyle, opacity: syncing ? 0.7 : 1, cursor: syncing ? 'not-allowed' : 'pointer' }}>
            {syncing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                同步中...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                扫描系统字段
              </span>
            )}
          </button>
          <button onClick={navigateToZones} style={{ ...secondaryBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            发货区域配置
          </button>
          <button onClick={navigateToAudit} style={{ ...secondaryBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            审计日志
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="animate-fadeInUp" style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <CategoryPill
          active={selectedCategory === null}
          onClick={() => { setSelectedCategory(null); setPage(1); }}
          label={`全部 (${total})`}
        />
        {categories.map((cat) => {
          const cfg = categoryConfig[cat.key] || { color: 'var(--gray-500)', bg: 'var(--gray-100)', name: cat.key, icon: null };
          return (
            <CategoryPill
              key={cat.key}
              active={selectedCategory === cat.key}
              onClick={() => { setSelectedCategory(cat.key); setPage(1); }}
              label={`${cfg.name} (${cat.count})`}
              color={cfg.color}
              bg={cfg.bg}
              icon={cfg.icon}
            />
          );
        })}
      </div>

      {/* Search */}
      <div className="animate-fadeInUp" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--primary-500)' : 'var(--gray-400)', transition: 'color var(--transition-fast)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索配置项名称、关键字..."
            style={{
              padding: '10px 14px 10px 44px',
              border: `2px solid ${searchFocused ? 'var(--primary-500)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              width: '100%',
              outline: 'none',
              transition: 'all var(--transition-base)',
              background: 'var(--surface-primary)',
              color: 'var(--gray-800)',
              fontFamily: 'inherit',
              boxShadow: searchFocused ? '0 0 0 3px var(--primary-100)' : undefined,
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Config List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
          <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>加载中...</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>配置项</th>
                  <th style={thStyle}>分类</th>
                  <th style={thStyle}>当前值</th>
                  <th style={thStyle}>默认值</th>
                  <th style={thStyle}>类型</th>
                  <th style={thStyle}>更新时间</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const catCfg = categoryConfig[item.category] || { color: 'var(--gray-500)', bg: 'var(--gray-100)', name: item.category };
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: item.is_editable ? undefined : 'var(--gray-50)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => { if (item.is_editable) e.currentTarget.style.background = 'var(--gray-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = item.is_editable ? 'transparent' : 'var(--gray-50)'; }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--gray-800)' }}>{item.display_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2, fontFamily: 'monospace' }}>{item.config_key}</div>
                        {item.description && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 4, lineHeight: 'var(--leading-relaxed)' }}>{item.description}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                          background: catCfg.bg,
                          color: catCfg.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {catCfg.icon}
                          {catCfg.name}
                        </span>
                        {item.sub_category && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 4 }}>{item.sub_category}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === item.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {renderValueInput(item)}
                            <input
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="变更原因（必填）"
                              style={{ ...editInputStyle, fontSize: 'var(--text-xs)' }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleSave(item)} style={{ ...primaryBtnStyle, padding: '5px 12px', fontSize: 'var(--text-xs)' }}>保存</button>
                              <button onClick={() => setEditingId(null)} style={{ ...secondaryBtnStyle, padding: '5px 12px', fontSize: 'var(--text-xs)' }}>取消</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--primary-600)', fontSize: 'var(--text-base)' }}>{formatValue(item)}</span>
                            {item.suggested_value && item.suggested_value !== item.current_value && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--warning-600)', marginTop: 4, fontWeight: 'var(--font-medium)' }}>
                                建议: {item.suggested_value}{item.unit || ''}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>{item.default_value || '-'}{item.unit || ''}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 'var(--text-xs)',
                          padding: '3px 8px',
                          background: 'var(--gray-100)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--gray-600)',
                          fontWeight: 'var(--font-medium)',
                          textTransform: 'uppercase',
                        }}>
                          {item.value_type}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 'var(--font-medium)' }}>
                          {item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {item.is_editable && editingId !== item.id && (
                            <button onClick={() => startEdit(item)} style={{ ...primaryBtnStyle, padding: '5px 12px', fontSize: 'var(--text-xs)' }}>编辑</button>
                          )}
                          <button onClick={() => navigateToDetail(item.id)} style={{ ...purpleBtnStyle, padding: '5px 12px', fontSize: 'var(--text-xs)' }}>历史</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > 50 && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <PageButton disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</PageButton>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
                第 {page} 页 / 共 {Math.ceil(total / 50)} 页
              </span>
              <PageButton disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)}>下一页</PageButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryPill({ active, onClick, label, color, bg, icon }: { active: boolean; onClick: () => void; label: string; color?: string; bg?: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid',
        borderColor: active ? (color || 'var(--primary-500)') : 'var(--border-light)',
        background: active ? (bg || 'var(--primary-50)') : 'var(--surface-primary)',
        color: active ? (color || 'var(--primary-600)') : 'var(--gray-600)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
        transition: 'all var(--transition-base)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

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

const editInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '2px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  width: 160,
  outline: 'none',
  transition: 'all var(--transition-base)',
  background: 'var(--surface-primary)',
  color: 'var(--gray-800)',
  fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
  fontFamily: 'inherit',
};

const successBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: 'var(--surface-secondary)',
  color: 'var(--gray-700)',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
};

const purpleBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
  fontFamily: 'inherit',
};
