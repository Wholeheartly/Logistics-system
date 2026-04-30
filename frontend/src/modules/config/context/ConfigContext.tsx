import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ConfigContextType {
  // 当前视图
  activeView: 'list' | 'detail' | 'audit' | 'zones';
  setActiveView: (view: 'list' | 'detail' | 'audit' | 'zones') => void;

  // 选中的配置项
  selectedConfigId: number | null;
  setSelectedConfigId: (id: number | null) => void;

  // 当前筛选的分类
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;

  // 刷新标记
  refreshKey: number;
  triggerRefresh: () => void;

  // 导航方法
  navigateToList: () => void;
  navigateToDetail: (configId: number) => void;
  navigateToAudit: () => void;
  navigateToZones: () => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'audit' | 'zones'>('list');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const navigateToList = useCallback(() => {
    setSelectedConfigId(null);
    setActiveView('list');
  }, []);

  const navigateToDetail = useCallback((configId: number) => {
    setSelectedConfigId(configId);
    setActiveView('detail');
  }, []);

  const navigateToAudit = useCallback(() => {
    setSelectedConfigId(null);
    setActiveView('audit');
  }, []);

  const navigateToZones = useCallback(() => {
    setSelectedConfigId(null);
    setActiveView('zones');
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedConfigId,
        setSelectedConfigId,
        selectedCategory,
        setSelectedCategory,
        refreshKey,
        triggerRefresh,
        navigateToList,
        navigateToDetail,
        navigateToAudit,
        navigateToZones,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return ctx;
}
