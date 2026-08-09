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
  BiSolidClinic,
  BiUser,
  BiUserCircle,
} from 'react-icons/bi';
import { useAuth } from '@/context/AuthContext.jsx';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: BiBarChartAlt },
      { to: '/patients', label: 'Patients', icon: BiUser },
      { to: '/doctors', label: 'Doctors', icon: BiFirstAid },
      { to: '/appointments', label: 'Appointments', icon: BiCalendarCheck },
      { to: '/departments', label: 'Departments', icon: BiClinic },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/billing', label: 'Billing & Invoice', icon: BiDollarCircle, badge: 4 },
      { to: '/inventory', label: 'Inventory', icon: BiBox },
      { to: '/staff', label: 'Staff', icon: BiUserCircle },
      { to: '/reports', label: 'Reports', icon: BiBarChart },
    ],
  },
];

function Sidebar({ open, onClose }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="sidebar-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
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
                  {item.badge && <span className="badge-dot">{item.badge}</span>}
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