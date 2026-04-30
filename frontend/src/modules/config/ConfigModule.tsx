import { useConfig } from './context/ConfigContext';
import ConfigListView from './views/ConfigListView';
import ConfigDetailView from './views/ConfigDetailView';
import ConfigAuditView from './views/ConfigAuditView';
import ZoneConfigView from './views/ZoneConfigView';

export default function ConfigModule() {
  const { activeView } = useConfig();

  return (
    <div>
      {activeView === 'list' && <ConfigListView />}
      {activeView === 'detail' && <ConfigDetailView />}
      {activeView === 'audit' && <ConfigAuditView />}
      {activeView === 'zones' && <ZoneConfigView />}
    </div>
  );
}
