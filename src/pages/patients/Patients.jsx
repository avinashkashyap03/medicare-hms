import { useCallback, useEffect, useMemo, useState } from 'react';
import { BiEdit, BiPlus, BiSearch, BiTrash, BiUser } from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import { statusClass } from '@/utils/status.js';
import {
  addPatient,
  deletePatient,
  fetchPatients,
  getNextMrn,
  updatePatient,
} from '@/services/patients.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  mrn: '',
  name: '',
  gender: 'Female',
  dob: '',
  phone: '',
  email: '',
  blood_group: '',
  allergies: '',
  insurance_no: '',
  emergency_contact: '',
  address: '',
  status: 'active',
};

function getAge(dob) {
  if (!dob) return '—';
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return Number.isNaN(age) ? '—' : `${age} yrs`;
}

function bloodClass(blood) {
  return String(blood || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'unknown';
}

function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
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
    fetchPatients({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
      .then(({ data, count: total }) => {
        if (cancelled) return;
        setPatients(data);
        setCount(total);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load patients:', err);
        setError(err?.message || 'Failed to load patients.');
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
      const { data, count: total } = await fetchPatients({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      setPatients(data);
      setCount(total);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError(err?.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openAdd = async () => {
    setEditing(null);
    try {
      const mrn = await getNextMrn();
      setForm({ ...EMPTY_FORM, mrn });
    } catch (err) {
      console.error('Failed to generate MR number:', err);
      setForm(EMPTY_FORM);
    }
    open();
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      mrn: p.mrn ?? '',
      name: p.name ?? '',
      gender: p.gender ?? 'Female',
      dob: p.dob ? p.dob.slice(0, 10) : '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      blood_group: p.blood_group ?? '',
      allergies: p.allergies ?? '',
      insurance_no: p.insurance_no ?? '',
      emergency_contact: p.emergency_contact ?? '',
      address: p.address ?? '',
      status: p.status ?? 'active',
    });
    open();
  };

  const handleField = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mrn.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, created_by: editing ? undefined : user?.id };
      if (editing) {
        await updatePatient(editing.id, form);
      } else {
        await addPatient(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save patient:', err);
      setError(err?.message || 'Failed to save patient.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deletePatient(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete patient:', err);
      setError(err?.message || 'Failed to delete patient.');
    } finally {
      setSaving(false);
    }
  };

  const pageOptions = useMemo(() => {
    const opts = [];
    for (let i = 1; i <= totalPages; i += 1) opts.push(i);
    return opts;
  }, [totalPages]);

  const firstName = (p) => String(p.name || '').split(' ')[0] || '';

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiUser className="page-title-icon" /> Patients
          </h1>
          <p className="welcome-sub">{count} patient records — shared across all staff.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <BiPlus /> New Patient
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
              placeholder="Search by name, MR number, phone, email..."
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
                  <th>Patient</th>
                  <th>MR No.</th>
                  <th>Gender / Age</th>
                  <th>Contact</th>
                  <th>Blood</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell muted">
                      {debouncedSearch ? 'No patients match your search.' : 'No patients yet. Click "New Patient" to add one.'}
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-patient">
                          <span className="initials">{firstName(p).charAt(0) || '?'}</span>
                          <div className="patient-info">
                            <strong>{p.name}</strong>
                            <span>{p.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="strong">{p.mrn}</td>
                      <td>
                        {p.gender || '—'}
                        <span className="cell-sub"> · {getAge(p.dob)}</span>
                      </td>
                      <td>
                        {p.phone || '—'}
                        {p.email && <><br /><span className="cell-sub">{p.email}</span></>}
                      </td>
                      <td>
                        <span className={`blood-chip blood-${bloodClass(p.blood_group)}`}>
                          {p.blood_group || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass(p.status || 'active')}`}>
                          {p.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn--sm"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => openEdit(p)}
                          >
                            <BiEdit />
                          </button>
                          <button
                            type="button"
                            className="icon-btn--sm icon-btn--sm-danger"
                            aria-label={`Delete ${p.name}`}
                            onClick={() => setDeleteTarget(p)}
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
        <Modal open onClose={close} header={editing ? 'Edit Patient' : 'New Patient'} blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>MR Number *</span>
                  <input name="mrn" value={form.mrn} readOnly disabled={saving} required />
                  <small className="form-hint">Auto-generated — editable nahi.</small>
                </label>
                <label className="form-field">
                  <span>Full Name *</span>
                  <input name="name" value={form.name} onChange={handleField} placeholder="e.g. Sophia Ahmed" disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Gender</span>
                  <select name="gender" value={form.gender} onChange={handleField} disabled={saving}>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Date of Birth</span>
                  <input type="date" name="dob" value={form.dob} onChange={handleField} disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input name="phone" value={form.phone} onChange={handleField} placeholder="+1 555-0100" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input type="email" name="email" value={form.email} onChange={handleField} placeholder="patient@email.com" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Blood Group</span>
                  <select name="blood_group" value={form.blood_group} onChange={handleField} disabled={saving}>
                    <option value="">Select</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Allergies</span>
                  <input name="allergies" value={form.allergies} onChange={handleField} placeholder="e.g. Penicillin" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Insurance No.</span>
                  <input name="insurance_no" value={form.insurance_no} onChange={handleField} disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Emergency Contact</span>
                  <input name="emergency_contact" value={form.emergency_contact} onChange={handleField} disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <label className="form-field form-field--full">
                <span>Address</span>
                <textarea name="address" value={form.address} onChange={handleField} rows={2} disabled={saving} />
              </label>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Patient'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Patient" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.mrn})?
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

export default Patients;