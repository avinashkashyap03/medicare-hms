import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiBell,
  BiCog,
  BiLogOut,
  BiMenu,
  BiMessageDetail,
  BiMoon,
  BiSearch,
  BiSun,
  BiUser,
} from 'react-icons/bi';
import { FiChevronDown } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext.jsx';
import { getUserDisplay } from '@/utils/auth.js';

function Topbar({ dark, onToggleTheme, onOpenSidebar }) {
  const { user, signOut } = useAuth();
  const { displayName, initials, email } = getUserDisplay(user);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="topbar">
      <button type="button" className="topbar-mobile-toggle" onClick={onOpenSidebar} aria-label="Open menu">
        <BiMenu />
      </button>

      <div className="topbar-search">
        <BiSearch />
        <input type="search" ref={searchRef} className="topbar-search-input" placeholder="Search patients, doctors, appointments..." />
        <span className="topbar-kbd">Ctrl K</span>
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label="Toggle dark mode">
          {dark ? <BiSun /> : <BiMoon />}
        </button>
        <button type="button" className="icon-btn icon-btn--hide-xs" aria-label="Messages">
          <BiMessageDetail />
        </button>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <BiBell />
          <span className="dot" />
        </button>
        <button type="button" className="icon-btn" onClick={handleSignOut} aria-label="Sign out">
          <BiLogOut />
        </button>

        <div className="topbar-profile" ref={menuRef}>
          <button
            type="button"
            className="topbar-admin"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="avatar">{initials}</span>
            <div className="topbar-admin-info">
              <strong>{displayName}</strong>
              <span>Hospital Admin</span>
            </div>
            <FiChevronDown className={`topbar-admin-caret ${menuOpen ? 'open' : ''}`} />
          </button>

          {menuOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-head">
                <span className="avatar">{initials}</span>
                <div>
                  <strong>{displayName}</strong>
                  <span>{email || 'Signed in user'}</span>
                </div>
              </div>
              <Link to="/profile" onClick={() => setMenuOpen(false)} role="menuitem">
                <BiUser /> My Profile
              </Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)} role="menuitem">
                <BiCog /> Settings
              </Link>
              <div className="profile-menu-divider" />
              <button type="button" onClick={handleSignOut} role="menuitem">
                <BiLogOut /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;