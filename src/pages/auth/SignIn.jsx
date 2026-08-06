import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiArrowFromRight,
  BiEnvelope,
  BiHide,
  BiLockAlt,
  BiShow,
} from 'react-icons/bi';
import AuthInput from '../../components/auth/AuthInput.jsx';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAuthSubmit } from '../../hooks/useAuthSubmit.js';

function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const { signIn } = useAuth();
  const { error, loading, run } = useAuthSubmit();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await run(() => signIn(email, password, rememberMe));
    if (result !== null) navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h1>Welcome back</h1>
        <p>Sign in to continue to your MediCare HMS account.</p>
      </div>

      <form className="auth-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="signInEmail"
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
          id="signInPassword"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
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

        <div className="auth-options">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn auth-submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'} <BiArrowFromRight />
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/signup">Create account</Link>
      </p>
    </AuthLayout>
  );
}

export default SignIn;
