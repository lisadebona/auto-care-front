import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-sm text-gray-500">
        Checking authentication…
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
}
