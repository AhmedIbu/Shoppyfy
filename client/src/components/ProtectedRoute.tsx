import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Role } from '../types';
import Spinner from './Spinner';

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, status } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <Spinner label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && user.role !== 'ADMIN' && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
