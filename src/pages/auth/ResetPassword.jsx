import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiArrowBack,
  BiArrowFromRight,
  BiCheckCircle,
  BiLockAlt,
} from 'react-icons/bi';
import { PasswordInput } from '@/components/auth/AuthInput.jsx';
import AuthLayout from '@/components/auth/AuthLayout.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAuthSubmit } from '@/hooks/useAuthSubmit.js';
import { usePasswordForm } from '@/hooks/usePasswordForm.js';
import { getFriendlyAuthError } from '@/utils/auth.js';
import supabase from '@/services/supabase.js';

function ResetPassword() {
  const { password, setPassword, confirmPassword, setConfirmPassword, validate } =
    usePasswordForm();
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('');
  const [done, setDone] = useState(false);
  const { exchangeRecoveryCode, updatePassword, signOut } = useAuth();
  const { error, loading, run, setError } = useAuthSubmit();
  const navigate = useNavigate();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    let cancelled = false;

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      const urlError = params.get('error');
      const urlErrorCode = params.get('error_code');
      const urlErrorDescription = params.get('error_description');

      if (urlError || urlErrorCode || urlErrorDescription) {
        const friendly = getFriendlyAuthError({
          code: urlErrorCode,
          message: urlErrorDescription || urlError,
        });
        setInvalidMessage(
          friendly || 'This password reset link is invalid or has expired. Please request a new one.'
        );
        setInvalid(true);
        setChecking(false);
        return;
      }

      if (code) {
        const { ok } = await run(() => exchangeRecoveryCode(code));
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!ok) {
          setInvalid(true);
          setChecking(false);
          return;
        }
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
  }, [run, exchangeRecoveryCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validate();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const { ok } = await run(() => updatePassword(password));
    if (ok) setDone(true);
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
        <div className="loader-center loader-center--padded">
          <Spinner />
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
          <button type="button" className="auth-submit" onClick={handleGoToSignIn}>
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
        {invalidMessage && !error && <div className="auth-error">{invalidMessage}</div>}

        <Link to="/forgot-password" className="auth-submit">
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
        <PasswordInput
          id="resetPassword"
          name="password"
          label="New password"
          placeholder="Create a password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordInput
          id="resetConfirm"
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-submit" disabled={loading}>
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
