import {
  BiDollar,
  BiCalendarCheck,
  BiFirstAid,
  BiUserPlus,
} from 'react-icons/bi';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import Sparkline from './Sparkline.jsx';

const iconMap = {
  patients: BiUserPlus,
  doctors: BiFirstAid,
  appointments: BiCalendarCheck,
  revenue: BiDollar,
};

const colorMap = {
  blue: '#2563eb',
  violet: '#8b5cf6',
  info: '#0ea5e9',
  success: '#10b981',
  amber: '#f59e0b',
};

function StatCard({ stat }) {
  const Icon = iconMap[stat.id] || BiUserPlus;
  const color = colorMap[stat.color] || '#2563eb';
  const up = stat.delta >= 0;

  return (
    <article className="card stat-card" style={{ '--c': color }}>
      <div className="stat-card-top">
        <span className="stat-icon" style={{ color, background: `${color}1f` }}>
          <Icon />
        </span>
        <span className={`stat-trend ${up ? 'up' : 'down'}`}>
          {up ? <FiArrowUpRight /> : <FiArrowDownRight />}
          {Math.abs(stat.delta)}%
        </span>
      </div>
      <div className="stat-card-bottom">
        <div>
          <p className="stat-label">{stat.label}</p>
          <h2 className="stat-value">{stat.value}</h2>
        </div>
        <Sparkline data={stat.spark} color={color} />
      </div>
      <span className="stat-hint">vs last month</span>
    </article>
  );
}

export default StatCard;