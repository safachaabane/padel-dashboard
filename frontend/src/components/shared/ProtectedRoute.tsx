import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AdminLayout from '../admin/AdminLayout';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
