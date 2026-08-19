import { Link } from 'react-router-dom';
import {
  BiCalendarPlus,
  BiDollarCircle,
  BiFirstAid,
  BiSolidCapsule,
  BiUserPlus,
} from 'react-icons/bi';
import { FiArrowUpRight } from 'react-icons/fi';
import WidgetHeader from './WidgetHeader.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

const actions = [
  { label: 'Add Patient', desc: 'Register a new patient', icon: BiUserPlus, color: 'blue', to: '/patients', module: 'patients', action: 'create' },
  { label: 'Add Doctor', desc: 'Onboard a new doctor', icon: BiFirstAid, color: 'violet', to: '/doctors', module: 'doctors', action: 'create' },
  { label: 'New Appointment', desc: 'Schedule an appointment', icon: BiCalendarPlus, color: 'info', to: '/appointments', module: 'appointments', action: 'create' },
  { label: 'Generate Invoice', desc: 'Create a patient invoice', icon: BiDollarCircle, color: 'success', to: '/billing', module: 'billing', action: 'create' },
  { label: 'Manage Pharmacy', desc: 'Add or restock medicines', icon: BiSolidCapsule, color: 'info', to: '/pharmacy', module: 'pharmacy', action: 'create' },
];

function QuickActions() {
  const { can } = useAuth();
  const visibleActions = actions.filter((a) => can(a.module, a.action));

  return (
    <section className="card widget">
      <WidgetHeader title="Quick Actions" subtitle="Common tasks & shortcuts" />

      <div className="quick-grid">
        {visibleActions.map((a) => {
          const Icon = a.icon;
          const baseProps = {
            key: a.label,
            className: `quick-action ${a.color}`,
            'aria-label': a.label,
          };
          return a.to ? (
            <Link {...baseProps} to={a.to}>
              <span className="quick-icon">
                <Icon />
                <FiArrowUpRight className="quick-arrow" />
              </span>
              <strong>{a.label}</strong>
              <span>{a.desc}</span>
            </Link>
          ) : (
            <button type="button" {...baseProps}>
              <span className="quick-icon">
                <Icon />
                <FiArrowUpRight className="quick-arrow" />
              </span>
              <strong>{a.label}</strong>
              <span>{a.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;