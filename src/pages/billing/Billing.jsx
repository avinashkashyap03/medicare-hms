import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BiDollar,
  BiDollarCircle,
  BiEdit,
  BiPlus,
  BiPrinter,
  BiReceipt,
  BiSearch,
  BiShow,
  BiTrash,
  BiUndo,
  BiXCircle,
} from 'react-icons/bi';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useModal } from '@/hooks/useModal.js';
import Modal from '@/components/common/Modal.jsx';
import AsyncSelect from '@/components/common/AsyncSelect.jsx';
import { searchPatientOptions } from '@/services/patients.js';
import { searchAppointmentOptions } from '@/services/appointments.js';
import { titleCase } from '@/utils/status.js';
import {
  INVOICE_STATUS_OPTIONS,
  PAYMENT_METHODS,
  addInvoice,
  addPayment,
  cancelInvoice,
  deleteInvoice,
  fetchInvoices,
  fetchPayments,
  fetchRefunds,
  getBillingStats,
  getNextInvoiceNo,
  reversePayment,
  updateInvoice,
} from '@/services/billing.js';

const PAGE_SIZE = 10;

function printPage() {
  window.print();
}

const EMPTY_FORM = {
  invoice_no: '',
  patient_id: '',
  appointment_id: '',
  due_date: '',
  status: 'pending',
  items: [],
  tax_rate: 0,
  discount: 0,
};

function newLineItem() {
  return { key: crypto.randomUUID(), description: '', qty: 1, rate: 0 };
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

// Works with both `YYYY-MM-DD` date strings and full timestamps (created_at / paid_at).
function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function lineSubtotal(item) {
  return Number(item.qty || 0) * Number(item.rate || 0);
}

function Billing() {
  const { user, can, isAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ collected: 0, outstanding: 0, overdue: 0, pendingCount: 0, pendingAmount: 0, total: 0 });
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
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', transaction_id: '' });
  const [viewTarget, setViewTarget] = useState(null);
  const [viewPayments, setViewPayments] = useState([]);
  const [viewRefunds, setViewRefunds] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const aliveRef = useRef(true);
  const seqRef = useRef(0);

  // Unmount safety: prevents state updates after the page unmounts.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getBillingStats());
    } catch (err) {
      console.error('Failed to load billing stats:', err);
    }
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
      const { data, count: total } = await fetchInvoices({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
        status: filterStatus,
      });
      if (seq !== seqRef.current || !aliveRef.current) return;
      setInvoices(data);
      setCount(total);
      await loadStats();
    } catch (err) {
      if (seq !== seqRef.current || !aliveRef.current) return;
      console.error('Failed to load invoices:', err);
      setError(err?.message || 'Failed to load invoices.');
    } finally {
      if (seq === seqRef.current && aliveRef.current) setLoading(false);
    }
  }, [debouncedSearch, page, filterStatus, loadStats]);

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

  const formTotals = useMemo(() => {
    const subtotal = (form.items ?? []).reduce((s, i) => s + lineSubtotal(i), 0);
    const tax = (subtotal * Number(form.tax_rate || 0)) / 100;
    const discount = Math.min(Number(form.discount || 0), subtotal + tax);
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, discount, total };
  }, [form.items, form.tax_rate, form.discount]);

  const openAdd = async () => {
    setEditing(null);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    let invoiceNo = '';
    try {
      invoiceNo = await getNextInvoiceNo();
    } catch (err) {
      console.error('Failed to generate invoice number:', err);
    }
    setForm({ ...EMPTY_FORM, invoice_no: invoiceNo, items: [newLineItem()] });
    open();
  };

  const openEdit = (inv) => {
    setEditing(inv);
    const items = (inv.items ?? []).map((i) => ({
      key: crypto.randomUUID(),
      description: i.description ?? '',
      qty: Number(i.qty || 1),
      rate: Number(i.rate || 0),
    }));
    if (items.length === 0) items.push(newLineItem());
    const subtotal = items.reduce((s, i) => s + lineSubtotal(i), 0);
    const taxRate = subtotal > 0 ? (Number(inv.tax || 0) / subtotal) * 100 : 0;
    setSelectedPatient(
      inv.patients ? { id: inv.patient_id, name: inv.patients.name, mrn: inv.patients.mrn } : null
    );
    setSelectedAppointment(
      inv.appointments
        ? {
            id: inv.appointment_id,
            date: inv.appointments.date,
            time: inv.appointments.time,
            type: inv.appointments.type,
            patients: inv.appointments.patients,
          }
        : null
    );
    setForm({
      invoice_no: inv.invoice_no ?? '',
      patient_id: inv.patient_id ?? '',
      appointment_id: inv.appointment_id ?? '',
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : '',
      status: inv.status ?? 'pending',
      items,
      tax_rate: taxRate ? Number(taxRate.toFixed(2)) : 0,
      discount: Number(inv.discount || 0),
    });
    open();
  };

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handlePatientChange = (item) => {
    setForm((f) => ({ ...f, patient_id: item?.id ?? '', appointment_id: '' }));
    setSelectedPatient(item);
    setSelectedAppointment(null);
  };

  const handleAppointmentChange = (item) => {
    setForm((f) => ({ ...f, appointment_id: item?.id ?? '' }));
    setSelectedAppointment(item);
  };

  const handleItemField = (key, field, value) => {
    setForm((f) => ({
      ...f,
      items: (f.items ?? []).map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    }));
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...(f.items ?? []), newLineItem()] }));
  };

  const removeItem = (key) => {
    setForm((f) => {
      const items = (f.items ?? []).filter((i) => i.key !== key);
      return { ...f, items: items.length ? items : [newLineItem()] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id) return;
    const validItems = (form.items ?? []).filter(
      (i) => i.description && Number(i.qty) > 0 && Number(i.rate || 0) >= 0
    );
    if (validItems.length === 0) {
      setError('Add at least one line item with a description.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        invoice_no: form.invoice_no || '',
        patient_id: form.patient_id,
        appointment_id: form.appointment_id || null,
        items: validItems.map((i) => ({
          description: i.description,
          qty: Number(i.qty),
          rate: Number(i.rate),
        })),
        subtotal: Number(formTotals.subtotal.toFixed(2)),
        tax: Number(formTotals.tax.toFixed(2)),
        discount: Number(formTotals.discount.toFixed(2)),
        total: Number(formTotals.total.toFixed(2)),
        status: editing ? form.status : 'pending',
        due_date: form.due_date || null,
        created_by: editing ? undefined : user?.id,
      };
      if (editing) {
        await updateInvoice(editing.id, payload);
      } else {
        await addInvoice(payload, user);
      }
      close();
      await load();
    } catch (err) {
      console.error('Failed to save invoice:', err);
      setError(err?.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  const openPayment = useCallback((invoice) => {
    setPaymentTarget(invoice);
    const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.paid_amount || 0));
    setPaymentForm({ amount: balance ? balance.toFixed(2) : '', method: 'cash', transaction_id: '' });
  }, []);

  const handleRecordPayment = useCallback(() => {
    openPayment(viewTarget);
  }, [openPayment, viewTarget]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    const balance = Math.max(
      0,
      Number(paymentTarget.total || 0) - Number(paymentTarget.paid_amount || 0)
    );
    if (balance <= 0) {
      setError('This invoice is already fully paid.');
      return;
    }
    if (amount > balance) {
      setError('Payment amount exceeds the outstanding balance.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addPayment(
        {
          invoice_id: paymentTarget.id,
          amount,
          method: paymentForm.method,
          transaction_id: paymentForm.transaction_id,
        },
        user
      );
      setPaymentTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err?.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const openView = async (invoice) => {
    setViewTarget(invoice);
    setViewPayments([]);
    setViewRefunds([]);
    try {
      const [payments, refunds] = await Promise.all([
        fetchPayments(invoice.id),
        fetchRefunds(invoice.id),
      ]);
      setViewPayments(payments);
      setViewRefunds(refunds);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  };

  const handleStatusChange = async (invoice, status) => {
    if (!invoice || status === invoice.status) return;
    // 'paid' and 'cancelled' are managed by the payment recompute trigger
    // and admin_cancel_invoice respectively — never via a direct update.
    if (status === 'paid' || status === 'cancelled') return;
    try {
      await updateInvoice(invoice.id, { status });
      await load();
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      setError(err?.message || 'Failed to update invoice status.');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setError('Enter a reason for cancelling this invoice.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await cancelInvoice(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      setError(err?.message || 'Failed to cancel invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseTarget) return;
    if (!reverseReason.trim()) {
      setError('Enter a reason for reversing this payment.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await reversePayment({ payment_id: reverseTarget.id, reason: reverseReason.trim() });
      setReverseTarget(null);
      setReverseReason('');
      if (viewTarget) {
        const [payments, refunds] = await Promise.all([
          fetchPayments(viewTarget.id),
          fetchRefunds(viewTarget.id),
        ]);
        setViewPayments(payments);
        setViewRefunds(refunds);
      }
      await load();
    } catch (err) {
      console.error('Failed to reverse payment:', err);
      setError(err?.message || 'Failed to reverse payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      setError(err?.message || 'Failed to delete invoice.');
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
    { label: 'Total Collected', value: stats.collected, color: 'success', icon: BiDollarCircle },
    { label: 'Outstanding', value: stats.outstanding, color: 'warning', icon: BiDollar },
    { label: 'Overdue Payments', value: stats.overdue, color: 'danger', icon: BiReceipt },
    { label: 'Pending Invoices', value: stats.pendingAmount, color: 'info', icon: BiReceipt },
  ];

  const appointmentLabel = (a) =>
    `${a.patients?.name || 'Patient'} — ${formatDate(a.date)} ${formatTime(a.time)}${
      a.type ? ` (${a.type})` : ''
    }`;

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiDollarCircle className="page-title-icon" /> Billing &amp; Invoices
          </h1>
          <p className="welcome-sub">{count} invoice records — shared across all staff.</p>
        </div>
        {can('billing', 'create') && (
          <button type="button" className="btn-primary" onClick={openAdd}>
            <BiPlus /> New Invoice
          </button>
        )}
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
                <strong className="inv-summary-value">{formatCurrency(c.value)}</strong>
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
              placeholder="Search by invoice number or patient..."
            />
          </div>
          <div className="toolbar-filters">
            <select
              className="toolbar-filter"
              value={filterStatus}
              onChange={(e) => changeFilter(setFilterStatus, e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {INVOICE_STATUS_OPTIONS.map((s) => (
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
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell muted">
                      {debouncedSearch || filterStatus
                        ? 'No invoices match your filters.'
                        : 'No invoices yet. Click "New Invoice" to create one.'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const balance = Math.max(
                      0,
                      Number(inv.total || 0) - Number(inv.paid_amount || 0)
                    );
                    const editable =
                      (inv.status === 'pending' || inv.status === 'overdue') &&
                      Number(inv.paid_amount || 0) === 0;
                    const canCollect =
                      can('billing', 'collect_payment') &&
                      inv.status !== 'paid' &&
                      inv.status !== 'cancelled' &&
                      balance > 0;
                    return (
                      <tr key={inv.id}>
                        <td className="strong">{inv.invoice_no}</td>
                        <td>
                          <div className="cell-patient">
                            <span className="initials">{initials(inv.patients?.name)}</span>
                            <div className="patient-info">
                              <Link to="/patients" className="cell-link">{inv.patients?.name || '—'}</Link>
                              <span>{inv.patients?.mrn || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="strong">{formatDate(inv.created_at)}</td>
                        <td className="strong">{formatCurrency(inv.total)}</td>
                        <td>{formatCurrency(inv.paid_amount)}</td>
                        <td className={balance > 0 ? 'inv-balance' : 'muted'}>{formatCurrency(balance)}</td>
                        <td>
                          {editable && can('billing', 'update') ? (
                            <select
                              className={`status-select status-select--${String(inv.status).toLowerCase()}`}
                              value={String(inv.status || 'pending')}
                              onChange={(e) => handleStatusChange(inv, e.target.value)}
                              aria-label={`Status for ${inv.invoice_no}`}
                            >
                              {INVOICE_STATUS_OPTIONS.filter(
                                (s) => s !== 'paid' && s !== 'cancelled'
                              ).map((s) => (
                                <option key={s} value={s}>{titleCase(s)}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`status-badge ${String(inv.status || 'pending').toLowerCase()}`}>
                              {titleCase(inv.status)}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn--sm"
                              aria-label={`View ${inv.invoice_no}`}
                              title="View invoice"
                              onClick={() => openView(inv)}
                            >
                              <BiShow />
                            </button>
                            {canCollect && (
                              <button
                                type="button"
                                className="icon-btn--sm"
                                aria-label={`Record payment for ${inv.invoice_no}`}
                                title="Record payment"
                                onClick={() => openPayment(inv)}
                              >
                                <BiDollar />
                              </button>
                            )}
                            {editable && can('billing', 'update') && (
                              <button
                                type="button"
                                className="icon-btn--sm"
                                aria-label={`Edit ${inv.invoice_no}`}
                                title="Edit invoice"
                                onClick={() => openEdit(inv)}
                              >
                                <BiEdit />
                              </button>
                            )}
                            {isAdmin && editable && (
                              <button
                                type="button"
                                className="icon-btn--sm icon-btn--sm-danger"
                                aria-label={`Cancel ${inv.invoice_no}`}
                                title="Cancel invoice"
                                onClick={() => {
                                  setCancelTarget(inv);
                                  setCancelReason('');
                                }}
                              >
                                <BiXCircle />
                              </button>
                            )}
                            {can('billing', 'delete') && editable && (
                              <button
                                type="button"
                                className="icon-btn--sm icon-btn--sm-danger"
                                aria-label={`Delete ${inv.invoice_no}`}
                                title="Delete invoice"
                                onClick={() => setDeleteTarget(inv)}
                              >
                                <BiTrash />
                              </button>
                            )}
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
        <Modal open onClose={close} header={editing ? `Edit ${editing.invoice_no}` : 'New Invoice'} size="lg" blocked={saving}>
          <form className="patient-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Invoice No.</span>
                  <input value={form.invoice_no} readOnly disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleField} disabled={saving}>
                    {INVOICE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{titleCase(s)}</option>
                    ))}
                  </select>
                </label>
                <AsyncSelect
                  label="Patient"
                  required
                  placeholder="Search patient by name or MR number..."
                  value={form.patient_id}
                  selected={selectedPatient}
                  onChange={handlePatientChange}
                  search={(q) => searchPatientOptions(q, 20)}
                  getLabel={(p) => `${p.name} (${p.mrn})`}
                  disabled={saving}
                />
                <AsyncSelect
                  label="Appointment (optional)"
                  placeholder="Search appointments for the selected patient..."
                  value={form.appointment_id}
                  selected={selectedAppointment}
                  onChange={handleAppointmentChange}
                  search={(q) => searchAppointmentOptions(q, form.patient_id, 20)}
                  getLabel={appointmentLabel}
                  disabled={saving || !form.patient_id}
                  key={form.patient_id || 'no-patient'}
                />
                <label className="form-field">
                  <span>Due Date</span>
                  <input type="date" name="due_date" value={form.due_date} onChange={handleField} disabled={saving} />
                </label>
              </div>

              <div className="inv-items-head">
                <span>Line Items</span>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={addItem} disabled={saving}>
                  <BiPlus /> Add line
                </button>
              </div>

              <div className="inv-items">
                {(form.items ?? []).map((item) => (
                  <div key={item.key} className="inv-item-row">
                    <label className="form-field">
                      <span className="inv-item-label">Description</span>
                      <input
                        value={item.description}
                        placeholder="e.g. Consultation fee"
                        onChange={(e) => handleItemField(item.key, 'description', e.target.value)}
                        disabled={saving}
                      />
                    </label>
                    <label className="form-field">
                      <span className="inv-item-label">Qty</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.qty}
                        onChange={(e) => handleItemField(item.key, 'qty', e.target.value)}
                        disabled={saving}
                      />
                    </label>
                    <label className="form-field">
                      <span className="inv-item-label">Rate ($)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleItemField(item.key, 'rate', e.target.value)}
                        disabled={saving}
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-btn--sm icon-btn--sm-danger inv-item-remove"
                      aria-label="Remove line item"
                      onClick={() => removeItem(item.key)}
                      disabled={saving}
                    >
                      <BiTrash />
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Tax Rate (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="tax_rate"
                    value={form.tax_rate}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
                <label className="form-field">
                  <span>Discount ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="discount"
                    value={form.discount}
                    onChange={handleField}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="inv-totals">
                <div className="inv-total-row"><span>Subtotal</span><strong>{formatCurrency(formTotals.subtotal)}</strong></div>
                <div className="inv-total-row"><span>Tax</span><strong>{formatCurrency(formTotals.tax)}</strong></div>
                <div className="inv-total-row"><span>Discount</span><strong>-{formatCurrency(formTotals.discount)}</strong></div>
                <div className="inv-total-row inv-total-row--grand"><span>Total</span><strong>{formatCurrency(formTotals.total)}</strong></div>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {paymentTarget && (
        <Modal open onClose={() => setPaymentTarget(null)} header="Record Payment" size="sm" blocked={saving}>
          <form className="patient-form" onSubmit={handlePaymentSubmit}>
              <p className="modal-body-text">
                Invoice <strong>{paymentTarget.invoice_no}</strong> — total{' '}
                <strong>{formatCurrency(paymentTarget.total)}</strong>, paid{' '}
                <strong>{formatCurrency(paymentTarget.paid_amount)}</strong>. Outstanding balance is{' '}
                <strong>{formatCurrency(Math.max(0, Number(paymentTarget.total || 0) - Number(paymentTarget.paid_amount || 0)))}</strong>.
              </p>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Amount ($) *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                    disabled={saving}
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field">
                  <span>Method *</span>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                    disabled={saving}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{titleCase(m)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Transaction ID</span>
                  <input
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, transaction_id: e.target.value }))}
                    placeholder="Optional"
                    disabled={saving}
                  />
                </label>
              </div>
              {error && <div className="page-alert page-alert--danger">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setPaymentTarget(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} header="Delete Invoice" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Are you sure you want to delete invoice <strong>{deleteTarget.invoice_no}</strong>{' '}
            for <strong>{deleteTarget.patients?.name}</strong>? Payments linked to it will also
            be removed. This action cannot be undone.
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

      {viewTarget && (
        <Modal
          open
          onClose={() => setViewTarget(null)}
          header={viewTarget.invoice_no}
          headerClassName="no-print"
          size="lg"
          className="modal--print"
          headerActions={
            <>
              <button type="button" className="btn-ghost" onClick={handleRecordPayment}>
                <BiDollar /> Record Payment
              </button>
              <button type="button" className="btn-primary" onClick={printPage}>
                <BiPrinter /> Print
              </button>
            </>
          }
        >
          <div className="invoice-sheet print-area">
              <div className="invoice-head">
                <div className="invoice-brand">
                  <strong>MediCare <em>HMS</em></strong>
                  <span>123 Wellness Avenue, New York, NY 10001</span>
                  <span>contact@medicarehms.com · +1 (555) 010-2040</span>
                </div>
                <div className="invoice-meta">
                  <h3>INVOICE</h3>
                  <span><strong>Invoice No:</strong> {viewTarget.invoice_no}</span>
                  <span><strong>Issue Date:</strong> {formatDate(viewTarget.created_at)}</span>
                  {viewTarget.due_date && <span><strong>Due Date:</strong> {formatDate(viewTarget.due_date)}</span>}
                  <span className={`status-badge ${String(viewTarget.status).toLowerCase()}`}>{titleCase(viewTarget.status)}</span>
                </div>
              </div>

              <div className="invoice-bill-to">
                <div>
                  <p className="invoice-bill-label">Billed To</p>
                  <strong>{viewTarget.patients?.name || '—'}</strong>
                  <span>MRN: {viewTarget.patients?.mrn || '—'}</span>
                </div>
              </div>

              <table className="data-table invoice-items">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewTarget.items ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="empty-cell muted">No line items.</td></tr>
                  ) : (
                    (viewTarget.items ?? []).map((i, idx) => (
                      <tr key={idx}>
                        <td>{i.description}</td>
                        <td>{i.qty}</td>
                        <td>{formatCurrency(i.rate)}</td>
                        <td>{formatCurrency(Number(i.qty || 0) * Number(i.rate || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="invoice-totals">
                <div className="inv-total-row"><span>Subtotal</span><strong>{formatCurrency(viewTarget.subtotal)}</strong></div>
                <div className="inv-total-row"><span>Tax</span><strong>{formatCurrency(viewTarget.tax)}</strong></div>
                <div className="inv-total-row"><span>Discount</span><strong>-{formatCurrency(viewTarget.discount)}</strong></div>
                <div className="inv-total-row inv-total-row--grand"><span>Total</span><strong>{formatCurrency(viewTarget.total)}</strong></div>
                <div className="inv-total-row inv-total-row--paid"><span>Paid</span><strong>{formatCurrency(viewTarget.paid_amount)}</strong></div>
                <div className="inv-total-row inv-total-row--grand"><span>Balance Due</span><strong>{formatCurrency(Math.max(0, Number(viewTarget.total || 0) - Number(viewTarget.paid_amount || 0)))}</strong></div>
              </div>

              <div className="invoice-payments no-print">
                <p className="invoice-bill-label">Payment History</p>
                {viewPayments.length === 0 ? (
                  <p className="muted inv-nopayments">No payments recorded yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Transaction</th>
                        <th>Amount</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {viewPayments.map((pay) => {
                        const refunded = viewRefunds
                          .filter((r) => r.payment_id === pay.id)
                          .reduce((s, r) => s + Number(r.amount || 0), 0);
                        const remaining = Math.max(0, Number(pay.amount || 0) - refunded);
                        return (
                          <tr key={pay.id}>
                            <td>{formatDate(pay.paid_at)} {formatTime(pay.paid_at)}</td>
                            <td>{titleCase(pay.method)}</td>
                            <td>{pay.transaction_id || '—'}</td>
                            <td className="strong">{formatCurrency(pay.amount)}</td>
                            {isAdmin && (
                              <td>
                                {remaining > 0 ? (
                                  <button
                                    type="button"
                                    className="icon-btn--sm icon-btn--sm-danger"
                                    aria-label={`Reverse payment ${pay.transaction_id || ''}`}
                                    title="Reverse payment"
                                    onClick={() => {
                                      setReverseTarget(pay);
                                      setReverseReason('');
                                    }}
                                  >
                                    <BiUndo />
                                  </button>
                                ) : (
                                  <span className="muted">reversed</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {viewRefunds.length > 0 && (
                  <div className="inv-refunds">
                    <p className="invoice-bill-label">Refunds &amp; Reversals</p>
                    <table className="data-table">
                      <thead>
                        <tr><th>Date</th><th>Amount</th><th>Reason</th></tr>
                      </thead>
                      <tbody>
                        {viewRefunds.map((r) => (
                          <tr key={r.id}>
                            <td>{formatDate(r.created_at)} {formatTime(r.created_at)}</td>
                            <td className="strong inv-refund-amount">-{formatCurrency(r.amount)}</td>
                            <td className="muted">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="invoice-foot">
                Thank you for choosing MediCare HMS. Please make payment by the due date.
              </p>
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal open onClose={() => setCancelTarget(null)} header={`Cancel ${cancelTarget.invoice_no}`} showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Cancel invoice <strong>{cancelTarget.invoice_no}</strong> for{' '}
            <strong>{cancelTarget.patients?.name}</strong>? This marks the invoice as cancelled
            and cannot be undone through the UI.
          </p>
          <label className="form-field">
            <span>Reason *</span>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient no-show, duplicate invoice"
              disabled={saving}
            />
          </label>
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setCancelTarget(null)} disabled={saving}>
              Close
            </button>
            <button type="button" className="btn-danger" onClick={handleCancel} disabled={saving}>
              {saving ? 'Cancelling...' : 'Cancel Invoice'}
            </button>
          </div>
        </Modal>
      )}

      {reverseTarget && (
        <Modal open onClose={() => setReverseTarget(null)} header="Reverse Payment" showClose={false} size="sm" variant="alertdialog" blocked={saving}>
          <p className="modal-body-text">
            Reverse payment of <strong>{formatCurrency(reverseTarget.amount)}</strong> received on{' '}
            <strong>{formatDate(reverseTarget.paid_at)}</strong>? The invoice balance will be
            recomputed automatically.
          </p>
          <label className="form-field">
            <span>Reason *</span>
            <textarea
              rows={2}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="e.g. Payment error, refund issued"
              disabled={saving}
            />
          </label>
          {error && <div className="page-alert page-alert--danger">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setReverseTarget(null)} disabled={saving}>
              Close
            </button>
            <button type="button" className="btn-danger" onClick={handleReverse} disabled={saving}>
              {saving ? 'Reversing...' : 'Reverse Payment'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export default Billing;