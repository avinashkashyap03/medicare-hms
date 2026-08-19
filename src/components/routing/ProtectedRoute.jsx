import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import AccountStatus from '@/pages/auth/AccountStatus.jsx';

function ProtectedRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  // Accounts that are not active (pending / suspended / deactivated)
  // see a status screen instead of the app. Unknown status (e.g. a
  // transient profile fetch failure) falls through — the database
  // RLS still blocks any data access until the account is active.
  if (profile?.status && profile.status !== 'active') {
    return <AccountStatus />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
