import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';

export default function SuperAdminGuard({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== 'super_admin') return <Navigate to="/connexion" replace />;
  return children;
}
