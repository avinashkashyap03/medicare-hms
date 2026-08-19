import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

function RoleRoute({ roles }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-center">
        <Spinner />
      </div>
    );
  }

  return roles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default RoleRoute;