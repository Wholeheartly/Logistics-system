import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../../context/AuthContext';

export interface LogisticsContextType {
  // 当前子模块视图
  activeView: 'compare' | 'reconciliation' | 'fee_query';
  setActiveView: (view: 'compare' | 'reconciliation' | 'fee_query') => void;

  // 共享的 SKU 数据（从对账跳转比价时传递）
  sharedSku: string;
  setSharedSku: (sku: string) => void;

  // 共享的仓库数据
  sharedWarehouse: string;
  setSharedWarehouse: (warehouse: string) => void;

  // 导航方法
  navigateToCompare: (sku?: string, warehouse?: string) => void;
  navigateToReconciliation: () => void;
}

const LogisticsContext = createContext<LogisticsContextType | null>(null);

export function LogisticsProvider({ children }: { children: ReactNode }) {
  const { hasPermission } = useAuth();
  const [activeView, setActiveViewState] = useState<'compare' | 'reconciliation' | 'fee_query'>('compare');
  const [sharedSku, setSharedSku] = useState('');
  const [sharedWarehouse, setSharedWarehouse] = useState('CA');

  // 权限变更时自动切换视图
  const setActiveView = useCallback((view: 'compare' | 'reconciliation' | 'fee_query') => {
    if (view === 'reconciliation' && !hasPermission('reconciliation.view')) {
      return;
    }
    if (view === 'fee_query' && !hasPermission('shipping.fee_query')) {
      return;
    }
    setActiveViewState(view);
  }, [hasPermission]);

  useEffect(() => {
    // 如果当前在对账视图但失去了权限，自动切换到比价视图
    if (activeView === 'reconciliation' && !hasPermission('reconciliation.view')) {
      setActiveViewState('compare');
    }
    // 如果当前在费用查询视图但失去了权限，自动切换到比价视图
    if (activeView === 'fee_query' && !hasPermission('shipping.fee_query')) {
      setActiveViewState('compare');
    }
  }, [activeView, hasPermission]);

  const navigateToCompare = useCallback((sku?: string, warehouse?: string) => {
    if (sku) setSharedSku(sku);
    if (warehouse) setSharedWarehouse(warehouse);
    setActiveViewState('compare');
  }, []);

  const navigateToReconciliation = useCallback(() => {
    if (hasPermission('reconciliation.view')) {
      setActiveViewState('reconciliation');
    }
  }, [hasPermission]);

  return (
    <LogisticsContext.Provider
      value={{
        activeView,
        setActiveView,
        sharedSku,
        setSharedSku,
        sharedWarehouse,
        setSharedWarehouse,
        navigateToCompare,
        navigateToReconciliation,
      }}
    >
      {children}
    </LogisticsContext.Provider>
  );
}

export function useLogistics(): LogisticsContextType {
  const ctx = useContext(LogisticsContext);
  if (!ctx) {
    throw new Error('useLogistics must be used within LogisticsProvider');
  }
  return ctx;
}
