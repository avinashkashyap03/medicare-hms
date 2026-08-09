import { appointmentStatus } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

const R = 62;
const CIRC = 2 * Math.PI * R;

function AppointmentDonut() {
  const total = appointmentStatus.reduce((s, d) => s + d.value, 0);
  const segments = [];
  let acc = 0;
  appointmentStatus.forEach((d) => {
    const len = (d.value / total) * CIRC;
    segments.push({ ...d, len, offset: -acc });
    acc += len;
  });

  return (
    <section className="card widget donut-widget">
      <WidgetHeader
        title="Appointment Status"
        subtitle="Distribution by current status"
        action={
          <button type="button" className="btn-ghost">
            Details
          </button>
        }
      />

      <div className="donut-body">
        <div className="donut-chart">
          <svg
            viewBox="0 0 160 160"
            className="donut-svg"
            role="img"
            aria-label={`Appointment status: ${appointmentStatus
              .map((d) => `${d.label} ${d.value}%`)
              .join(', ')}`}
          >
            <circle cx="80" cy="80" r={R} fill="none" strokeWidth="16" className="donut-track" />
            {segments.map((d) => (
              <circle
                key={d.label}
                  cx="80"
                  cy="80"
                  r={R}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="16"
strokeDasharray={`${d.len} ${CIRC - d.len}`}
                strokeDashoffset={d.offset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                className="donut-segment"
              />
            ))}
          </svg>
          <div className="donut-center">
            <strong>{total}</strong>
            <span>Appointments</span>
          </div>
        </div>

        <div className="donut-legend">
          {appointmentStatus.map((d) => (
            <div key={d.label} className="donut-legend-item">
              <span className="legend-color" style={{ background: d.color }} />
              <span className="legend-label">{d.label}</span>
              <span className="legend-value">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AppointmentDonut;