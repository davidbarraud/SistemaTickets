import { useAuth } from '../auth/AuthContext';
import { OperatorDashboard } from './OperatorDashboard';
import { RequesterDashboard } from './RequesterDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'OPERADOR' ? <OperatorDashboard /> : <RequesterDashboard />;
}
