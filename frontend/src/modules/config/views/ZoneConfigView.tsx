import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

import API from '../../../config/api';

interface ZoneMapping {
  id: number;
  warehouse: string;
  zip_prefix: string;
  zone: number;
}

interface ZoneFormData {
  warehouse: string;
  zip_prefix: string;
  zone: number;
}

export default function ZoneConfigView() {
  const { token, hasPermission } = useAuth();
  const [zones, setZones] = useState<ZoneMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterZip, setFilterZip] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ZoneFormData>({
    warehouse: '',
    zip_prefix: '',
    zone: 2,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = hasPermission('config.manage');

  const fetchZones = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('token', token);
      params.append('page', String(page));
      params.append('page_size', String(pageSize));
      if (filterWarehouse) params.append('warehouse', filterWarehouse);
      if (filterZip) params.append('zip_prefix', filterZip);

      const res = await fetch(`${API}/api/zones?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setZones(data.zones || []);
        setTotal(data.total || 0);
      } else {
        setMessage({ type: 'error', text: data.detail || '查询失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络请求失败' });
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, filterWarehouse, filterZip]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      if (editingId) {
        const res = await fetch(`${API}/api/zones/${editingId}/update?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zone: formData.zone }),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: '更新成功' });
          setShowForm(false);
          setEditingId(null);
          fetchZones();
        } else {
          setMessage({ type: 'error', text: data.detail || '更新失败' });
        }
      } else {
        const res = await fetch(`${API}/api/zones?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: '添加成功' });
          setShowForm(false);
          setFormData({ warehouse: '', zip_prefix: '', zone: 2 });
          fetchZones();
        } else {
          setMessage({ type: 'error', text: data.detail || '添加失败' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: '网络请求失败' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('确定要删除这条发货区域配置吗？')) return;

    try {
      const res = await fetch(`${API}/api/zones/${id}/delete?token=${token}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '删除成功' });
        fetchZones();
      } else {
        setMessage({ type: 'error', text: data.detail || '删除失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络请求失败' });
    }
  };

  const startEdit = (zone: ZoneMapping) => {
    setFormData({
      warehouse: zone.warehouse,
      zip_prefix: zone.zip_prefix,
      zone: zone.zone,
    });
    setEditingId(zone.id);
    setShowForm(true);
  };

  const startCreate = () => {
    setFormData({ warehouse: '', zip_prefix: '', zone: 2 });
    setEditingId(null);
    setShowForm(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!canManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 8 }}>权限不足</div>
        <div style={{ fontSize: 'var(--text-sm)' }}>仅管理员可管理发货区域配置</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--gray-800)', margin: 0 }}>
          发货区域配置管理
        </h2>
        <button onClick={startCreate} style={primaryBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新增配置
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            background: message.type === 'success' ? 'var(--success-50)' : 'var(--error-50)',
            color: message.type === 'success' ? 'var(--success-600)' : 'var(--error-600)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          padding: '14px 16px',
          background: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '0 1 140px' }}>
          <label style={fieldLabelStyle}>仓库</label>
          <input
            value={filterWarehouse}
            onChange={(e) => { setFilterWarehouse(e.target.value); setPage(1); }}
            placeholder="如: CA"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '0 1 140px' }}>
          <label style={fieldLabelStyle}>邮编前缀</label>
          <input
            value={filterZip}
            onChange={(e) => { setFilterZip(e.target.value); setPage(1); }}
            placeholder="如: 100"
            style={inputStyle}
          />
        </div>
        <button onClick={fetchZones} style={{ ...secondaryBtnStyle, padding: '10px 20px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          查询
        </button>
        <button
          onClick={() => { setFilterWarehouse(''); setFilterZip(''); setPage(1); }}
          style={{ ...secondaryBtnStyle, padding: '10px 20px' }}
        >
          重置
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: 'var(--surface-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--gray-800)' }}>
              {editingId ? '编辑发货区域配置' : '新增发货区域配置'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabelStyle}>发货仓代码 *</label>
                <input
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value.toUpperCase() })}
                  placeholder="如: CA, NJ, TX"
                  maxLength={10}
                  required
                  disabled={!!editingId}
                  style={{ ...inputStyle, background: editingId ? 'var(--gray-100)' : 'var(--surface-primary)' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabelStyle}>邮编前缀 *</label>
                <input
                  value={formData.zip_prefix}
                  onChange={(e) => setFormData({ ...formData, zip_prefix: e.target.value })}
                  placeholder="如: 100, 902"
                  maxLength={5}
                  required
                  disabled={!!editingId}
                  style={{ ...inputStyle, background: editingId ? 'var(--gray-100)' : 'var(--surface-primary)' }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={fieldLabelStyle}>Zone 编号 *</label>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: parseInt(e.target.value) || 2 })}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={secondaryBtnStyle}>
                  取消
                </button>
                <button type="submit" style={primaryBtnStyle}>
                  {editingId ? '保存修改' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>发货仓</th>
              <th style={thStyle}>邮编前缀</th>
              <th style={thStyle}>Zone</th>
              <th style={{ ...thStyle, width: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    加载中...
                  </span>
                </td>
              </tr>
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  暂无数据
                </td>
              </tr>
            ) : (
              zones.map((z) => (
                <tr key={z.id}>
                  <td style={tdStyle}>{z.id}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-semibold)',
                        background: 'var(--primary-50)',
                        color: 'var(--primary-600)',
                      }}
                    >
                      {z.warehouse}
                    </span>
                  </td>
                  <td style={tdStyle}>{z.zip_prefix}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-semibold)',
                        background: 'var(--success-50)',
                        color: 'var(--success-600)',
                      }}
                    >
                      Zone {z.zone}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEdit(z)} style={iconBtnStyle} title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(z.id)} style={{ ...iconBtnStyle, color: 'var(--error-500)' }} title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
          共 {total} 条记录，第 {page} / {totalPages || 1} 页
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}
          >
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
            <option value={100}>100条/页</option>
            <option value={200}>200条/页</option>
            <option value={500}>500条/页</option>
          </select>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...secondaryBtnStyle, padding: '6px 14px' }}
          >
            上一页
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...secondaryBtnStyle, padding: '6px 14px' }}
          >
            下一页
          </button>
        </div>
      </div>
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

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
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

const iconBtnStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  color: 'var(--primary-600)',
  transition: 'all var(--transition-fast)',
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
