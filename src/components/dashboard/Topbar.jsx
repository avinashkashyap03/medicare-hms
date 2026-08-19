import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BiCog,
  BiLogOut,
  BiMenu,
  BiMoon,
  BiSearch,
  BiSun,
  BiUser,
} from 'react-icons/bi';
import { FiChevronDown } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext.jsx';
import { useTheme } from '@/context/ThemeContext.jsx';
import { getUserDisplay, getRoleLabel } from '@/utils/auth.js';
import { fetchPatients } from '@/services/patients.js';
import { fetchDoctors } from '@/services/doctors.js';
import Spinner from '@/components/ui/Spinner.jsx';

function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const palette = ['#2563eb', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981'];

function Topbar({ onOpenSidebar }) {
  const { user, signOut, role, can } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { displayName, initials, email } = getUserDisplay(user);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState({ patients: [], doctors: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchOpen(false);
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
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const value = query.trim();
      if (!value) {
        setSearchOpen(false);
        setResults({ patients: [], doctors: [] });
        setSearchLoading(false);
        setDebounced('');
      } else {
        setSearchLoading(true);
        setDebounced(value);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) return undefined;
    let cancelled = false;
    Promise.all([
      fetchPatients({ search: debounced, page: 1, pageSize: 6 }).catch(() => ({ data: [], count: 0 })),
      fetchDoctors({ search: debounced, page: 1, pageSize: 6 }).catch(() => ({ data: [], count: 0 })),
    ])
      .then(([p, d]) => {
        if (cancelled) return;
        setResults({ patients: p.data ?? [], doctors: d.data ?? [] });
        setSearchOpen(true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const hasResults = results.patients.length > 0 || results.doctors.length > 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="topbar">
      <button type="button" className="topbar-mobile-toggle" onClick={onOpenSidebar} aria-label="Open menu">
        <BiMenu />
      </button>

      <div className="topbar-search" ref={searchBoxRef}>
        <BiSearch />
        <input
          type="search"
          ref={searchRef}
          className="topbar-search-input"
          placeholder="Search patients, doctors, appointments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => debounced && setSearchOpen(true)}
        />
        <span className="topbar-kbd">Ctrl K</span>

        {searchOpen && (
          <div className="topbar-search-results">
            {searchLoading ? (
              <div className="topbar-search-loading">
                <Spinner />
              </div>
            ) : !debounced || !hasResults ? (
              <p className="topbar-search-empty">No patients or doctors match “{debounced}”.</p>
            ) : (
              <>
                {results.patients.length > 0 && (
                  <div className="topbar-search-group">
                    <p className="topbar-search-label">Patients</p>
                    {results.patients.map((p, i) => (
                      <Link
                        key={p.id}
                        to="/patients"
                        className="topbar-search-item"
                        onClick={() => setSearchOpen(false)}
                      >
                        <span
                          className="initials"
                          style={{ background: palette[i % palette.length] }}
                        >
                          {initialsOf(p.name)}
                        </span>
                        <span className="topbar-search-item-info">
                          <strong>{p.name}</strong>
                          <span>{p.mrn || p.id.slice(0, 8)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {results.doctors.length > 0 && (
                  <div className="topbar-search-group">
                    <p className="topbar-search-label">Doctors</p>
                    {results.doctors.map((d, i) => (
                      <Link
                        key={d.id}
                        to="/doctors"
                        className="topbar-search-item"
                        onClick={() => setSearchOpen(false)}
                      >
                        <span
                          className="initials"
                          style={{ background: palette[(i + 1) % palette.length] }}
                        >
                          {initialsOf(d.name)}
                        </span>
                        <span className="topbar-search-item-info">
                          <strong>{d.name}</strong>
                          <span>{d.specialization || d.departments?.name || 'Doctor'}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
          {dark ? <BiSun /> : <BiMoon />}
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
              <span>{getRoleLabel(role)}</span>
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
              {can('settings', 'view') && (
                <Link to="/settings" onClick={() => setMenuOpen(false)} role="menuitem">
                  <BiCog /> Settings
                </Link>
              )}
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