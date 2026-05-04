import { useState, useEffect, useCallback } from 'react';
import type { AppModule } from '../App';

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  role: string;
  avatar_url?: string;
}

interface SidebarProps {
  activeModule: AppModule;
  onModuleChange: (module: AppModule) => void;
  user: UserInfo | null;
  onLogout: () => void;
  onProfile: () => void;
  availableModules: Record<string, boolean>;
}

interface NavItem {
  key: AppModule;
  label: string;
  icon: React.ReactNode;
  description: string;
  permission: string;
}

const navIcons: Record<string, React.ReactNode> = {
  logistics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  product: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  config: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  usermgr: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

const allNavItems: NavItem[] = [
  { key: 'logistics', label: '物流管理', icon: navIcons.logistics, description: '物流比价与订单对账', permission: 'shipping.compare' },
  { key: 'product', label: '产品查询', icon: navIcons.product, description: '产品信息搜索与查看', permission: 'product.view' },
  { key: 'config', label: '配置管理', icon: navIcons.config, description: '系统参数与配置管理', permission: 'config.manage' },
  { key: 'usermgr', label: '用户管理', icon: navIcons.usermgr, description: '用户审核与权限管理', permission: 'user.manage' },
];

export default function Sidebar({ activeModule, onModuleChange, user, onLogout, onProfile, availableModules }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const visibleItems = allNavItems.filter((item) => availableModules[item.key]);

  const showAvatarImage = user?.avatar_url && !avatarError;

  const handleAvatarError = useCallback(() => {
    setAvatarError(true);
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="animate-fadeIn"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 101,
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-light)',
          display: window.innerWidth > 768 ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--gray-700)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className="animate-slideInLeft"
        style={{
          width: sidebarWidth,
          minHeight: '100vh',
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: mobileOpen ? 0 : undefined,
          transform: window.innerWidth <= 768 && !mobileOpen ? 'translateX(-100%)' : undefined,
          transition: 'width var(--transition-slow), transform var(--transition-slow)',
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '20px 12px' : '20px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            height: 72,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                物流系统
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 2, fontWeight: 'var(--font-medium)' }}>
                跨境电商物流管理
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            top: 24,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-500)',
            border: '2px solid var(--sidebar-bg)',
            display: window.innerWidth <= 1024 ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 10,
            transition: 'transform var(--transition-base)',
            transform: collapsed ? 'rotate(180deg)' : undefined,
            zIndex: 10,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Navigation */}
        <nav style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
          {!collapsed && (
            <div
              style={{
                padding: '0 20px 10px',
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-600)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 'var(--font-semibold)',
              }}
            >
              业务模块
            </div>
          )}
          {visibleItems.map((item, index) => {
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onModuleChange(item.key);
                  setMobileOpen(false);
                }}
                className="animate-fadeInUp"
                style={{
                  width: collapsed ? 56 : 'calc(100% - 16px)',
                  margin: collapsed ? '6px auto' : '4px 8px',
                  padding: collapsed ? '12px' : '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--sidebar-active)' : 'transparent',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  transition: 'all var(--transition-base)',
                  textAlign: 'left',
                  position: 'relative',
                  animationDelay: `${index * 50}ms`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--sidebar-hover)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7, transition: 'opacity var(--transition-base)' }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-medium)', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: isActive ? 'rgba(255,255,255,0.5)' : 'var(--gray-600)', marginTop: 2, whiteSpace: 'nowrap' }}>
                      {item.description}
                    </div>
                  </div>
                )}
                {isActive && !collapsed && (
                  <div
                    style={{
                      width: 4,
                      height: 20,
                      borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(180deg, var(--primary-400), var(--accent-400))',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        {user && (
          <div
            style={{
              padding: collapsed ? '12px 8px' : '16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: collapsed ? 0 : 12,
                cursor: 'pointer',
                padding: collapsed ? '8px' : '0',
                borderRadius: 'var(--radius-md)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onClick={onProfile}
            >
              {showAvatarImage ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  onError={handleAvatarError}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-bold)',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {user.display_name?.charAt(0)?.toUpperCase() || user.username.charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.display_name || user.username}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                    {user.role === 'admin' ? '管理员' : user.role === 'finance' ? '财务' : '运营'}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton icon="user" onClick={onProfile}>
                  个人中心
                </ActionButton>
                <ActionButton icon="logout" onClick={onLogout} variant="danger">
                  退出
                </ActionButton>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.08)',
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-600)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 'var(--font-medium)' }}>跨境电商物流比价系统</div>
            <div style={{ marginTop: 2, opacity: 0.7 }}>v1.0.0</div>
          </div>
        )}
      </aside>
    </>
  );
}

function ActionButton({ icon, onClick, children, variant = 'default' }: { icon: string; onClick: () => void; children: React.ReactNode; variant?: 'default' | 'danger' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: '8px 10px',
        background: hovered
          ? variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'
          : 'rgba(255,255,255,0.06)',
        color: hovered
          ? variant === 'danger' ? 'var(--error-400)' : 'var(--primary-300)'
          : 'rgba(255,255,255,0.5)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-medium)',
        transition: 'all var(--transition-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {icon === 'user' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )}
      {children}
    </button>
  );
}
