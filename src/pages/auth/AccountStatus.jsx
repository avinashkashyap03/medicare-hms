import { useNavigate } from 'react-router-dom';
import { BiArrowFromRight, BiHourglass, BiInfoCircle, BiLockAlt } from 'react-icons/bi';
import AuthLayout from '@/components/auth/AuthLayout.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { getStatusLabel } from '@/utils/auth.js';

const STATUS_COPY = {
  pending: {
    icon: BiHourglass,
    title: 'Account pending approval',
    body: 'Your account is waiting for an administrator to approve it. You will be able to sign in and use the system once it is approved.',
  },
  suspended: {
    icon: BiLockAlt,
    title: 'Account suspended',
    body: 'Your account has been temporarily suspended by an administrator. Contact your administrator to find out why and request reactivation.',
  },
  deactivated: {
    icon: BiInfoCircle,
    title: 'Account deactivated',
    body: 'Your account has been deactivated. Contact your administrator if you believe this is a mistake.',
  },
};

function AccountStatus() {
  const { status, signOut } = useAuth();
  const navigate = useNavigate();

  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;
  const Icon = copy.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <span className="auth-status-icon">
          <Icon />
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <p className="auth-status-label">Status: {getStatusLabel(status)}</p>
      </div>
      <button type="button" className="auth-submit" onClick={handleSignOut}>
        Sign out <BiArrowFromRight />
      </button>
    </AuthLayout>
  );
}

export default AccountStatus;