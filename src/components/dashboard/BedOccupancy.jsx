import { bedOccupancy } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

const R = 54;
const CIRC = 2 * Math.PI * R;

function BedOccupancy() {
  const avg = Math.round(bedOccupancy.reduce((s, d) => s + d.used, 0) / bedOccupancy.reduce((s, d) => s + d.total, 0) * 100);

  return (
    <section className="card widget bed-widget">
      <WidgetHeader
        title="Bed Occupancy"
        subtitle="Live hospital bed usage"
        action={
          <button type="button" className="btn-ghost">
            View all
          </button>
        }
      />

      <div className="bed-body">
        <div className="bed-ring">
          <svg viewBox="0 0 140 140" className="bed-svg" role="img" aria-label={`Bed occupancy: ${avg}% of beds occupied`}>
            <circle cx="70" cy="70" r={R} fill="none" strokeWidth="13" className="donut-track" />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="url(#bed-grad)"
              strokeWidth="13"
              strokeDasharray={`${(avg / 100) * CIRC} ${CIRC}`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              className="bed-progress"
            />
            <defs>
              <linearGradient id="bed-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="bed-ring-center">
            <strong>{avg}%</strong>
            <span>Occupied</span>
          </div>
        </div>

        <div className="bed-list">
          {bedOccupancy.map((d) => {
            const pct = Math.round((d.used / d.total) * 100);
            return (
              <div key={d.ward} className="bed-item">
                <div className="bed-item-row">
                  <span>{d.ward}</span>
                  <strong>
                    {d.used}/{d.total}
                  </strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BedOccupancy;