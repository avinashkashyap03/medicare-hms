import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiCalendarCheck, BiEdit, BiPlus, BiSearch, BiTrash } from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import {
  addAppointment,
  deleteAppointment,
  fetchAppointments,
  formatDate,
  formatTime,
  localDateString,
  updateAppointment,
} from '@/services/appointments.js';
import { fetchPatients } from '@/services/patients.js';
import { fetchDoctors } from '@/services/doctors.js';
import { fetchDepartments } from '@/services/departments.js';
import { statusClass, titleCase } from '@/utils/status.js';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const TYPE_OPTIONS = ['Consultation', 'Follow-up', 'Check-up', 'Procedure', 'Emergency'];

const EMPTY_FORM = {
  patient_id: '',
  doctor_id: '',
  department_id: '',
  date: '',
  time: '',
  type: 'Consultation',
  reason: '',
  status: 'scheduled',
  notes: '',
};

function initials(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isOpen, open, close } = useModal();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPatients({ pageSize: 2000 }),
      fetchDoctors({ pageSize: 2000 }),
      fetchDepartments(),
    ])
      .then(([p, d, depts]) => {
        if (cancelled) return;
        setPatients(p.data ?? []);
        setDoctors(d.data ?? []);
        setDepartments(depts ?? []);
      })
      .catch((err) => console.error('Failed to load form options:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== debouncedSearch) {
        setLoading(true);
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    fetchAppointments({
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
      status: filterStatus,
      date: filterDate,
    })
      .then(({ data, count: total }) => {
        if (cancelled) return;
        setAppointments(data);
        setCount(total);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load appointments:', err);
        setError(err?.message || 'Failed to load appointments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, filterStatus, filterDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count: total } = await fetchAppointments({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
        status: filterStatus,
        date: filterDate,
      });
      setAppointments(data);
      setCount(total);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(err?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, filterStatus, filterDate]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const changeFilter = (setter, value) => {
    setter(value);
    setLoading(true);
    setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: localDateString() });
    open();
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      patient_id: a.patient_id ?? '',
      doctor_id: a.doctor_id ?? '',
      department_id: a.department_id ?? '',
      date: a.date ?? '',
      time: a.time ? a.time.slice(0, 5) : '',
      type: a.type ?? 'Consultation',
      reason: a.reason ?? '',
      status: a.status ?? 'scheduled',
      notes: a.notes ?? '',
    });
    open();
  };

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      if (name === 'doctor_id') {
        const doctor = doctors.find((d) => d.id === value);
        return { ...f, doctor_id: value, department_id: doctor?.department_id ?? '' };
      }
      return { ...f, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.doctor_id || !form.date || !form.time) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, created_by: editing ? undefined : user?.id };
      if (editing) {
        await updateAppointment(editing.id, payload);
      } else {
        await addAppointment(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save appointment:', err);
      setError(err?.message || 'Failed to save appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (appointment, status) => {
    if (!appointment || status === appointment.status) return;
    try {
      await updateAppointment(appointment.id, { status });
      await load();
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      setError(err?.message || 'Failed to update appointment status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteAppointment(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      setError(err?.message || 'Failed to delete appointment.');
    } finally {
      setSaving(false);
    }
  };

  const pageOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= totalPages; i += 1) opts.push(i);
    return opts;
  }, [totalPages]);

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiCalendarCheck className="page-title-icon" /> Appointments
          </h1>
          <p className="welcome-sub">{count} appointment records — shared across all staff.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <BiPlus /> New Appointment
        </button>
      </section>

      {error && <div className="page-alert page-alert--danger">{error}</div>}

      <section className="card widget">
        <div className="toolbar-row">
          <div className="toolbar-search">
            <BiSearch />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Search by patient, doctor, type, reason..."
            />
          </div>
          <div className="toolbar-filters">
            <input
              type="date"
              className="toolbar-filter"
              value={filterDate}
              onChange={(e) => changeFilter(setFilterDate, e.target.value)}
              aria-label="Filter by date"
            />
            <select
              className="toolbar-filter"
              value={filterStatus}
              onChange={(e) => changeFilter(setFilterStatus, e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </select>
            <span className="toolbar-count">{count} total</span>
          </div>
        </div>

        {loading ? (
          <div className="loader-center loader-center--padded">
            <Spinner />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell muted">
                      {debouncedSearch || filterDate || filterStatus
                        ? 'No appointments match your filters.'
                        : 'No appointments yet. Click "New Appointment" to add one.'}
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="cell-patient">
                          <span className="initials">{initials(a.patients?.name)}</span>
                          <div className="patient-info">
                            <strong>{a.patients?.name || '—'}</strong>
                            <span>{a.patients?.mrn || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="strong">{a.doctors?.name || '—'}</td>
                      <td>
                        {a.departments ? (
                          <Link to="/departments" className="cell-link">{a.departments.name}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="strong">{formatDate(a.date)}</td>
                      <td>{formatTime(a.time)}</td>
                      <td>
                        <span className="type-chip">{a.type || 'General'}</span>
                      </td>
                      <td>
                        <select
                          className={`status-select status-select--${statusClass(a.status || 'scheduled')}`}
                          value={String(a.status || 'scheduled')}
                          onChange={(e) => handleStatusChange(a, e.target.value)}
                          aria-label={`Status for ${a.patients?.name || 'appointment'}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{titleCase(s)}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn--sm"
                            aria-label={`Edit ${a.patients?.name || 'appointment'}`}
                            onClick={() => openEdit(a)}
                          >
                            <BiEdit />
                          </button>
                          <button
                            type="button"
                            className="icon-btn--sm icon-btn--sm-danger"
                            aria-label="Delete appointment"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <BiTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="btn-ghost"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
            >
              Prev
            </button>
            <div className="pagination-pages">
              {pageOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pagination-page ${n === page ? 'active' : ''}`}
                  onClick={() => {
                    setLoading(true);
                    setPage(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= totalPages}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {isOpen && (
        <Modal open onClose={close} header={editing ? 'Edit Appointment' : 'New Appointment'} blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Patient *</span>
                  <select name="patient_id" value={form.patient_id} onChange={handleField} disabled={saving} required>
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Doctor *</span>
                  <select name="doctor_id" value={form.doctor_id} onChange={handleField} disabled={saving} required>
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialization || 'General'}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Department</span>
                  <input
                    value={
                      departments.find((d) => d.id === form.department_id)?.name ||
                      (form.department_id ? form.department_id : '')
                    }
                    readOnly
                    placeholder="Auto-set from doctor"
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{titleCase(s)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Date *</span>
                  <input type="date" name="date" value={form.date} onChange={handleField} disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Time *</span>
                  <input type="time" name="time" value={form.time} onChange={handleField} disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Type</span>
                  <select name="type" value={form.type} onChange={handleField} disabled={saving}>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Reason</span>
                  <input name="reason" value={form.reason} onChange={handleField} placeholder="e.g. Chest pain follow-up" disabled={saving} />
                </label>
                <label className="form-field form-field--full">
                  <span>Notes</span>
                  <textarea name="notes" value={form.notes} onChange={handleField} rows={2} placeholder="Additional notes..." disabled={saving} />
                </label>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Appointment'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Appointment" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete the appointment for <strong>{deleteTarget.patients?.name}</strong> with{' '}
            <strong>{deleteTarget.doctors?.name}</strong> on <strong>{formatDate(deleteTarget.date)}</strong>?
            This action cannot be undone.
          </p>
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Appointments;