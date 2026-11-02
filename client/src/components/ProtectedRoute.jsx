import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullscreen label="Loading your account..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles.length && !hasRole(...roles)) {
    return <Navigate to={hasRole('officer', 'admin') ? '/admin' : '/'} replace />;
  }
  return children;
}
