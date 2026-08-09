import {
  BiCalendarPlus,
  BiDollarCircle,
  BiFirstAid,
  BiUserPlus,
} from 'react-icons/bi';
import { FiArrowUpRight } from 'react-icons/fi';
import WidgetHeader from './WidgetHeader.jsx';

const actions = [
  { label: 'Add Patient', desc: 'Register a new patient', icon: BiUserPlus, color: 'blue' },
  { label: 'Add Doctor', desc: 'Onboard a new doctor', icon: BiFirstAid, color: 'violet' },
  { label: 'New Appointment', desc: 'Schedule an appointment', icon: BiCalendarPlus, color: 'info' },
  { label: 'Generate Invoice', desc: 'Create a patient invoice', icon: BiDollarCircle, color: 'success' },
];

function QuickActions() {
  return (
    <section className="card widget quick-widget">
      <WidgetHeader title="Quick Actions" subtitle="Common tasks & shortcuts" />

      <div className="quick-grid">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button type="button" key={a.label} className={`quick-action ${a.color}`}>
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