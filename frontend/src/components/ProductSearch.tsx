import { useState } from 'react';

import API from '../config/api';

interface Product {
  sku: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  gross_weight_kg: number;
}

export default function ProductSearch() {
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      alert('请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入 SKU 关键词搜索，留空查看全部"
          style={{ padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, width: 300 }}
        />
        <button onClick={handleSearch} disabled={loading} style={btnStyle}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {products.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>长 (cm)</th>
              <th style={thStyle}>宽 (cm)</th>
              <th style={thStyle}>高 (cm)</th>
              <th style={thStyle}>毛重 (kg)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku}>
                <td style={tdStyle}>{p.sku}</td>
                <td style={tdStyle}>{p.length_cm}</td>
                <td style={tdStyle}>{p.width_cm}</td>
                <td style={tdStyle}>{p.height_cm}</td>
                <td style={tdStyle}>{p.gross_weight_kg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && keyword && products.length === 0 && (
        <div style={{ color: '#999', fontSize: 13 }}>未找到匹配的 SKU</div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '7px 20px',
  background: '#1677ff',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '2px solid #e5e5e5',
  textAlign: 'left' as const,
  background: '#fafafa',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #f0f0f0',
};
