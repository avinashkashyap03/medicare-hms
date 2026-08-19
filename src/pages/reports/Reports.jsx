import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BiBarChart,
  BiCalendarCheck,
  BiDollarCircle,
  BiFirstAid,
  BiUser,
} from 'react-icons/bi';
import Spinner from '@/components/ui/Spinner.jsx';
import WidgetHeader from '@/components/dashboard/WidgetHeader.jsx';
import { titleCase } from '@/utils/status.js';
import { fetchReportSummary } from '@/services/reports.js';

const R = 62;
const CIRC = 2 * Math.PI * R;

function printPage() {
  window.print();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Donut({ segments, total, centerLabel }) {
  const slices = segments.reduce((acc, d) => {
    const len = total > 0 ? (d.value / total) * CIRC : 0;
    const offset = acc.reduce((s, x) => s + x.len, 0);
    return [...acc, { ...d, len, offset: -offset }];
  }, []);

  return (
    <div className="donut-body">
      <div className="donut-chart">
        <svg viewBox="0 0 160 160" className="donut-svg" role="img" aria-label={`${centerLabel}: ${segments.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
          <circle cx="80" cy="80" r={R} fill="none" strokeWidth="16" className="donut-track" />
          {slices.map((d) => (
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
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((d) => (
          <div key={d.label} className="donut-legend-item">
            <span className="legend-color" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reports() {
  const [totals, setTotals] = useState(null);
  const [billing, setBilling] = useState(null);
  const [apptStatus, setApptStatus] = useState([]);
  const [deptAppts, setDeptAppts] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchReportSummary()
      .then((s) => {
        if (cancelled) return;
        setTotals(s.totals);
        setBilling(s.billing);
        setApptStatus(s.appointmentsByStatus);
        setDeptAppts(s.appointmentsByDepartment);
        setRevenue(s.revenue);
        setTopDoctors(s.topDoctors);
        setInventoryStatus(s.inventoryStatus);
        setRecentInvoices(s.recentInvoices);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load reports:', err);
        setError(err?.message || 'Failed to load reports.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apptTotal = useMemo(() => apptStatus.reduce((s, d) => s + d.value, 0), [apptStatus]);
  const invTotal = useMemo(() => inventoryStatus.reduce((s, d) => s + d.value, 0), [inventoryStatus]);
  const maxDeptAppts = useMemo(
    () => deptAppts.reduce((m, d) => Math.max(m, d.count), 0),
    [deptAppts]
  );
  const maxDoctorCount = useMemo(
    () => topDoctors.reduce((m, d) => Math.max(m, d.count), 0),
    [topDoctors]
  );

  if (loading) {
    return (
      <main className="content">
        <div className="loader-center loader-center--padded">
          <Spinner />
        </div>
      </main>
    );
  }

  const summaryCards = [
    { label: 'Total Patients', value: totals?.patients ?? 0, color: 'info', icon: BiUser, to: '/patients' },
    { label: 'Total Appointments', value: totals?.appointments ?? 0, color: 'warning', icon: BiCalendarCheck, to: '/appointments' },
    { label: 'Doctors', value: totals?.doctors ?? 0, color: 'success', icon: BiFirstAid, to: '/doctors' },
    { label: 'Revenue Collected', value: formatCurrency(billing?.collected ?? 0), color: 'danger', icon: BiDollarCircle, to: '/billing' },
  ];

  return (
    <main className="content print-area">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiBarChart className="page-title-icon" /> Reports
          </h1>
          <p className="welcome-sub">Live operational insights across patients, appointments and revenue.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={printPage}>
          Print Report
        </button>
      </section>

      {error && <div className="page-alert page-alert--danger">{error}</div>}

      <section className="inv-summary">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} className="card inv-summary-card reports-summary-link">
              <span className={`inv-summary-icon ${c.color}`}>
                <Icon />
              </span>
              <div>
                <p className="inv-summary-label">{c.label}</p>
                <strong className="inv-summary-value">{c.value}</strong>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="dash-grid reports-grid">
        <div className="dash-span-2">
          <section className="card widget">
            <WidgetHeader
              title="Revenue by Status"
              subtitle="Invoice totals grouped by current status"
              action={
                <Link to="/billing" className="btn-ghost">Details</Link>
              }
            />
            {revenue.length === 0 ? (
              <p className="muted reports-empty">No invoice data yet.</p>
            ) : (
              <div className="reports-bars">
                {revenue.map((d) => {
                  const max = Math.max(...revenue.map((r) => r.amount));
                  const pct = max > 0 ? (d.amount / max) * 100 : 0;
                  return (
                    <div key={d.status} className="reports-bar-row">
                      <div className="reports-bar-label">
                        <span>{d.label}</span>
                        <strong>{formatCurrency(d.amount)} <em className="muted">({d.count})</em></strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="card widget">
          <WidgetHeader title="Appointments by Status" subtitle="Distribution of all appointments" />
          {apptStatus.length === 0 ? (
            <p className="muted reports-empty">No appointments yet.</p>
          ) : (
            <Donut segments={apptStatus} total={apptTotal} centerLabel="Appointments" />
          )}
        </section>

        <div className="dash-span-2">
          <section className="card widget">
            <WidgetHeader title="Appointments by Department" subtitle="Volume of appointments per department" />
            {deptAppts.length === 0 ? (
              <p className="muted reports-empty">No department appointments yet.</p>
            ) : (
              <div className="reports-bars">
                {deptAppts.map((d) => {
                  const pct = maxDeptAppts > 0 ? (d.count / maxDeptAppts) * 100 : 0;
                  return (
                    <div key={d.id} className="reports-bar-row">
                      <div className="reports-bar-label">
                        <span><i className="dept-dot" style={{ background: d.color }} />{d.name}</span>
                        <strong>{d.count}</strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="card widget">
          <WidgetHeader title="Top Doctors" subtitle="Most appointments handled" />
          {topDoctors.length === 0 ? (
            <p className="muted reports-empty">No doctor activity yet.</p>
          ) : (
            <div className="reports-bars">
              {topDoctors.map((d) => {
                const pct = maxDoctorCount > 0 ? (d.count / maxDoctorCount) * 100 : 0;
                return (
                  <div key={d.id} className="reports-bar-row">
                    <div className="reports-bar-label">
                      <span>{d.name} {d.specialization && <em className="muted">· {d.specialization}</em>}</span>
                      <strong>{d.count}</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card widget">
          <WidgetHeader title="Inventory Status" subtitle="Stock health across all items" />
          {inventoryStatus.length === 0 ? (
            <p className="muted reports-empty">No inventory data yet.</p>
          ) : (
            <Donut segments={inventoryStatus} total={invTotal} centerLabel="Items" />
          )}
        </section>

        <div className="dash-span-2">
          <section className="card widget">
            <WidgetHeader
              title="Latest Invoices"
              subtitle="Most recently created invoices"
              action={<Link to="/billing" className="btn-ghost">View all</Link>}
            />
            {recentInvoices.length === 0 ? (
              <p className="muted reports-empty">No invoices yet.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="strong">{inv.invoice_no}</td>
                        <td>{inv.patients?.name || '—'}</td>
                        <td>{formatDate(inv.created_at)}</td>
                        <td className="strong">{formatCurrency(inv.total)}</td>
                        <td>
                          <span className={`status-badge stock-badge ${String(inv.status || 'pending').toLowerCase()}`}>
                            {titleCase(inv.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default Reports;
