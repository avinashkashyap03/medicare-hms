import { Link, useNavigate } from 'react-router-dom';
import { BiLogOut } from 'react-icons/bi';
import { useAuth } from '../../context/AuthContext.jsx';

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
      <h1>Welcome, {user?.email}</h1>
      <p>You are signed in. Dashboard content will be added here.</p>
      <button type="button" onClick={handleSignOut} className="btn btn-danger">
        <BiLogOut /> Sign Out
      </button>
      <br />
      <Link to="/">Back to home</Link>
    </div>
  );
}

export default Dashboard;
