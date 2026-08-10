import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner.jsx';
import { fetchRecentDoctors } from '@/services/doctors.js';
import { statusClass } from '@/utils/status.js';
import WidgetHeader from './WidgetHeader.jsx';

const palette = ['#2563eb', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981'];

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function RecentDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRecentDoctors(5)
      .then((data) => {
        if (!cancelled) setDoctors(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load recent doctors:', err);
          setError('Unable to load recent doctors.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card widget">
      <WidgetHeader
        title="Recent Doctors"
        subtitle="Latest doctors on staff"
        action={
          <Link to="/doctors" className="btn-ghost">
            View all
          </Link>
        }
      />

      {loading ? (
        <div className="loader-center loader-center--padded">
          <Spinner />
        </div>
      ) : error ? (
        <p className="widget-empty muted">{error}</p>
      ) : doctors.length === 0 ? (
        <p className="widget-empty muted">No doctors added yet.</p>
      ) : (
        <ul className="patient-list">
          {doctors.map((d, i) => (
            <li key={d.id}>
              <span
                className="initials"
                style={{ background: palette[i % palette.length] }}
              >
                {initials(d.name)}
              </span>
              <div className="patient-info">
                <strong>{d.name}</strong>
                <span>{d.specialization || d.departments?.name || '—'}</span>
              </div>
              <div className="patient-meta">
                <span className={`status-badge ${statusClass(d.status || 'active')}`}>
                  {d.status || 'active'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecentDoctors;