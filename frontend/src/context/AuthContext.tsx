import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'operator' | 'finance' | 'admin';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  status: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar_url?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isAuthenticated: boolean;
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
  checkPermission: (permission: string) => Promise<boolean>;
}

export interface ProfileUpdateData {
  display_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar_url?: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  display_name?: string;
  phone?: string;
  department?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

import API from '../config/api';

/**
 * 创建带认证头的请求配置
 * 优先使用 Authorization: Bearer <token> 头部传递令牌（安全）
 * 不再将 token 放在 URL query 中（避免泄露到浏览器历史、服务器日志）
 */
function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * 带认证的 fetch 辅助函数
 */
export async function authFetch(
  token: string | null,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!token) {
    throw new Error('未登录');
  }
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '请求失败';
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail)) {
    const messages = d.detail
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => {
        if (typeof item.msg === 'string') {
          const msg = item.msg;
          if (msg.startsWith('Value error, ')) return msg.replace('Value error, ', '');
          return msg;
        }
        return JSON.stringify(item);
      });
    return messages.join('; ') || '请求参数错误';
  }
  if (typeof d.message === 'string') return d.message;
  return '请求失败';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (savedToken) {
      fetch(`${API}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.id) {
            setUser({
              id: data.id,
              username: data.username,
              display_name: data.display_name,
              role: data.role,
              status: data.status,
              email: data.email,
              phone: data.phone,
              department: data.department,
              avatar_url: data.avatar_url,
            });
            setToken(savedToken);
            setPermissions(data.permissions || []);
          } else {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
          }
        })
        .catch((err) => {
          console.error('初始化用户信息失败:', err);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = token || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!savedToken || typeof savedToken !== 'string') return;
    try {
      const res = await fetch(`${API}/api/profile`, {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('获取用户信息失败:', extractErrorMessage(errorData));
        return;
      }
      const data = await res.json();
      if (data.id) {
        setUser({
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          role: data.role,
          status: data.status,
          email: data.email,
          phone: data.phone,
          department: data.department,
          avatar_url: data.avatar_url,
        });
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('刷新用户信息异常:', err);
    }
  }, [token]);

  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: '未登录' };
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        await refreshUser();
        return { success: true, message: result.message || '更新成功' };
      }
      return { success: false, message: extractErrorMessage(result) };
    } catch {
      return { success: false, message: '请求失败' };
    }
  }, [token, refreshUser]);

  const login = useCallback(async (username: string, password: string, rememberMe = false): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember_me: rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || '登录失败');
        return false;
      }

      if (!data.success || !data.token || !data.user) {
        alert(data.message || data.detail || '登录响应数据异常，请重试');
        return false;
      }

      setUser(data.user);
      setToken(data.token);
      setPermissions(data.permissions || []);

      if (rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      return true;
    } catch {
      alert('登录请求失败');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, message: result.detail || '注册失败' };
      }
      return { success: true, message: result.message || '注册成功' };
    } catch {
      return { success: false, message: '注册请求失败' };
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const checkPermission = useCallback(
    async (permission: string): Promise<boolean> => {
      const savedToken = token || localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!savedToken || typeof savedToken !== 'string') return false;
      try {
        const res = await fetch(`${API}/api/roles/check`, {
          method: 'POST',
          headers: authHeaders(savedToken),
          body: JSON.stringify({ permission }),
        });
        const data = await res.json();
        return data.granted === true;
      } catch {
        return hasPermission(permission);
      }
    },
    [token, hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isLoading,
        login,
        logout,
        register,
        hasPermission,
        hasAnyPermission,
        isAuthenticated: !!user,
        updateProfile,
        refreshUser,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
