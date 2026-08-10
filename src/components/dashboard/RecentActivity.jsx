import { Link } from 'react-router-dom';
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
    <section className="card widget">
      <WidgetHeader
        title="Recent Activity"
        subtitle="Latest actions across the system"
      />

      <ul className="activity-list">
        {recentActivity.map((a, i) => {
          const Icon = iconMap[a.icon] || BiUserPlus;
          const inner = (
            <>
              <span className={`activity-icon ${a.color}`}>
                <Icon />
              </span>
              <div className="activity-content">
                <p>{a.text}</p>
                <span>{a.time}</span>
              </div>
            </>
          );
          return <li key={i}>{a.icon === 'invoice' ? <Link to="/billing" className="activity-link">{inner}</Link> : inner}</li>;
        })}
      </ul>
    </section>
  );
}

export default RecentActivity;