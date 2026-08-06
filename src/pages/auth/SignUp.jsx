import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiArrowFromRight,
  BiEnvelope,
  BiHide,
  BiLockAlt,
  BiShow,
  BiUser,
} from 'react-icons/bi';
import AuthInput from '../../components/auth/AuthInput.jsx';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAuthSubmit } from '../../hooks/useAuthSubmit.js';
import { validatePassword } from '../../utils/auth.js';

function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const { signUp } = useAuth();
  const { error, loading, run, setError } = useAuthSubmit();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the terms of service to continue.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const needsConfirmation = await run(() => signUp(email, password, name));
    if (needsConfirmation !== null) {
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
        <Link to="/login" className="btn auth-submit">
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

        <AuthInput
          id="signUpPassword"
          name="password"
          label="Password"
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
          id="signUpConfirm"
          name="confirmPassword"
          label="Confirm password"
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

        <button type="submit" className="btn auth-submit" disabled={loading}>
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
