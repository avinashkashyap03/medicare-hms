import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <span
        className="spinner"
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(0, 0, 0, 0.1)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spinner-rotate 0.8s linear infinite',
        }}
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  return user ? <Outlet /> : <Navigate to="/login" />;
}

export default ProtectedRoute;
