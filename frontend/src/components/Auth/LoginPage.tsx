import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    await login(username, password, rememberMe);
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!forgotUser.trim()) return;
    try {
      const res = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUser }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`重置令牌: ${data.token}\n请复制此令牌并在下方输入新密码`);
        setResetToken(data.token);
      } else {
        alert(data.detail || '请求失败');
      }
    } catch {
      alert('请求失败');
    }
  };

  const validatePassword = (pwd: string): { ok: boolean; message: string } => {
    if (pwd.length < 6) return { ok: false, message: '密码长度至少6位' };
    if (!/[A-Za-z]/.test(pwd)) return { ok: false, message: '密码需包含字母' };
    if (!/[0-9]/.test(pwd)) return { ok: false, message: '密码需包含数字' };
    return { ok: true, message: '' };
  };

  const handleReset = async () => {
    if (!resetToken || !newPassword) return;
    const v = validatePassword(newPassword);
    if (!v.ok) { alert(v.message); return; }
    try {
      const res = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('密码重置成功，请使用新密码登录');
        setShowForgot(false);
        setResetToken('');
        setNewPassword('');
      } else {
        alert(data.detail || '重置失败');
      }
    } catch {
      alert('重置失败，请稍后重试');
    }
  };

  return (
    <div style={containerStyle}>
      {/* Background decoration */}
      <div style={bgDecoration1} />
      <div style={bgDecoration2} />
      <div style={bgDecoration3} />

      <div className="animate-fadeInScale" style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0, fontWeight: 'var(--font-bold)', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
            物流管理系统
          </h1>
          <p style={{ margin: '10px 0 0', color: 'var(--gray-500)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
            跨境电商物流比价与对账平台
          </p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleSubmit}>
            <InputField
              label="用户名"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="请输入用户名"
              focused={focusedField === 'username'}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />

            <div style={{ marginTop: 16 }}>
              <InputField
                label="密码"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="请输入密码"
                focused={focusedField === 'password'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              />
            </div>

            <div style={{ marginTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 'var(--font-medium)' }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${rememberMe ? 'var(--primary-500)' : 'var(--gray-300)'}`,
                    background: rememberMe ? 'var(--primary-500)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                记住我
              </label>
              <button type="button" onClick={() => setShowForgot(true)} style={linkStyle}>
                忘记密码？
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...submitBtnStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                transform: loading ? 'scale(0.98)' : undefined,
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
              还没有账号？
              <button type="button" onClick={onSwitchToRegister} style={{ ...linkStyle, marginLeft: 4, fontWeight: 'var(--font-semibold)' }}>
                立即注册
              </button>
            </div>
          </form>
        ) : (
          <div className="animate-fadeInUp">
            <h3 style={{ fontSize: 'var(--text-xl)', margin: '0 0 20px', fontWeight: 'var(--font-semibold)', color: 'var(--gray-900)' }}>
              重置密码
            </h3>
            {!resetToken ? (
              <>
                <InputField
                  label="用户名"
                  type="text"
                  value={forgotUser}
                  onChange={setForgotUser}
                  placeholder="请输入用户名"
                  focused={focusedField === 'forgotUser'}
                  onFocus={() => setFocusedField('forgotUser')}
                  onBlur={() => setFocusedField(null)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
                <button onClick={handleForgot} style={{ ...submitBtnStyle, marginTop: 16 }}>获取重置令牌</button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>重置令牌</label>
                  <input type="text" value={resetToken} readOnly style={{ ...inputBaseStyle, background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'not-allowed' }} />
                </div>
                <InputField
                  label="新密码"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="请输入新密码"
                  focused={focusedField === 'newPassword'}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                />
                <button onClick={handleReset} style={{ ...submitBtnStyle, marginTop: 16 }}>重置密码</button>
              </>
            )}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => { setShowForgot(false); setResetToken(''); }} style={linkStyle}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  返回登录
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, focused, onFocus, onBlur, icon }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; focused: boolean; onFocus: () => void; onBlur: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
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
            left: 14,
            color: focused ? 'var(--primary-500)' : 'var(--gray-400)',
            transition: 'color var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            ...inputBaseStyle,
            paddingLeft: 44,
            borderColor: focused ? 'var(--primary-500)' : 'var(--border-light)',
            boxShadow: focused ? '0 0 0 3px var(--primary-100), var(--shadow-sm)' : 'var(--shadow-xs)',
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          required
        />
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, var(--gray-900) 0%, #1e293b 50%, var(--primary-900) 100%)',
  padding: 20,
  position: 'relative',
  overflow: 'hidden',
};

const bgDecoration1: React.CSSProperties = {
  position: 'absolute',
  width: 600,
  height: 600,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
  top: '-200px',
  right: '-200px',
  animation: 'float 8s ease-in-out infinite',
};

const bgDecoration2: React.CSSProperties = {
  position: 'absolute',
  width: 400,
  height: 400,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
  bottom: '-100px',
  left: '-100px',
  animation: 'float 10s ease-in-out infinite reverse',
};

const bgDecoration3: React.CSSProperties = {
  position: 'absolute',
  width: 300,
  height: 300,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--radius-xl)',
  padding: 'clamp(32px, 5vw, 48px) clamp(24px, 4vw, 40px)',
  width: '100%',
  maxWidth: 420,
  boxShadow: 'var(--shadow-xl), 0 0 60px rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  position: 'relative',
  zIndex: 1,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--gray-700)',
  marginBottom: 8,
};

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'all var(--transition-base)',
  background: 'var(--surface-primary)',
  color: 'var(--gray-800)',
  fontFamily: 'inherit',
};

const submitBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-base)',
  fontWeight: 'var(--font-semibold)',
  cursor: 'pointer',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
  fontFamily: 'inherit',
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--primary-500)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  textDecoration: 'none',
  padding: 0,
  fontWeight: 'var(--font-medium)',
  transition: 'color var(--transition-fast)',
  fontFamily: 'inherit',
};
