import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import UserManagePage from './components/Auth/UserManagePage';
import ProfilePage from './components/Auth/ProfilePage';
import { LogisticsProvider } from './modules/logistics/context/LogisticsContext';
import { ProductProvider } from './modules/product/context/ProductContext';
import { ConfigProvider } from './modules/config/context/ConfigContext';
import { LogisticsModule } from './modules/logistics';
import { ProductModule } from './modules/product';
import { ConfigModule } from './modules/config';

export type AppModule = 'logistics' | 'product' | 'config' | 'usermgr';

const moduleNames: Record<AppModule, string> = {
  logistics: '物流管理',
  product: '产品查询',
  config: '配置管理',
  usermgr: '用户管理',
};

const moduleIcons: Record<AppModule, React.ReactNode> = {
  logistics: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
    </svg>
  ),
  product: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  config: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  usermgr: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
};

function AppContent() {
  const { isAuthenticated, user, logout, hasPermission } = useAuth();
  const [activeModule, setActiveModule] = useState<AppModule>('logistics');
  const [showAuth, setShowAuth] = useState<'login' | 'register'>('login');
  const [showProfile, setShowProfile] = useState(false);

  if (!isAuthenticated) {
    return showAuth === 'login' ? (
      <LoginPage onSwitchToRegister={() => setShowAuth('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setShowAuth('login')} />
    );
  }

  const canAccessLogistics = hasPermission('shipping.compare');
  const canAccessProduct = hasPermission('product.view');
  const canAccessConfig = hasPermission('config.manage');
  const canAccessUserMgr = hasPermission('user.manage');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        user={user}
        onLogout={logout}
        onProfile={() => setShowProfile(true)}
        availableModules={{
          logistics: canAccessLogistics,
          product: canAccessProduct,
          config: canAccessConfig,
          usermgr: canAccessUserMgr,
        }}
      />
      {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}

      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          flex: 1,
          padding: 'clamp(16px, 3vw, 32px)',
          background: 'var(--gray-50)',
          minHeight: '100vh',
          transition: 'margin-left var(--transition-slow)',
        }}
      >
        {/* Breadcrumb Header */}
        <div
          className="animate-fadeInUp"
          style={{
            marginBottom: 24,
            padding: '14px 20px',
            background: 'var(--surface-elevated)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary-500)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span style={{ color: 'var(--gray-300)' }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-800)', fontWeight: 'var(--font-semibold)' }}>
            {moduleIcons[activeModule]}
            {moduleNames[activeModule]}
          </div>

          {user && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--success-500)',
                  boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)',
                }}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 'var(--font-medium)' }}>
                {user.display_name} · {user.role === 'admin' ? '管理员' : user.role === 'finance' ? '财务' : '运营'}
              </span>
            </div>
          )}
        </div>

        {/* Module Content */}
        <div
          className="animate-fadeInScale"
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(16px, 2.5vw, 28px)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-light)',
            minHeight: 'calc(100vh - 180px)',
          }}
        >
          {activeModule === 'logistics' && canAccessLogistics && (
            <LogisticsProvider>
              <LogisticsModule />
            </LogisticsProvider>
          )}
          {activeModule === 'product' && canAccessProduct && (
            <ProductProvider>
              <ProductModule />
            </ProductProvider>
          )}
          {activeModule === 'config' && canAccessConfig && (
            <ConfigProvider>
              <ConfigModule />
            </ConfigProvider>
          )}
          {activeModule === 'usermgr' && canAccessUserMgr && (
            <UserManagePage />
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
