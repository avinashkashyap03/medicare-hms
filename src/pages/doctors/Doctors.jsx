import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiEdit, BiFirstAid, BiPlus, BiSearch, BiTrash } from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import { statusClass } from '@/utils/status.js';
import {
  addDoctor,
  deleteDoctor,
  fetchDoctors,
  updateDoctor,
} from '@/services/doctors.js';
import { fetchDepartments } from '@/services/departments.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  specialization: '',
  department_id: '',
  license_no: '',
  phone: '',
  email: '',
  fee: '',
  status: 'active',
};

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatFee(fee) {
  if (fee === null || fee === undefined || fee === '') return '—';
  const n = Number(fee);
  return Number.isNaN(n) ? '—' : `$${n.toFixed(2)}`;
}

function Doctors() {
  const { user, can } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
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
  const aliveRef = useRef(true);
  const seqRef = useRef(0);

  // Unmount safety: prevents state updates after the page unmounts.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
  // responses racing ahead of newer requests.
  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const { data, count: total } = await fetchDoctors({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      if (seq !== seqRef.current || !aliveRef.current) return;
      setDoctors(data);
      setCount(total);
    } catch (err) {
      if (seq !== seqRef.current || !aliveRef.current) return;
      console.error('Failed to load doctors:', err);
      setError(err?.message || 'Failed to load doctors.');
    } finally {
      if (seq === seqRef.current && aliveRef.current) setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    // Deferred so the initial fetch doesn't call setState synchronously
    // inside the effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    open();
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name ?? '',
      specialization: p.specialization ?? '',
      department_id: p.department_id ?? '',
      license_no: p.license_no ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      fee: p.fee === null || p.fee === undefined ? '' : String(p.fee),
      status: p.status ?? 'active',
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
      const payload = {
        ...form,
        department_id: form.department_id || null,
        license_no: form.license_no || null,
        fee: form.fee === '' || form.fee === null ? 0 : Number(form.fee),
        created_by: editing ? undefined : user?.id,
      };
      if (editing) {
        await updateDoctor(editing.id, payload);
      } else {
        await addDoctor(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save doctor:', err);
      setError(err?.message || 'Failed to save doctor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteDoctor(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete doctor:', err);
      setError(err?.message || 'Failed to delete doctor.');
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
            <BiFirstAid className="page-title-icon" /> Doctors
          </h1>
          <p className="welcome-sub">{count} doctor records — shared across all staff.</p>
        </div>
        {can('doctors', 'create') && (
          <button type="button" className="btn-primary" onClick={openAdd}>
            <BiPlus /> New Doctor
          </button>
        )}
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
              placeholder="Search by name, specialization, license, phone, email..."
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
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>License No.</th>
                  <th>Contact</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell muted">
                      {debouncedSearch ? 'No doctors match your search.' : 'No doctors yet. Click "New Doctor" to add one.'}
                    </td>
                  </tr>
                ) : (
                  doctors.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-patient">
                          <span className="initials">{initials(p.name)}</span>
                          <div className="patient-info">
                            <strong>{p.name}</strong>
                            <span>{p.license_no || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="strong">{p.specialization || '—'}</td>
                      <td>
                        {p.departments ? (
                          can('departments', 'view') ? (
                            <Link to="/departments" className="cell-link">{p.departments.name}</Link>
                          ) : (
                            p.departments.name
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="muted">{p.license_no || '—'}</td>
                      <td>
                        {p.phone || '—'}
                        {p.email && <><br /><span className="cell-sub">{p.email}</span></>}
                      </td>
                      <td className="strong">{formatFee(p.fee)}</td>
                      <td>
                        <span className={`status-badge ${statusClass(p.status || 'active')}`}>
                          {p.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {can('doctors', 'update') && (
                            <button
                              type="button"
                              className="icon-btn--sm"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => openEdit(p)}
                            >
                              <BiEdit />
                            </button>
                          )}
                          {can('doctors', 'delete') && (
                            <button
                              type="button"
                              className="icon-btn--sm icon-btn--sm-danger"
                              aria-label={`Delete ${p.name}`}
                              onClick={() => setDeleteTarget(p)}
                            >
                              <BiTrash />
                            </button>
                          )}
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
        <Modal open onClose={close} header={editing ? 'Edit Doctor' : 'New Doctor'} blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Full Name *</span>
                  <input name="name" value={form.name} onChange={handleField} placeholder="e.g. Dr. Sarah Chen" disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Specialization</span>
                  <input name="specialization" value={form.specialization} onChange={handleField} placeholder="e.g. Cardiology" disabled={saving} />
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
                  <span>License No.</span>
                  <input name="license_no" value={form.license_no} onChange={handleField} placeholder="e.g. MD-2024-1234" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Consultation Fee ($)</span>
                  <input type="number" name="fee" value={form.fee} onChange={handleField} placeholder="e.g. 150" min="0" step="0.01" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input name="phone" value={form.phone} onChange={handleField} placeholder="+1 555-0201" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input type="email" name="email" value={form.email} onChange={handleField} placeholder="doctor@medicare.io" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Doctor'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Doctor" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
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

export default Doctors;