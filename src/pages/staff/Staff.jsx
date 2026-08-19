import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BiEdit,
  BiGroup,
  BiHourglass,
  BiLockAlt,
  BiPlus,
  BiSearch,
  BiTrash,
  BiUserCheck,
  BiUserCircle,
  BiUserX,
} from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import { titleCase } from '@/utils/status.js';
import { getRoleLabel, getStatusLabel } from '@/utils/auth.js';
import { fetchDepartments } from '@/services/departments.js';
import {
  STAFF_STATUS_OPTIONS,
  addStaff,
  approveStaff,
  deleteStaff,
  fetchPendingProfiles,
  fetchStaffPage,
  getStaffStats,
  setUserStatus,
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

// Initial assignable roles. Deliberately excludes admin (and the other
// legacy roles) — the database function enforces the same whitelist.
const APPROVAL_ROLES = ['staff', 'receptionist'];

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

function Staff() {
  const { user, isAdmin } = useAuth();
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
  const [success, setSuccess] = useState('');
  const { isOpen, open, close } = useModal();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalRole, setApprovalRole] = useState('receptionist');
  const [approvalReason, setApprovalReason] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusAction, setStatusAction] = useState('');
  const [statusReason, setStatusReason] = useState('');
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

  const loadApprovals = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const accounts = await fetchPendingProfiles();
      if (aliveRef.current) setPendingAccounts(accounts);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      if (aliveRef.current) setPendingAccounts([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    const t = setTimeout(loadApprovals, 0);
    return () => clearTimeout(t);
  }, [loadApprovals]);

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
    setSuccess('');
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
    setSuccess('');
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

  const handleApprove = async () => {
    if (!approvalTarget) return;
    if (!approvalReason.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await approveStaff(approvalTarget.email, approvalRole, approvalReason.trim());
      const roleLabel = getRoleLabel(approvalRole);
      setSuccess(`${approvalTarget.full_name} approved — role set to ${roleLabel}, account activated.`);
      setApprovalTarget(null);
      setApprovalReason('');
      setApprovalRole('receptionist');
      await Promise.all([load(), loadApprovals()]);
    } catch (err) {
      console.error('Failed to approve account:', err);
      setError(err?.message || 'Failed to approve account.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!approvalTarget) return;
    if (!approvalReason.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await setUserStatus(approvalTarget.id, 'deactivated', approvalReason.trim());
      setSuccess(`${approvalTarget.full_name} rejected — account deactivated.`);
      setApprovalTarget(null);
      setApprovalReason('');
      await loadApprovals();
    } catch (err) {
      console.error('Failed to reject account:', err);
      setError(err?.message || 'Failed to reject account.');
    } finally {
      setSaving(false);
    }
  };

  const handleAccountStatus = async () => {
    if (!statusTarget || !statusAction) return;
    if (statusAction !== 'active' && !statusReason.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await setUserStatus(statusTarget.id, statusAction, statusReason.trim());
      setSuccess(`${statusTarget.name}'s account is now ${getStatusLabel(statusAction).toLowerCase()}.`);
      setStatusTarget(null);
      setStatusAction('');
      setStatusReason('');
      await Promise.all([load(), loadApprovals()]);
    } catch (err) {
      console.error('Failed to update account status:', err);
      setError(err?.message || 'Failed to update account status.');
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
      {success && <div className="page-alert page-alert--success">{success}</div>}

      {isAdmin && pendingAccounts.length > 0 && (
        <section className="card widget">
          <div className="toolbar-row">
            <div className="toolbar-search">
              <BiHourglass />
              <span className="approvals-title">
                Pending Account Approvals
                <small>{pendingAccounts.length} account{pendingAccounts.length > 1 ? 's' : ''} awaiting review</small>
              </span>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Signed Up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingAccounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div className="cell-patient">
                        <span className="initials">{initials(acc.full_name)}</span>
                        <div className="patient-info">
                          <strong>{acc.full_name}</strong>
                          <span className="account-status-pill pending">{getStatusLabel(acc.status)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{acc.email || '—'}</td>
                    <td>{getRoleLabel(acc.role)}</td>
                    <td>{formatDate(acc.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn--sm icon-btn--sm-success"
                          aria-label={`Approve ${acc.full_name}`}
                          title="Approve & assign role"
                          onClick={() => {
                            setApprovalTarget(acc);
                            setApprovalRole('receptionist');
                            setApprovalReason('');
                            setError('');
                            setSuccess('');
                          }}
                        >
                          <BiUserCheck />
                        </button>
                        <button
                          type="button"
                          className="icon-btn--sm icon-btn--sm-danger"
                          aria-label={`Reject ${acc.full_name}`}
                          title="Reject"
                          onClick={() => {
                            setApprovalTarget(acc);
                            setApprovalRole('');
                            setApprovalReason('');
                            setError('');
                            setSuccess('');
                          }}
                        >
                          <BiUserX />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                              {member.profiles?.status && (
                                <span className={`account-status-pill ${member.profiles.status}`}>
                                  {getStatusLabel(member.profiles.status)}
                                </span>
                              )}
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
                            {isAdmin && member.user_id && (
                              <button
                                type="button"
                                className="icon-btn--sm"
                                aria-label={`Manage account for ${member.name}`}
                                title="Manage account status"
                                onClick={() => {
                                  setStatusTarget(member);
                                  setStatusAction(member.profiles?.status === 'suspended' ? 'active' : 'suspended');
                                  setStatusReason('');
                                  setError('');
                                }}
                              >
                                <BiLockAlt />
                              </button>
                            )}
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
    {approvalTarget && approvalRole && (
        <Modal open onClose={() => setApprovalTarget(null)} header={`Approve & Assign Role — ${approvalTarget.full_name}`} showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Approve <strong>{approvalTarget.full_name}</strong> and assign a role? The account
            will be activated immediately.
          </p>
          <label className="form-field">
            <span>Role</span>
            <select value={approvalRole} onChange={(e) => setApprovalRole(e.target.value)} disabled={saving}>
              {APPROVAL_ROLES.map((r) => (
                <option key={r} value={r}>{getRoleLabel(r)}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Reason *</span>
            <textarea
              rows={2}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="e.g. Approved for reception/front-desk duties"
              disabled={saving}
            />
          </label>
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setApprovalTarget(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleApprove} disabled={saving || !approvalReason.trim()}>
              {saving ? 'Approving...' : 'Approve & Assign'}
            </button>
          </div>
        </Modal>
      )}

      {approvalTarget && !approvalRole && (
        <Modal open onClose={() => setApprovalTarget(null)} header={`Reject ${approvalTarget.full_name}`} showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Reject the account request for <strong>{approvalTarget.full_name}</strong>? The account
            will be deactivated.
          </p>
          <label className="form-field">
            <span>Reason *</span>
            <textarea
              rows={2}
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="e.g. Failed background check"
              disabled={saving}
            />
          </label>
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setApprovalTarget(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleReject} disabled={saving || !approvalReason.trim()}>
              {saving ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}

      {statusTarget && (
        <Modal open onClose={() => setStatusTarget(null)} header={`Manage ${statusTarget.name}'s Account`} showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <label className="form-field">
            <span>Account Status</span>
            <select value={statusAction} onChange={(e) => setStatusAction(e.target.value)} disabled={saving}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </label>
          {statusAction !== 'active' && (
            <label className="form-field">
              <span>Reason *</span>
              <textarea
                rows={2}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Repeated late arrivals, resigned"
                disabled={saving}
              />
            </label>
          )}
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setStatusTarget(null)} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={statusAction === 'active' ? 'btn-primary' : 'btn-danger'}
              onClick={handleAccountStatus}
              disabled={saving || (statusAction !== 'active' && !statusReason.trim())}
            >
              {saving ? 'Saving...' : titleCase(statusAction)}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Staff;
