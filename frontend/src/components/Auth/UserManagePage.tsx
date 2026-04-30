import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:8000';

interface User {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
}

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: '管理员', color: '#7c3aed', bg: '#f3e8ff' },
  operator: { label: '运营', color: 'var(--primary-600)', bg: 'var(--primary-50)' },
  finance: { label: '财务', color: '#0891b2', bg: '#cffafe' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: '正常', color: 'var(--success-600)', bg: 'var(--success-50)', dot: 'var(--success-500)' },
  pending: { label: '待审核', color: 'var(--warning-600)', bg: 'var(--warning-50)', dot: 'var(--warning-500)' },
  disabled: { label: '禁用', color: 'var(--error-600)', bg: 'var(--error-50)', dot: 'var(--error-500)' },
};

export default function UserManagePage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/users?token=${token}&page=${page}&page_size=20`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (searchKeyword) url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      alert('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, searchKeyword, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId: number) => {
    try {
      const res = await fetch(`${API}/api/users/${userId}/approve?token=${token}`, {
        method: 'POST',
      });
      if (res.ok) { fetchUsers(); }
      else { const data = await res.json(); alert(data.detail || '审核失败'); }
    } catch { alert('审核请求失败'); }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`${API}/api/users/${editingUser.id}/update?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, status: editStatus }),
      });
      if (res.ok) { setEditingUser(null); fetchUsers(); }
      else { const data = await res.json(); alert(data.detail || '更新失败'); }
    } catch { alert('更新请求失败'); }
  };

  const startEdit = (u: User) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  return (
    <div>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>用户管理</h2>
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>审核新注册用户、管理用户角色与状态</p>
      </div>

      {/* Filters */}
      <div className="animate-fadeInUp" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'active', 'disabled'] as const).map((s) => (
            <StatusFilterButton key={s} active={filterStatus === s} onClick={() => { setFilterStatus(s); setPage(1); }}>
              {s === 'all' ? '全部' : s === 'pending' ? '待审核' : s === 'active' ? '正常' : '禁用'}
            </StatusFilterButton>
          ))}
        </div>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--primary-500)' : 'var(--gray-400)', transition: 'color var(--transition-fast)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            value={searchKeyword}
            onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
            placeholder="搜索用户名、姓名、邮箱..."
            style={{
              padding: '9px 14px 9px 42px',
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

      {/* User Table */}
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
                  <th style={thStyle}>用户</th>
                  <th style={thStyle}>联系信息</th>
                  <th style={thStyle}>角色</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>部门</th>
                  <th style={thStyle}>注册时间</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleCfg = roleConfig[u.role] || { label: u.role, color: 'var(--gray-500)', bg: 'var(--gray-100)' };
                  const statusCfg = statusConfig[u.status] || { label: u.status, color: 'var(--gray-500)', bg: 'var(--gray-100)', dot: 'var(--gray-400)' };
                  return (
                    <tr
                      key={u.id}
                      style={{ transition: 'background var(--transition-fast)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-full)',
                                objectFit: 'cover',
                                flexShrink: 0,
                                boxShadow: `0 2px 8px ${roleCfg.color}40`,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-full)',
                                background: `linear-gradient(135deg, ${roleCfg.color}, ${roleCfg.color}dd)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'var(--font-bold)',
                                color: '#fff',
                                flexShrink: 0,
                                boxShadow: `0 2px 8px ${roleCfg.color}40`,
                              }}
                            >
                              {(u.display_name || u.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--gray-800)' }}>{u.display_name || u.username}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontFamily: 'monospace', marginTop: 2 }}>{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>{u.email || '-'}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2 }}>{u.phone || '-'}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                          background: roleCfg.bg,
                          color: roleCfg.color,
                        }}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot }} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)', fontWeight: 'var(--font-medium)' }}>{u.department || '-'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 'var(--font-medium)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {u.status === 'pending' && (
                            <button onClick={() => handleApprove(u.id)} style={{ ...successBtnStyle, padding: '5px 14px', fontSize: 'var(--text-xs)' }}>
                              审核通过
                            </button>
                          )}
                          <button onClick={() => startEdit(u)} style={{ ...secondaryBtnStyle, padding: '5px 14px', fontSize: 'var(--text-xs)' }}>
                            编辑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <PageButton disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</PageButton>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
                第 {page} 页 / 共 {Math.ceil(total / 20)} 页
              </span>
              <PageButton disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>下一页</PageButton>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div
          className="animate-fadeIn"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            className="animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              width: '100%',
              maxWidth: 420,
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-light)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-xl)', margin: '0 0 24px', fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>
              编辑用户: {editingUser.display_name || editingUser.username}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-700)', marginBottom: 8 }}>角色</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={modalSelectStyle}>
                <option value="admin">管理员</option>
                <option value="operator">运营</option>
                <option value="finance">财务</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-700)', marginBottom: 8 }}>状态</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={modalSelectStyle}>
                <option value="active">正常</option>
                <option value="disabled">禁用</option>
                <option value="pending">待审核</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleUpdate} style={{ ...primaryBtnStyle, flex: 1 }}>保存</button>
              <button onClick={() => setEditingUser(null)} style={{ ...secondaryBtnStyle, flex: 1 }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 18px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid',
        borderColor: active ? 'var(--primary-500)' : 'var(--border-light)',
        background: active ? 'var(--primary-500)' : 'var(--surface-primary)',
        color: active ? '#fff' : 'var(--gray-600)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
        transition: 'all var(--transition-base)',
      }}
    >
      {children}
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
};

const successBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.25)',
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
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

const modalSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '2px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  transition: 'all var(--transition-base)',
  background: 'var(--surface-primary)',
  color: 'var(--gray-800)',
  fontFamily: 'inherit',
};
