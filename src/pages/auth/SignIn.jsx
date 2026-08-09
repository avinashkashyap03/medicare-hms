import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiArrowFromRight, BiEnvelope, BiLockAlt } from 'react-icons/bi';
import AuthInput, { PasswordInput } from '@/components/auth/AuthInput.jsx';
import AuthLayout from '@/components/auth/AuthLayout.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAuthSubmit } from '@/hooks/useAuthSubmit.js';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const { signIn } = useAuth();
  const { error, loading, run } = useAuthSubmit();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { ok } = await run(() => signIn(email, password, rememberMe));
    if (ok) navigate('/dashboard');
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

        <PasswordInput
          id="signInPassword"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          icon={BiLockAlt}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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

        <button type="submit" className="auth-submit" disabled={loading}>
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
