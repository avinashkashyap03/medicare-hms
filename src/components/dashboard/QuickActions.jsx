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

const actions = [
  { label: 'Add Patient', desc: 'Register a new patient', icon: BiUserPlus, color: 'blue', to: '/patients' },
  { label: 'Add Doctor', desc: 'Onboard a new doctor', icon: BiFirstAid, color: 'violet', to: '/doctors' },
  { label: 'New Appointment', desc: 'Schedule an appointment', icon: BiCalendarPlus, color: 'info', to: '/appointments' },
  { label: 'Generate Invoice', desc: 'Create a patient invoice', icon: BiDollarCircle, color: 'success', to: '/billing' },
  { label: 'Manage Pharmacy', desc: 'Add or restock medicines', icon: BiSolidCapsule, color: 'info', to: '/pharmacy' },
];

function QuickActions() {
  return (
    <section className="card widget">
      <WidgetHeader title="Quick Actions" subtitle="Common tasks & shortcuts" />

      <div className="quick-grid">
        {actions.map((a) => {
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