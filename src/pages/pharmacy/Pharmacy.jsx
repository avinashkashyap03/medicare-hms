import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BiDollarCircle,
  BiEdit,
  BiPlus,
  BiSearch,
  BiSolidCapsule,
  BiTrash,
} from 'react-icons/bi';
import Modal from '@/components/common/Modal.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import { titleCase } from '@/utils/status.js';
import {
  PHARMACY_STATUS_OPTIONS,
  addPharmacyDrug,
  deletePharmacyDrug,
  deriveStockStatus,
  fetchPharmacyPage,
  getPharmacyStats,
  updatePharmacyDrug,
} from '@/services/pharmacy.js';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  drug_name: '',
  generic_name: '',
  category: '',
  batch_no: '',
  quantity: 0,
  unit: '',
  reorder_level: 0,
  supplier: '',
  purchase_price: 0,
  selling_price: 0,
  expiry_date: '',
  status: 'in_stock',
};

const DEFAULT_STATS = {
  total: 0,
  stockValue: 0,
  retailValue: 0,
  lowCount: 0,
  outOfStockCount: 0,
  expiredCount: 0,
};

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

function stockLevelLabel(item) {
  const qty = Number(item.quantity || 0);
  const level = Number(item.reorder_level || 0);
  return level > 0 ? `${Math.max(0, qty - level)} above reorder` : 'no reorder set';
}

function Pharmacy() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    getPharmacyStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((err) => console.error('Failed to load pharmacy stats:', err));
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
    fetchPharmacyPage({ search: debouncedSearch, page, pageSize: PAGE_SIZE, status: filterStatus })
      .then(({ data, count: total }) => {
        if (cancelled) return;
        setItems(data);
        setCount(total);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load pharmacy:', err);
        setError(err?.message || 'Failed to load pharmacy.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, filterStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, count: total } = await fetchPharmacyPage({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
        status: filterStatus,
      });
      setItems(data);
      setCount(total);
      if (!debouncedSearch && !filterStatus) setStats(await getPharmacyStats());
    } catch (err) {
      console.error('Failed to load pharmacy:', err);
      setError(err?.message || 'Failed to load pharmacy.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, filterStatus]);

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

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      drug_name: item.drug_name ?? '',
      generic_name: item.generic_name ?? '',
      category: item.category ?? '',
      batch_no: item.batch_no ?? '',
      quantity: Number(item.quantity || 0),
      unit: item.unit ?? '',
      reorder_level: Number(item.reorder_level || 0),
      supplier: item.supplier ?? '',
      purchase_price: Number(item.purchase_price || 0),
      selling_price: Number(item.selling_price || 0),
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      status: item.status ?? 'in_stock',
    });
    open();
  };

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      const qty = Number(next.quantity || 0);
      const reorder = Number(next.reorder_level || 0);
      if (name === 'quantity' || name === 'reorder_level' || name === 'expiry_date') {
        next.status = deriveStockStatus(qty, reorder, next.expiry_date);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.drug_name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        drug_name: form.drug_name.trim(),
        generic_name: form.generic_name.trim() || null,
        category: form.category.trim() || null,
        batch_no: form.batch_no.trim() || null,
        quantity: Number(form.quantity || 0),
        unit: form.unit.trim() || null,
        reorder_level: Number(form.reorder_level || 0),
        supplier: form.supplier.trim() || null,
        purchase_price: Number(form.purchase_price || 0),
        selling_price: Number(form.selling_price || 0),
        expiry_date: form.expiry_date || null,
        status: deriveStockStatus(form.quantity, form.reorder_level, form.expiry_date),
        created_by: editing ? undefined : user?.id,
      };
      if (editing) {
        await updatePharmacyDrug(editing.id, payload);
      } else {
        await addPharmacyDrug(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save drug:', err);
      setError(err?.message || 'Failed to save drug.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deletePharmacyDrug(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete drug:', err);
      setError(err?.message || 'Failed to delete drug.');
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
    { label: 'Total Drugs', value: stats.total, color: 'info', icon: BiSolidCapsule, sub: `${stats.expiredCount} expired` },
    { label: 'Low Stock', value: stats.lowCount, color: 'warning', icon: BiSolidCapsule },
    { label: 'Out of Stock', value: stats.outOfStockCount, color: 'danger', icon: BiSolidCapsule },
    { label: 'Stock Value', value: formatCurrency(stats.stockValue), color: 'success', icon: BiDollarCircle, sub: `Retail ${formatCurrency(stats.retailValue)}` },
  ];

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiSolidCapsule className="page-title-icon" /> Pharmacy
          </h1>
          <p className="welcome-sub">{count} drugs in stock — shared across all staff.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openAdd}>
          <BiPlus /> New Drug
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
                {c.sub && <span className="inv-summary-sub">{c.sub}</span>}
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
              placeholder="Search by drug, generic, category or supplier..."
            />
          </div>
          <div className="toolbar-filters">
            <select
              className="toolbar-filter"
              value={filterStatus}
              onChange={(e) => changeFilter(setFilterStatus, e.target.value)}
              aria-label="Filter by stock status"
            >
              <option value="">All statuses</option>
              {PHARMACY_STATUS_OPTIONS.map((s) => (
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
                  <th>Drug</th>
                  <th>Generic</th>
                  <th>Category</th>
                  <th>Stock Level</th>
                  <th>Supplier</th>
                  <th>Prices</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-cell muted">
                      {debouncedSearch || filterStatus
                        ? 'No drugs match your filters.'
                        : 'No drugs yet. Click "New Drug" to add one.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="strong">{item.drug_name}</td>
                      <td>{item.generic_name || '—'}</td>
                      <td>{item.category || '—'}</td>
                      <td>
                        <div className="stock-cell">
                          <span className={`stock-qty ${Number(item.quantity) <= Number(item.reorder_level) ? 'stock-qty--low' : ''}`}>
                            {item.quantity} {item.unit || ''}
                          </span>
                          <span className="stock-reorder muted">{stockLevelLabel(item)}</span>
                        </div>
                      </td>
                      <td>{item.supplier || '—'}</td>
                      <td className="stock-prices">
                        <span>{formatCurrency(item.purchase_price)}</span>
                        <span className="muted">{formatCurrency(item.selling_price)}</span>
                      </td>
                      <td className="muted">{item.batch_no || '—'}</td>
                      <td>{formatDate(item.expiry_date)}</td>
                      <td>
                        <span className={`status-badge stock-badge ${String(item.status || 'in_stock').toLowerCase()}`}>
                          {titleCase(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn--sm"
                            aria-label={`Edit ${item.drug_name}`}
                            title="Edit drug"
                            onClick={() => openEdit(item)}
                          >
                            <BiEdit />
                          </button>
                          <button
                            type="button"
                            className="icon-btn--sm icon-btn--sm-danger"
                            aria-label={`Delete ${item.drug_name}`}
                            title="Delete drug"
                            onClick={() => setDeleteTarget(item)}
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
        <Modal open onClose={close} header={editing ? `Edit ${editing.drug_name}` : 'New Drug'} size="lg" blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Drug Name *</span>
                  <input name="drug_name" value={form.drug_name} onChange={handleField} placeholder="e.g. Paracetamol" disabled={saving} required autoFocus />
                </label>
                <label className="form-field">
                  <span>Generic Name</span>
                  <input name="generic_name" value={form.generic_name} onChange={handleField} placeholder="e.g. Acetaminophen" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Category</span>
                  <input name="category" value={form.category} onChange={handleField} placeholder="e.g. Analgesic" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Batch No</span>
                  <input name="batch_no" value={form.batch_no} onChange={handleField} placeholder="e.g. B-2201" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Unit</span>
                  <input name="unit" value={form.unit} onChange={handleField} placeholder="strip / vial / pcs" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Reorder Level</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="reorder_level"
                    value={form.reorder_level}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    {PHARMACY_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{titleCase(s)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Supplier</span>
                  <input name="supplier" value={form.supplier} onChange={handleField} placeholder="e.g. MedSupply Co." disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Purchase Price ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="purchase_price"
                    value={form.purchase_price}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Selling Price ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="selling_price"
                    value={form.selling_price}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Expiry Date</span>
                  <input type="date" name="expiry_date" value={form.expiry_date} onChange={handleField} disabled={saving} />
                </label>
              </div>

              <p className="inventory-note muted">
                Stock status updates automatically from quantity, reorder level and expiry date — you can still set it manually here.
              </p>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Drug'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Drug" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete <strong>{deleteTarget.drug_name}</strong>
            {deleteTarget.batch_no ? ` (${deleteTarget.batch_no})` : ''}? This action cannot be undone.
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

export default Pharmacy;
