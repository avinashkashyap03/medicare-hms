import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiArrowFromRight,
  BiEnvelope,
  BiLockAlt,
  BiUser,
} from 'react-icons/bi';
import AuthInput, { PasswordInput } from '@/components/auth/AuthInput.jsx';
import AuthLayout from '@/components/auth/AuthLayout.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAuthSubmit } from '@/hooks/useAuthSubmit.js';
import { usePasswordForm } from '@/hooks/usePasswordForm.js';

function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { password, setPassword, confirmPassword, setConfirmPassword, validate } =
    usePasswordForm();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const { signUp } = useAuth();
  const { error, loading, run, setError } = useAuthSubmit();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validate();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the terms of service to continue.');
      return;
    }

    const { ok, data: needsConfirmation } = await run(() => signUp(email, password, name));
    if (ok) {
      if (needsConfirmation) {
        setCheckEmail(true);
      } else {
        navigate('/');
      }
    }
  };

  if (checkEmail) {
    return (
      <AuthLayout>
        <div className="auth-heading">
          <h1>Check your inbox</h1>
          <p>We&apos;ve sent a confirmation link to your email. Click it to activate your account.</p>
        </div>
        <Link to="/login" className="auth-submit">
          Go to Sign In <BiArrowFromRight />
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h1>Create your account</h1>
        <p>Get started with MediCare HMS in under a minute.</p>
      </div>

      <form className="auth-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="signUpName"
          name="fullName"
          label="Full name"
          type="text"
          placeholder="Dr. Riya Sharma"
          autoComplete="name"
          icon={BiUser}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <AuthInput
          id="signUpEmail"
          name="email"
          label="Email address"
          type="email"
          placeholder="name@hospital.com"
          autoComplete="email"
          icon={BiEnvelope}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          id="signUpPassword"
          name="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordInput
          id="signUpConfirm"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          icon={BiLockAlt}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <label className="auth-checkbox auth-checkbox--inline">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            required
          />
          <span>I agree to the terms of service and privacy policy</span>
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'} <BiArrowFromRight />
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default SignUp;
