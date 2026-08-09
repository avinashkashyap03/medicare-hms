import { BiDotsVerticalRounded } from 'react-icons/bi';
import { recentPatients } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

function RecentPatients() {
  return (
    <section className="card widget list-widget">
      <WidgetHeader
        title="Recent Patients"
        subtitle="Recently registered patients"
        action={
          <button type="button" className="btn-ghost">
            View all
          </button>
        }
      />

      <ul className="patient-list">
        {recentPatients.map((p) => (
          <li key={p.id}>
            <span className="initials" style={{ background: p.color }}>
              {initials(p.name)}
            </span>
            <div className="patient-info">
              <strong>{p.name}</strong>
              <span>
                {p.gender} · {p.age} yrs · {p.dept}
              </span>
            </div>
            <div className="patient-meta">
              <span className="visit-chip">{p.visit}</span>
              <button type="button" className="icon-btn--sm" aria-label={`Options for ${p.name}`}>
                <BiDotsVerticalRounded />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default RecentPatients;