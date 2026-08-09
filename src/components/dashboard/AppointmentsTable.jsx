import { todaysAppointments } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

function statusClass(status) {
  return status.toLowerCase().replace(' ', '-');
}

function AppointmentsTable() {
  return (
    <section className="card widget table-widget">
      <WidgetHeader
        title="Today's Appointments"
        subtitle="Scheduled appointments for today"
        action={
          <button type="button" className="btn-ghost">
            View all
          </button>
        }
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Appointment</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Time</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {todaysAppointments.map((a) => (
              <tr key={a.id}>
                <td className="muted">{a.id}</td>
                <td className="strong">{a.patient}</td>
                <td>{a.doctor}</td>
                <td>{a.time}</td>
                <td>
                  <span className="type-chip">{a.type}</span>
                </td>
                <td>
                  <span className={`status-badge ${statusClass(a.status)}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AppointmentsTable;