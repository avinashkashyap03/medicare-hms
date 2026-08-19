import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

// Gate a page behind a module permission (the database enforces the
// same rule via has_permission(); this just keeps unauthorized users
// out of the UI). An inactive account is handled by ProtectedRoute.
function PermissionRoute({ module }) {
  const { can, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-center">
        <Spinner />
      </div>
    );
  }

  return can(module, 'view') ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default PermissionRoute;