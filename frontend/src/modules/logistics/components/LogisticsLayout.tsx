import { useLogistics } from '../context/LogisticsContext';
import { useAuth } from '../../../context/AuthContext';

export default function LogisticsLayout() {
  const { activeView, setActiveView } = useLogistics();
  const { hasPermission } = useAuth();

  const subNavItems = [
    { key: 'compare' as const, label: '物流比价', icon: '🚚', permission: 'shipping.compare' },
    { key: 'fee_query' as const, label: '费用查询', icon: '💰', permission: 'shipping.fee_query' },
    { key: 'reconciliation' as const, label: '订单对账', icon: '📊', permission: 'reconciliation.view' },
  ];

  const visibleItems = subNavItems.filter((item) => hasPermission(item.permission));

  return (
    <div>
      {/* 子导航栏 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          padding: '8px 12px',
          background: '#f5f5f5',
          borderRadius: 8,
        }}
      >
        {visibleItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeView === item.key ? 600 : 400,
              background: activeView === item.key ? '#fff' : 'transparent',
              color: activeView === item.key ? '#1677ff' : '#666',
              boxShadow: activeView === item.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
