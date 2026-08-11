import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BiEdit,
  BiGroup,
  BiPlus,
  BiSearch,
  BiTrash,
  BiUserCircle,
  BiUserCheck,
  BiUserX,
} from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import { titleCase } from '@/utils/status.js';
import { fetchDepartments } from '@/services/departments.js';
import {
  STAFF_STATUS_OPTIONS,
  addStaff,
  deleteStaff,
  fetchStaffPage,
  getStaffStats,
  updateStaff,
} from '@/services/staff.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  designation: '',
  department_id: '',
  phone: '',
  email: '',
  shift: '',
  salary: '',
  hire_date: '',
  status: 'active',
};

const DEFAULT_STATS = { total: 0, active: 0, onLeave: 0, inactive: 0 };

function initials(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value || 0)
  );
}

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Staff() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isOpen, open, close } = useModal();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const aliveRef = useRef(true);
  const seqRef = useRef(0);

  // Unmount safety: prevents state updates after the page unmounts.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Small option list for the filter/form — fetched once.
  useEffect(() => {
    let cancelled = false;
    fetchDepartments()
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .catch((err) => console.error('Failed to load departments:', err));
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

  // Single source of truth for fetching — used on mount (via the effect
  // below) and after every mutation. `seqRef` guards against stale
  // responses racing ahead of newer requests. Stats always refresh so
  // the summary cards stay in sync even while filters are active.
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    const [pageRes, statsRes] = await Promise.allSettled([
      fetchStaffPage({ search: debouncedSearch, page, pageSize: PAGE_SIZE, department: filterDept }),
      getStaffStats(),
    ]);
    if (seq !== seqRef.current || !aliveRef.current) return;
    if (pageRes.status === 'fulfilled') {
      setStaffList(pageRes.value.data);
      setCount(pageRes.value.count);
    } else {
      console.error('Failed to load staff:', pageRes.reason);
      setError(pageRes.reason?.message || 'Failed to load staff.');
    }
    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value);
    } else {
      console.error('Failed to load staff stats:', statsRes.reason);
    }
    setLoading(false);
  }, [debouncedSearch, page, filterDept]);

  useEffect(() => {
    // Deferred so the initial fetch doesn't call setState synchronously
    // inside the effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const changeFilter = (setter, value) => {
    setter(value);
    setLoading(true);
    setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    open();
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: member.name ?? '',
      designation: member.designation ?? '',
      department_id: member.department_id ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      shift: member.shift ?? '',
      salary: member.salary ? String(member.salary) : '',
      hire_date: member.hire_date ? member.hire_date.slice(0, 10) : '',
      status: member.status ?? 'active',
    });
    open();
  };

  const handleField = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.designation.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        department_id: form.department_id || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        shift: form.shift.trim() || null,
        salary: form.salary === '' ? null : Number(form.salary),
        hire_date: form.hire_date || null,
        status: form.status,
        created_by: editing ? undefined : user?.id,
      };
      if (editing) {
        await updateStaff(editing.id, payload);
      } else {
        await addStaff(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save staff member:', err);
      setError(err?.message || 'Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteStaff(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete staff member:', err);
      setError(err?.message || 'Failed to delete staff member.');
    } finally {
      setSaving(false);
    }
  };

  const pageOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= totalPages; i += 1) opts.push(i);
    return opts;
  }, [totalPages]);

  const summaryCards = [
    { label: 'Total Staff', value: stats.total, color: 'info', icon: BiGroup },
    { label: 'Active', value: stats.active, color: 'success', icon: BiUserCheck },
    { label: 'On Leave', value: stats.onLeave, color: 'warning', icon: BiUserCircle },
    { label: 'Inactive', value: stats.inactive, color: 'danger', icon: BiUserX },
  ];

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiUserCircle className="page-title-icon" /> Staff
          </h1>
          <p className="welcome-sub">{count} staff records — shared across all departments.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <BiPlus /> New Staff
        </button>
      </section>

      <section className="inv-summary">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card inv-summary-card">
              <span className={`inv-summary-icon ${c.color}`}>
                <Icon />
              </span>
              <div>
                <p className="inv-summary-label">{c.label}</p>
                <strong className="inv-summary-value">{c.value}</strong>
              </div>
            </div>
          );
        })}
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
              placeholder="Search by name, designation, phone or email..."
            />
          </div>
          <div className="toolbar-filters">
            <select
              className="toolbar-filter"
              value={filterDept}
              onChange={(e) => changeFilter(setFilterDept, e.target.value)}
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
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
                  <th>Staff</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Shift</th>
                  <th>Contact</th>
                  <th>Salary</th>
                  <th>Hire Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-cell muted">
                      {debouncedSearch || filterDept
                        ? 'No staff match your filters.'
                        : 'No staff yet. Click "New Staff" to add one.'}
                    </td>
                  </tr>
                ) : (
                  staffList.map((member) => {
                    const color = member.departments?.color || '#2563eb';
                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="cell-patient">
                            <span className="initials" style={{ background: color }}>
                              {initials(member.name)}
                            </span>
                            <div className="patient-info">
                              <strong>{member.name}</strong>
                              <span>{member.email || member.phone || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="strong">{member.designation}</td>
                        <td>{member.departments?.name || '—'}</td>
                        <td>{member.shift || '—'}</td>
                        <td>{member.phone || '—'}</td>
                        <td>{member.salary ? formatCurrency(member.salary) : '—'}</td>
                        <td>{formatDate(member.hire_date)}</td>
                        <td>
                          <span className={`status-badge stock-badge ${String(member.status || 'active').toLowerCase()}`}>
                            {titleCase(member.status)}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn--sm"
                              aria-label={`Edit ${member.name}`}
                              title="Edit staff"
                              onClick={() => openEdit(member)}
                            >
                              <BiEdit />
                            </button>
                            <button
                              type="button"
                              className="icon-btn--sm icon-btn--sm-danger"
                              aria-label={`Delete ${member.name}`}
                              title="Delete staff"
                              onClick={() => setDeleteTarget(member)}
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
        <Modal open onClose={close} header={editing ? `Edit ${editing.name}` : 'New Staff Member'} size="lg" blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Name *</span>
                  <input name="name" value={form.name} onChange={handleField} placeholder="e.g. Jane Cooper" disabled={saving} required autoFocus />
                </label>
                <label className="form-field">
                  <span>Designation *</span>
                  <input name="designation" value={form.designation} onChange={handleField} placeholder="e.g. Receptionist" disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Department</span>
                  <select name="department_id" value={form.department_id} onChange={handleField} disabled={saving}>
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Shift</span>
                  <select name="shift" value={form.shift} onChange={handleField} disabled={saving}>
                    <option value="">Select shift</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="Rotational">Rotational</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    {STAFF_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{titleCase(s)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input name="phone" value={form.phone} onChange={handleField} placeholder="+1 555-0100" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input type="email" name="email" value={form.email} onChange={handleField} placeholder="jane@medicare.io" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Salary ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="salary"
                    value={form.salary}
                    onChange={handleField}
                    placeholder="e.g. 45000"
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Hire Date</span>
                  <input type="date" name="hire_date" value={form.hire_date} onChange={handleField} disabled={saving} />
                </label>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Staff" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action
            cannot be undone.
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

export default Staff;
