import { useState } from 'react';
import { apiUrl } from '../../config/api';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    display_name: '',
    phone: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 6) {
      alert('密码长度至少6位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email || undefined,
          display_name: form.display_name || undefined,
          phone: form.phone || undefined,
          department: form.department || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegistered(true);
      } else {
        alert(data.detail || '注册失败');
      }
    } catch {
      alert('注册请求失败');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div style={containerStyle}>
        <div style={bgDecoration1} />
        <div style={bgDecoration2} />
        <div className="animate-fadeInScale" style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', margin: '0 0 12px', fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>
              注册成功
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)', marginBottom: 28, lineHeight: 'var(--leading-relaxed)' }}>
              您的账号已提交，请等待管理员审核通过后方可登录。
            </p>
            <button onClick={onSwitchToLogin} style={submitBtnStyle}>返回登录</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={bgDecoration1} />
      <div style={bgDecoration2} />

      <div className="animate-fadeInScale" style={{ ...cardStyle, maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.25)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', margin: 0, fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>
            用户注册
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--gray-500)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
            注册后需管理员审核才能使用
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField
              label="用户名 *"
              type="text"
              value={form.username}
              onChange={(v) => handleChange('username', v)}
              placeholder="3-50位字符"
              focused={focusedField === 'username'}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <InputField
              label="显示名称"
              type="text"
              value={form.display_name}
              onChange={(v) => handleChange('display_name', v)}
              placeholder="您的姓名"
              focused={focusedField === 'display_name'}
              onFocus={() => setFocusedField('display_name')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField
              label="密码 *"
              type="password"
              value={form.password}
              onChange={(v) => handleChange('password', v)}
              placeholder="至少6位"
              focused={focusedField === 'password'}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              required
            />
            <InputField
              label="确认密码 *"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => handleChange('confirmPassword', v)}
              placeholder="再次输入密码"
              focused={focusedField === 'confirmPassword'}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              required
            />
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField
              label="邮箱"
              type="email"
              value={form.email}
              onChange={(v) => handleChange('email', v)}
              placeholder="example@email.com"
              focused={focusedField === 'email'}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
            <InputField
              label="手机号"
              type="tel"
              value={form.phone}
              onChange={(v) => handleChange('phone', v)}
              placeholder="联系电话"
              focused={focusedField === 'phone'}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div style={{ marginTop: 14, marginBottom: 24 }}>
            <InputField
              label="部门"
              type="text"
              value={form.department}
              onChange={(v) => handleChange('department', v)}
              placeholder="所属部门"
              focused={focusedField === 'department'}
              onFocus={() => setFocusedField('department')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitBtnStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                注册中...
              </span>
            ) : '提交注册'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
            已有账号？
            <button type="button" onClick={onSwitchToLogin} style={{ ...linkStyle, marginLeft: 4, fontWeight: 'var(--font-semibold)' }}>
              立即登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, focused, onFocus, onBlur, required }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; focused: boolean; onFocus: () => void; onBlur: () => void; required?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          ...inputBaseStyle,
          borderColor: focused ? 'var(--primary-500)' : 'var(--border-light)',
          boxShadow: focused ? '0 0 0 3px var(--primary-100), var(--shadow-sm)' : 'var(--shadow-xs)',
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      />
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
  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
  top: '-200px',
  right: '-200px',
  animation: 'float 8s ease-in-out infinite',
};

const bgDecoration2: React.CSSProperties = {
  position: 'absolute',
  width: 400,
  height: 400,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
  bottom: '-100px',
  left: '-100px',
  animation: 'float 10s ease-in-out infinite reverse',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--radius-xl)',
  padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 36px)',
  width: '100%',
  maxWidth: 400,
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
  marginBottom: 6,
};

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
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
  padding: '12px',
  background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-base)',
  fontWeight: 'var(--font-semibold)',
  cursor: 'pointer',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
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
