import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';

export default function RoleGuard({ allowedRoles, children }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/connexion" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/acces-refuse" replace />;
  }

  return children;
}
