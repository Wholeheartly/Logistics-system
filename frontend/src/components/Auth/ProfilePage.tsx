import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

import API from '../../config/api';

interface ProfilePageProps {
  onClose: () => void;
}

export default function ProfilePage({ onClose }: ProfilePageProps) {
  const { user, token, updateProfile, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(user?.avatar_url || null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayAvatar = previewAvatar && !avatarLoadError;

  // 当 user 数据从后端更新时，同步本地表单状态
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDepartment(user.department || '');
      setPreviewAvatar(user.avatar_url || null);
      setAvatarLoadError(false);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // 过滤空字符串，避免发送无效数据到后端
      const payload: Record<string, string | null> = {};
      if (displayName.trim()) payload.display_name = displayName.trim();
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (department.trim()) payload.department = department.trim();
      if (previewAvatar?.trim()) payload.avatar_url = previewAvatar.trim();

      const result = await updateProfile(payload);
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch {
      alert('更新请求失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { alert('两次输入的密码不一致'); return; }
    if (newPassword.length < 6) { alert('密码长度至少6位'); return; }
    if (!/[a-zA-Z]/.test(newPassword)) { alert('密码需包含字母'); return; }
    if (!/[0-9]/.test(newPassword)) { alert('密码需包含数字'); return; }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API}/api/profile/password?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('密码修改成功');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(data.detail || '修改失败');
      }
    } catch {
      alert('修改请求失败');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (限制为5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewAvatar(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传文件
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API}/api/profile/avatar?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const avatarUrl = data.avatar_url + (data.avatar_url.includes('?') ? '&' : '?') + 't=' + Date.now();
        setPreviewAvatar(avatarUrl);
        setAvatarLoadError(false);
        await refreshUser();
      } else {
        alert(data.detail || '头像上传失败');
        setPreviewAvatar(user?.avatar_url || null);
      }
    } catch {
      alert('头像上传请求失败');
      setPreviewAvatar(user?.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const triggerAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  if (!user) return null;

  return (
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
      onClick={onClose}
    >
      <div
        className="animate-fadeInScale"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 520,
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 32px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: 20,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            onClick={triggerAvatarSelect}
          >
            {displayAvatar ? (
              <img
                src={previewAvatar!}
                alt="头像"
                onError={() => setAvatarLoadError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-bold)',
                  color: '#fff',
                }}
              >
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            {uploadingAvatar && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarSelect}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>
              {user.display_name || user.username}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginTop: 4, fontWeight: 'var(--font-medium)' }}>
              {user.role === 'admin' ? '管理员' : user.role === 'finance' ? '财务' : '运营'} · {user.username}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: 'var(--gray-100)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gray-500)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人信息
          </TabButton>
          <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            修改密码
          </TabButton>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px 32px' }}>
          {activeTab === 'profile' ? (
            <div className="animate-fadeInUp">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <InputField label="用户名" value={user.username} disabled />
                <InputField label="显示名称" value={displayName} onChange={setDisplayName} placeholder="您的姓名" />
                <InputField label="邮箱" value={email} onChange={setEmail} placeholder="example@email.com" />
                <InputField label="手机号" value={phone} onChange={setPhone} placeholder="联系电话" />
              </div>
              <div style={{ marginTop: 16 }}>
                <InputField label="部门" value={department} onChange={setDepartment} placeholder="所属部门" />
              </div>
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    ...primaryBtnStyle,
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      保存中...
                    </span>
                  ) : '保存修改'}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fadeInUp">
              <InputField label="当前密码" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="请输入当前密码" />
              <div style={{ marginTop: 14 }}>
                <InputField label="新密码" type="password" value={newPassword} onChange={setNewPassword} placeholder="至少6位，含字母和数字" />
              </div>
              <div style={{ marginTop: 14 }}>
                <InputField label="确认新密码" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" />
              </div>
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  style={{
                    ...primaryBtnStyle,
                    opacity: changingPassword ? 0.7 : 1,
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                  }}
                >
                  {changingPassword ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      修改中...
                    </span>
                  ) : '修改密码'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '14px 20px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: active ? 'var(--font-bold)' : 'var(--font-medium)',
        color: active ? 'var(--primary-600)' : 'var(--gray-500)',
        borderBottom: active ? '2px solid var(--primary-500)' : '2px solid transparent',
        marginBottom: -1,
        transition: 'all var(--transition-base)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, disabled }: {
  label: string; type?: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-700)', marginBottom: 8 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `2px solid ${disabled ? 'var(--gray-200)' : 'var(--border-light)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          transition: 'all var(--transition-base)',
          background: disabled ? 'var(--gray-50)' : 'var(--surface-primary)',
          color: disabled ? 'var(--gray-400)' : 'var(--gray-800)',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : undefined,
        }}
      />
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '11px 28px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
};
