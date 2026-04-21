import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/auth.store';
import { getMe } from '../../api/auth.api';

export default function AuthGuard({ children }) {
  const { user, token, refreshToken, login, logout, setTokens } = useAuthStore();
  const [checking, setChecking] = useState(!token);
  const location = useLocation();

  useEffect(() => {
    if (!token && refreshToken) {
      axios.post('/api/auth/refresh', { refreshToken })
        .then(({ data }) => {
          setTokens(data.token, data.refreshToken);
          setChecking(false);
        })
        .catch(() => {
          logout();
          setChecking(false);
        });
    } else if (token) {
      getMe()
        .then(({ data }) => {
          if (data.user) useAuthStore.getState().updateUser(data.user);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return children;
}
