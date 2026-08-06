import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiArrowBack,
  BiArrowFromRight,
  BiCheckCircle,
  BiHide,
  BiLockAlt,
  BiShow,
} from 'react-icons/bi';
import AuthInput from '../../components/auth/AuthInput.jsx';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAuthSubmit } from '../../hooks/useAuthSubmit.js';
import { validatePassword } from '../../utils/auth.js';
import supabase from '../../services/supabase.js';

function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const { exchangeRecoveryCode, updatePassword, signOut } = useAuth();
  const { error, loading, run, setError } = useAuthSubmit();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        await run(() => exchangeRecoveryCode(code));
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setInvalid(true);
      }
      setChecking(false);
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const result = await run(() => updatePassword(password));
    if (result !== null) setDone(true);
  };

  const handleGoToSignIn = async () => {
    try {
      await signOut();
    } catch {
      // session may already be invalidated after password change
    }
    navigate('/login');
  };

  if (checking) {
    return (
      <AuthLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
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
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="auth-success">
          <span className="auth-success-icon">
            <BiCheckCircle />
          </span>
          <h3>Password updated</h3>
          <p>Your password has been changed successfully. Sign in again with your new password.</p>
          <button type="button" className="btn auth-submit" onClick={handleGoToSignIn}>
            Go to Sign In <BiArrowFromRight />
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (invalid) {
    return (
      <AuthLayout>
        <div className="auth-heading">
          <h1>Invalid or expired link</h1>
          <p>This password reset link is no longer valid.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <Link to="/forgot-password" className="btn auth-submit">
          Request a new link <BiArrowFromRight />
        </Link>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-switch">
          <Link to="/login" className="auth-back-link">
            <BiArrowBack /> Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h1>Set a new password</h1>
        <p>Choose a strong password to secure your account.</p>
      </div>

      <form className="auth-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="resetPassword"
          name="password"
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        >
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <BiHide /> : <BiShow />}
          </button>
        </AuthInput>

        <AuthInput
          id="resetConfirm"
          name="confirmPassword"
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        >
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowConfirm((prev) => !prev)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <BiHide /> : <BiShow />}
          </button>
        </AuthInput>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn auth-submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'} <BiArrowFromRight />
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <p className="auth-switch">
        <Link to="/login" className="auth-back-link">
          <BiArrowBack /> Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;
