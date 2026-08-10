import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner.jsx';
import { fetchRecentPatients } from '@/services/patients.js';
import WidgetHeader from './WidgetHeader.jsx';

const palette = ['#2563eb', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981'];

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

function getAge(dob) {
  if (!dob) return '—';
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return Number.isNaN(age) ? '—' : `${age} yrs`;
}

function RecentPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRecentPatients(5)
      .then((data) => {
        if (!cancelled) setPatients(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load recent patients:', err);
          setError('Unable to load recent patients.');
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
        title="Recent Patients"
        subtitle="Recently registered patients"
        action={
          <Link to="/patients" className="btn-ghost">
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
      ) : patients.length === 0 ? (
        <p className="widget-empty muted">No patients registered yet.</p>
      ) : (
        <ul className="patient-list">
          {patients.map((p, i) => (
            <li key={p.id}>
              <span
                className="initials"
                style={{ background: palette[i % palette.length] }}
              >
                {initials(p.name)}
              </span>
              <div className="patient-info">
                <strong>{p.name}</strong>
                <span>
                  {p.gender || '—'} · {getAge(p.dob)} · {p.mrn}
                </span>
              </div>
              <div className="patient-meta">
                <span className="visit-chip">{p.blood_group || '—'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecentPatients;