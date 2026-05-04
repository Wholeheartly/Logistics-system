import { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';

import API from '../../../config/api';

interface ConfigDetail {
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
  min_value: number | null;
  max_value: number | null;
  related_entity_type: string | null;
  related_entity_id: number | null;
  related_field: string | null;
  created_at: string;
  updated_at: string;
  histories: ConfigHistory[];
}

interface ConfigHistory {
  id: number;
  old_value: string | null;
  new_value: string;
  change_reason: string | null;
  changed_by: string;
  change_type: string;
  created_at: string;
}

const categoryNames: Record<string, string> = {
  carrier: '物流商配置',
  surcharge: '附加费配置',
  system: '系统配置',
  zone: 'Zone配置',
  rate: '费率配置',
  product: '产品配置',
};

export default function ConfigDetailView() {
  const { selectedConfigId, navigateToList } = useConfig();
  const [detail, setDetail] = useState<ConfigDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedConfigId) return;
    setLoading(true);
    fetch(`${API}/api/config/item/${selectedConfigId}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setSelectedVersions([]);
      })
      .catch(() => alert('加载详情失败'))
      .finally(() => setLoading(false));
  }, [selectedConfigId]);

  const handleRollback = async (historyId: number) => {
    if (!confirm('确定要回滚到此版本吗？')) return;
    try {
      const res = await fetch(`${API}/api/config/item/${selectedConfigId}/rollback/${historyId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || '回滚失败');
      } else {
        alert('回滚成功');
        // 刷新详情
        const r2 = await fetch(`${API}/api/config/item/${selectedConfigId}`);
        const d2 = await r2.json();
        setDetail(d2);
      }
    } catch {
      alert('回滚请求失败');
    }
  };

  const toggleVersion = (historyId: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(historyId)) {
        return prev.filter((id) => id !== historyId);
      }
      if (prev.length >= 2) {
        return [prev[1], historyId];
      }
      return [...prev, historyId];
    });
  };

  const getComparedVersions = () => {
    if (!detail || selectedVersions.length !== 2) return null;
    const v1 = detail.histories.find((h) => h.id === selectedVersions[0]);
    const v2 = detail.histories.find((h) => h.id === selectedVersions[1]);
    if (!v1 || !v2) return null;
    return { v1, v2 };
  };

  const formatValue = (val: string | null, type: string, unit: string | null) => {
    if (val === null || val === undefined) return '-';
    if (type === 'boolean') return val === 'true' ? '是' : '否';
    return `${val}${unit || ''}`;
  };

  const compared = compareMode ? getComparedVersions() : null;

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  if (!detail) return <div style={{ padding: 40, textAlign: 'center' }}>未找到配置项</div>;

  return (
    <div>
      {/* 顶部导航 */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={navigateToList} style={backBtnStyle}>← 返回列表</button>
      </div>

      <h2 style={{ fontSize: 18, margin: '0 0 8px', fontWeight: 600 }}>{detail.display_name}</h2>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>
        {detail.config_key} · {categoryNames[detail.category] || detail.category}
        {detail.sub_category && ` · ${detail.sub_category}`}
      </div>

      {/* 配置信息卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <InfoCard label="当前值" value={formatValue(detail.current_value, detail.value_type, detail.unit)} highlight />
        <InfoCard label="默认值" value={formatValue(detail.default_value, detail.value_type, detail.unit)} />
        <InfoCard label="建议值" value={formatValue(detail.suggested_value, detail.value_type, detail.unit)} />
        <InfoCard label="数据类型" value={detail.value_type} />
        <InfoCard label="可编辑" value={detail.is_editable ? '是' : '否'} />
        <InfoCard label="最后更新" value={detail.updated_at ? new Date(detail.updated_at).toLocaleString() : '-'} />
      </div>

      {detail.description && (
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 13, color: '#389e0d' }}>
          <strong>说明：</strong>{detail.description}
        </div>
      )}

      {/* 版本对比工具 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>变更历史</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setCompareMode(!compareMode); setSelectedVersions([]); }}
            style={{ ...btnStyle, background: compareMode ? '#1677ff' : '#f0f0f0', color: compareMode ? '#fff' : '#333' }}
          >
            {compareMode ? '退出对比' : '🔍 版本对比'}
          </button>
        </div>
      </div>

      {compareMode && selectedVersions.length === 2 && compared && (
        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>版本对比</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>版本 A</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatValue(compared.v1.new_value, detail.value_type, detail.unit)}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{compared.v1.changed_by} · {new Date(compared.v1.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>版本 B</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatValue(compared.v2.new_value, detail.value_type, detail.unit)}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{compared.v2.changed_by} · {new Date(compared.v2.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* 历史记录表格 */}
      <table style={tableStyle}>
        <thead>
          <tr>
            {compareMode && <th style={{ ...thStyle, width: 40 }}></th>}
            <th style={thStyle}>版本</th>
            <th style={thStyle}>旧值</th>
            <th style={thStyle}>新值</th>
            <th style={thStyle}>变更原因</th>
            <th style={thStyle}>操作人</th>
            <th style={thStyle}>变更时间</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {detail.histories.map((h, index) => (
            <tr key={h.id}>
              {compareMode && (
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(h.id)}
                    onChange={() => toggleVersion(h.id)}
                  />
                </td>
              )}
              <td style={tdStyle}>
                <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0f0f0', borderRadius: 10, color: '#666' }}>
                  v{detail.histories.length - index}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ color: '#999', textDecoration: 'line-through' }}>
                  {formatValue(h.old_value, detail.value_type, detail.unit)}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 500, color: '#1677ff' }}>
                  {formatValue(h.new_value, detail.value_type, detail.unit)}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12, color: '#666' }}>{h.change_reason || '-'}</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12 }}>{h.changed_by}</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12, color: '#999' }}>{new Date(h.created_at).toLocaleString()}</span>
              </td>
              <td style={tdStyle}>
                <button onClick={() => handleRollback(h.id)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 12, background: '#fa8c16' }}>
                  回滚
                </button>
              </td>
            </tr>
          ))}
          {detail.histories.length === 0 && (
            <tr>
              <td colSpan={compareMode ? 8 : 7} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                暂无变更历史
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: highlight ? '#1677ff' : '#333' }}>{value}</div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = { padding: '6px 16px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#333' };
const btnStyle: React.CSSProperties = { padding: '6px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '2px solid #e5e5e5', textAlign: 'left' as const, background: '#fafafa', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f0f0f0' };
