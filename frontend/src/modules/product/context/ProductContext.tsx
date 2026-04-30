import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface ProductContextType {
  // 当前选中的产品
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  // 搜索历史
  searchHistory: string[];
  addToHistory: (keyword: string) => void;
}

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedSku, setSelectedSku] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const addToHistory = (keyword: string) => {
    if (!keyword.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((k) => k !== keyword);
      return [keyword, ...filtered].slice(0, 10);
    });
  };

  return (
    <ProductContext.Provider value={{ selectedSku, setSelectedSku, searchHistory, addToHistory }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct(): ProductContextType {
  const ctx = useContext(ProductContext);
  if (!ctx) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  return ctx;
}
