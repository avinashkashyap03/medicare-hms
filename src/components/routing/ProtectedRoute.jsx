import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-center">
        <Spinner />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
}

export default ProtectedRoute;
