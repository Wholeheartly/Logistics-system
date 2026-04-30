import { useLogistics } from './context/LogisticsContext';
import LogisticsLayout from './components/LogisticsLayout';
import ShippingCompareView from './views/ShippingCompareView';
import ShippingFeeQueryView from './views/ShippingFeeQueryView';
import ReconciliationView from './views/ReconciliationView';

export default function LogisticsModule() {
  const { activeView } = useLogistics();

  return (
    <div>
      <LogisticsLayout />
      {activeView === 'compare' && <ShippingCompareView />}
      {activeView === 'fee_query' && <ShippingFeeQueryView />}
      {activeView === 'reconciliation' && <ReconciliationView />}
    </div>
  );
}
