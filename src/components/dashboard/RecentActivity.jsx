import {
  BiBed,
  BiCalendarPlus,
  BiDollarCircle,
  BiTestTube,
  BiUserPlus,
} from 'react-icons/bi';
import { recentActivity } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

const iconMap = {
  appointment: BiCalendarPlus,
  patient: BiUserPlus,
  lab: BiTestTube,
  invoice: BiDollarCircle,
  bed: BiBed,
};

function RecentActivity() {
  return (
    <section className="card widget activity-widget">
      <WidgetHeader
        title="Recent Activity"
        subtitle="Latest actions across the system"
        action={
          <button type="button" className="btn-ghost">
            View all
          </button>
        }
      />

      <ul className="activity-list">
        {recentActivity.map((a, i) => {
          const Icon = iconMap[a.icon] || BiUserPlus;
          return (
            <li key={i}>
              <span className={`activity-icon ${a.color}`}>
                <Icon />
              </span>
              <div className="activity-content">
                <p>{a.text}</p>
                <span>{a.time}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default RecentActivity;