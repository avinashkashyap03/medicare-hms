import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-center">
        <Spinner />
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : <Outlet />;
}

export default PublicOnlyRoute;
