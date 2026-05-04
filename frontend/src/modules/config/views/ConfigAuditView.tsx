import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../context/ConfigContext';

import API from '../../../config/api';

interface AuditLog {
  id: number;
  action: string;
  config_key: string;
  details: string | null;
  user_id: string;
  user_name: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionNames: Record<string, string> = {
  view: '查看',
  edit: '编辑',
  create: '创建',
  delete: '删除',
  export: '导出',
  rollback: '回滚',
};

const actionColors: Record<string, string> = {
  view: '#999',
  edit: '#1677ff',
  create: '#52c41a',
  delete: '#f5222d',
  export: '#722ed1',
  rollback: '#fa8c16',
};

export default function ConfigAuditView() {
  const { navigateToList } = useConfig();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/config/audit-logs?page=${page}&page_size=50`;
      if (filterAction) url += `&action=${filterAction}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      alert('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      {/* 顶部导航 */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0, fontWeight: 600 }}>操作审计日志</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>记录所有配置项的查看、编辑、回滚等操作</p>
        </div>
        <button onClick={navigateToList} style={backBtnStyle}>← 返回配置列表</button>
      </div>

      {/* 筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>操作类型：</span>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          style={{ padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13 }}
        >
          <option value="">全部</option>
          <option value="view">查看</option>
          <option value="edit">编辑</option>
          <option value="create">创建</option>
          <option value="rollback">回滚</option>
        </select>
      </div>

      {/* 日志表格 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>操作</th>
                <th style={thStyle}>配置项</th>
                <th style={thStyle}>详情</th>
                <th style={thStyle}>操作人</th>
                <th style={thStyle}>IP地址</th>
                <th style={thStyle}>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: '#999' }}>#{log.id}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      background: `${actionColors[log.action] || '#999'}15`,
                      color: actionColors[log.action] || '#999',
                    }}>
                      {actionNames[log.action] || log.action}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{log.config_key}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: '#666' }}>{log.details || '-'}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13 }}>{log.user_name || log.user_id}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: '#999' }}>{log.ip_address || '-'}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: '#999' }}>{new Date(log.created_at).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    暂无审计日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {total > 50 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={pageBtnStyle}>上一页</button>
              <span style={{ margin: '0 16px', fontSize: 14 }}>第 {page} 页 / 共 {Math.ceil(total / 50)} 页</span>
              <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)} style={pageBtnStyle}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = { padding: '7px 20px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '2px solid #e5e5e5', textAlign: 'left' as const, background: '#fafafa', fontWeight: 600, whiteSpace: 'nowrap' as const };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f0f0f0' };
const pageBtnStyle: React.CSSProperties = { padding: '4px 12px', border: '1px solid #d9d9d9', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
