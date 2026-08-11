import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '@/components/ui/Spinner.jsx';
import { fetchTodaysAppointments, formatTime } from '@/services/appointments.js';
import { statusClass } from '@/utils/status.js';
import WidgetHeader from './WidgetHeader.jsx';

function AppointmentsTable() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTodaysAppointments(12)
      .then((data) => {
        if (!cancelled) setAppointments(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load today\'s appointments:', err);
          setError('Unable to load today\'s appointments.');
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
        title="Today's Appointments"
        subtitle="Scheduled appointments for today"
        action={
          <Link to="/appointments" className="btn-ghost">
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
      ) : appointments.length === 0 ? (
        <p className="widget-empty muted">No appointments scheduled for today.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const status = String(a.status || 'scheduled');
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-patient">
                        <div className="patient-info">
                          <strong>{a.patients?.name || '—'}</strong>
                          <span className="cell-sub">{a.patients?.mrn || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>{a.doctors?.name || '—'}</td>
                    <td>{formatTime(a.time)}</td>
                    <td>
                      <span className="type-chip">{a.type || 'General'}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(status || 'scheduled')}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AppointmentsTable;