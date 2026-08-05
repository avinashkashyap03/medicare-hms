import { BiPlus, BiPulse, BiSolidClinic } from 'react-icons/bi';
import { Link } from 'react-router-dom';

function Logo() {
  return (
    <Link to="/" className="auth-brand" aria-label="MediCare HMS home">
      <span className="auth-brand-logo">
        <BiSolidClinic />
      </span>
      <span className="auth-brand-text">
        MediCare <em>HMS</em>
      </span>
    </Link>
  );
}

function AuthVisual() {
  return (
    <aside className="auth-visual">
      <div className="auth-visual-shape auth-visual-shape--top" />
      <div className="auth-visual-shape auth-visual-shape--bottom" />

      <div className="auth-visual-glow auth-visual-glow--one" />
      <div className="auth-visual-glow auth-visual-glow--two" />

      <BiPulse className="auth-visual-icon auth-visual-icon--pulse" />
      <BiPlus className="auth-visual-icon auth-visual-icon--cross" />

      <div className="auth-visual-content">
        <span className="auth-visual-badge">
          <BiSolidClinic />
        </span>
        <h2>Modern healthcare, managed simply.</h2>
        <p>
          A complete platform to manage patients, doctors, appointments and hospital operations in
          one secure place.
        </p>

        <div className="auth-visual-stats">
          <div className="auth-visual-stat">
            <strong>12k+</strong>
            <span>Daily patients</span>
          </div>
          <div className="auth-visual-stat">
            <strong>98.9%</strong>
            <span>Uptime</span>
          </div>
          <div className="auth-visual-stat">
            <strong>24/7</strong>
            <span>Care support</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="auth-split">
      <section className="auth-panel">
        <Logo />
        <div className="auth-form">{children}</div>
      </section>
      <AuthVisual />
    </div>
  );
}

export default AuthLayout;
