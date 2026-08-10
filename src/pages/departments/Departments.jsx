import { useCallback, useEffect, useMemo, useState } from 'react';
import { BiClinic, BiEdit, BiPlus, BiSearch, BiTrash } from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import {
  addDepartment,
  deleteDepartment,
  fetchDepartmentsPage,
  getDepartmentStats,
  updateDepartment,
} from '@/services/departments.js';
import { fetchDoctors } from '@/services/doctors.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  description: '',
  color: '#2563eb',
  head_doctor_id: '',
};

const PRESET_COLORS = ['#2563eb', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899'];

const DEFAULT_STATS = { doctors: {}, appointments: {} };

function initials(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    Promise.all([fetchDoctors({ pageSize: 2000 }), getDepartmentStats()])
      .then(([docs, deptStats]) => {
        if (cancelled) return;
        setDoctors(docs.data ?? []);
        setStats(deptStats);
      })
      .catch((err) => console.error('Failed to load department options:', err));
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
    fetchDepartmentsPage({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
      .then(async ({ data, count: total }) => {
        if (cancelled) return;
        setDepartments(data);
        setCount(total);
        if (!debouncedSearch) {
          const deptStats = await getDepartmentStats();
          if (!cancelled) setStats(deptStats);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load departments:', err);
        setError(err?.message || 'Failed to load departments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count: total } = await fetchDepartmentsPage({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      setDepartments(data);
      setCount(total);
      if (!debouncedSearch) setStats(await getDepartmentStats());
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError(err?.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    open();
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name ?? '',
      description: d.description ?? '',
      color: d.color || '#2563eb',
      head_doctor_id: d.head_doctor_id ?? '',
    });
    open();
  };

  const handleField = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, created_by: editing ? undefined : user?.id };
      if (editing) {
        await updateDepartment(editing.id, payload);
      } else {
        await addDepartment(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save department:', err);
      setError(err?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteDepartment(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete department:', err);
      setError(err?.message || 'Failed to delete department.');
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
            <BiClinic className="page-title-icon" /> Departments
          </h1>
          <p className="welcome-sub">{count} departments — shared across all staff.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <BiPlus /> New Department
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
              placeholder="Search by name or description..."
            />
          </div>
          <div className="toolbar-count">{count} total</div>
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
                  <th>Department</th>
                  <th>Head Doctor</th>
                  <th>Doctors</th>
                  <th>Appointments</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell muted">
                      {debouncedSearch
                        ? 'No departments match your search.'
                        : 'No departments yet. Click "New Department" to add one.'}
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => {
                    const color = d.color || '#2563eb';
                    const doctorCount = stats.doctors[d.id] || 0;
                    const apptCount = stats.appointments[d.id] || 0;
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="cell-patient">
                            <span className="initials" style={{ background: `linear-gradient(135deg, ${color}, ${color})` }}>
                              {initials(d.name)}
                            </span>
                            <div className="patient-info">
                              <strong className="dept-name">
                                <span className="dept-color" style={{ background: color }} />
                                {d.name}
                              </strong>
                              <span>{d.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="strong">{d.doctors?.name || '—'}</td>
                        <td>
                          <span className="type-chip">{doctorCount} doctor{doctorCount === 1 ? '' : 's'}</span>
                        </td>
                        <td>
                          <span className="visit-chip">{apptCount} appt{apptCount === 1 ? '' : 's'}</span>
                        </td>
                        <td className="dept-desc muted">{d.description || '—'}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn--sm"
                              aria-label={`Edit ${d.name}`}
                              onClick={() => openEdit(d)}
                            >
                              <BiEdit />
                            </button>
                            <button
                              type="button"
                              className="icon-btn--sm icon-btn--sm-danger"
                              aria-label={`Delete ${d.name}`}
                              onClick={() => setDeleteTarget(d)}
                            >
                              <BiTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
        <Modal open onClose={close} header={editing ? 'Edit Department' : 'New Department'} blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Name *</span>
                  <input name="name" value={form.name} onChange={handleField} placeholder="e.g. Neurology" disabled={saving} required autoFocus />
                </label>
                <label className="form-field form-field--full">
                  <span>Head Doctor</span>
                  <select name="head_doctor_id" value={form.head_doctor_id} onChange={handleField} disabled={saving}>
                    <option value="">Select head doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name} — {doc.specialization || 'General'}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--full">
                  <span>Color</span>
                  <div className="color-field">
                    <input
                      type="color"
                      name="color"
                      value={form.color}
                      onChange={handleField}
                      className="color-input"
                      aria-label="Department color"
                    />
                    <div className="color-presets">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`color-swatch ${c === form.color ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setForm((f) => ({ ...f, color: c }))}
                          aria-label={`Use color ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </label>
                <label className="form-field form-field--full">
                  <span>Description</span>
                  <textarea name="description" value={form.description} onChange={handleField} rows={2} placeholder="e.g. Diagnosis and treatment of nervous system disorders" disabled={saving} />
                </label>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Department'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Department" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
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

export default Departments;