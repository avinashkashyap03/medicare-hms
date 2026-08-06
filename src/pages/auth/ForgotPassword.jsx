import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BiArrowBack, BiEnvelope, BiSend } from 'react-icons/bi';
import AuthInput from '../../components/auth/AuthInput.jsx';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAuthSubmit } from '../../hooks/useAuthSubmit.js';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword } = useAuth();
  const { error, loading, run } = useAuthSubmit();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await run(() =>
      resetPassword(email, `${window.location.origin}/reset-password`)
    );
    if (result !== null) setSubmitted(true);
  };

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h1>Forgot password?</h1>
        <p>Enter your email and we&apos;ll send you a link to reset it.</p>
      </div>

      {submitted ? (
        <div className="auth-success">
          <span className="auth-success-icon">
            <BiEnvelope />
          </span>
          <h3>Check your inbox</h3>
          <p>
            If an account exists for your email, a password reset link has been sent. Follow the
            instructions to regain access.
          </p>
          <Link to="/login" className="btn auth-submit">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form className="auth-form-body" onSubmit={handleSubmit}>
          <AuthInput
            id="forgotEmail"
            name="email"
            label="Email address"
            type="email"
            placeholder="name@hospital.com"
            autoComplete="email"
            icon={BiEnvelope}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'} <BiSend />
          </button>
        </form>
      )}

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

export default ForgotPassword;
