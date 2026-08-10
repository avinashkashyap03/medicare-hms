import { Link } from 'react-router-dom';
import {
  BiDollar,
  BiCalendarCheck,
  BiFirstAid,
  BiSolidCapsule,
  BiUserPlus,
} from 'react-icons/bi';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import Sparkline from './Sparkline.jsx';

const iconMap = {
  patients: BiUserPlus,
  doctors: BiFirstAid,
  appointments: BiCalendarCheck,
  revenue: BiDollar,
  pharmacy: BiSolidCapsule,
};

// Theme-aware colors: reference the design tokens so they adapt in dark mode.
const colorMap = {
  blue: 'var(--db-primary)',
  violet: 'var(--db-violet)',
  info: 'var(--db-info)',
  success: 'var(--db-success)',
  amber: 'var(--db-warning)',
};

const softMap = {
  blue: 'var(--db-primary-soft)',
  violet: 'var(--db-violet-soft)',
  info: 'var(--db-info-soft)',
  success: 'var(--db-success-soft)',
  amber: 'var(--db-warning-soft)',
};

function StatCard({ stat }) {
  const Icon = iconMap[stat.id] || BiUserPlus;
  const color = colorMap[stat.color] || 'var(--db-primary)';
  const soft = softMap[stat.color] || 'var(--db-primary-soft)';
  const up = stat.delta >= 0;

  const inner = (
    <>
      <div className="stat-card-top">
        <span className="stat-icon" style={{ color, background: soft }}>
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
    </>
  );

  if (stat.to) {
    return (
      <Link to={stat.to} className="card stat-card stat-link" style={{ '--c': color }}>
        {inner}
      </Link>
    );
  }

  return (
    <article className="card stat-card" style={{ '--c': color }}>
      {inner}
    </article>
  );
}

export default StatCard;