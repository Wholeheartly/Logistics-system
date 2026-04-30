import { useState } from 'react';
import ProductSearchView from './views/ProductSearchView';
import ProductUploadView from './views/ProductUploadView';

type ProductTab = 'search' | 'upload';

export default function ProductModule() {
  const [activeTab, setActiveTab] = useState<ProductTab>('search');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, margin: 0, fontWeight: 600 }}>产品查询</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666' }}>
          搜索产品 SKU，查看产品尺寸和重量信息；支持 Excel 批量导入和手动录入
        </p>
      </div>

      {/* Sub Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'search' ? 'var(--primary-500)' : 'var(--surface-secondary)',
            color: activeTab === 'search' ? '#fff' : 'var(--gray-600)',
            fontWeight: activeTab === 'search' ? 'var(--font-semibold)' : 'var(--font-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: activeTab === 'search' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          产品搜索
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'upload' ? 'var(--primary-500)' : 'var(--surface-secondary)',
            color: activeTab === 'upload' ? '#fff' : 'var(--gray-600)',
            fontWeight: activeTab === 'upload' ? 'var(--font-semibold)' : 'var(--font-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: activeTab === 'upload' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          产品上传
        </button>
      </div>

      {activeTab === 'search' && <ProductSearchView />}
      {activeTab === 'upload' && <ProductUploadView />}
    </div>
  );
}
