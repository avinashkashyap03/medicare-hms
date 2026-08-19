import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BiBarChart,
  BiBarChartAlt,
  BiBox,
  BiCalendarCheck,
  BiClinic,
  BiDollarCircle,
  BiFirstAid,
  BiLogOut,
  BiSolidCapsule,
  BiSolidClinic,
  BiUser,
  BiUserCircle,
} from 'react-icons/bi';
import { useAuth } from '@/context/AuthContext.jsx';
import { getPendingInvoiceCount, subscribePendingCount } from '@/services/billing.js';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: BiBarChartAlt },
      { to: '/patients', label: 'Patients', icon: BiUser, module: 'patients' },
      { to: '/doctors', label: 'Doctors', icon: BiFirstAid, module: 'doctors' },
      { to: '/appointments', label: 'Appointments', icon: BiCalendarCheck, module: 'appointments' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/departments', label: 'Departments', icon: BiClinic, module: 'departments' },
      { to: '/billing', label: 'Billing & Invoice', icon: BiDollarCircle, module: 'billing' },
      { to: '/inventory', label: 'Inventory', icon: BiBox, module: 'inventory' },
      { to: '/pharmacy', label: 'Pharmacy', icon: BiSolidCapsule, module: 'pharmacy' },
      { to: '/staff', label: 'Staff', icon: BiUserCircle, module: 'staff' },
      { to: '/reports', label: 'Reports', icon: BiBarChart, module: 'reports' },
    ],
  },
];

function Sidebar({ open, onClose }) {
  const { signOut, can } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const canViewBilling = can('billing', 'view');

  useEffect(() => {
    if (!canViewBilling) return undefined;
    let cancelled = false;
    const refresh = () => {
      getPendingInvoiceCount()
        .then((count) => {
          if (!cancelled) setPendingCount(count);
        })
        .catch((err) => {
          console.error('Failed to load pending invoice count:', err);
          if (!cancelled) setPendingCount(0);
        });
    };
    refresh();
    const unsubscribe = subscribePendingCount(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [canViewBilling]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.module || can(item.module, 'view')),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <NavLink to="/dashboard" className="sidebar-brand">
        <span className="sidebar-brand-logo">
          <BiSolidClinic />
        </span>
        <span className="sidebar-brand-text">
          MediCare <em>HMS</em>
        </span>
      </NavLink>

      <nav className="sidebar-nav">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="sidebar-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const badge = item.to === '/billing' ? pendingCount : item.badge;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  end={item.to === '/dashboard'}
                >
                  <Icon />
                  <span>{item.label}</span>
                  {badge > 0 && <span className="badge-dot">{badge}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-signout" onClick={handleSignOut}>
          <BiLogOut /> Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;