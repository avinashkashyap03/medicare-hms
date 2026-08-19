/* ------------------------------------------------------------------
   MediCare HMS — Billing service
   Real data layer for the `invoices` and `payments` tables
   (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const INVOICE_SELECT =
  'id, invoice_no, patient_id, appointment_id, items, subtotal, tax, discount, total, paid_amount, status, due_date, created_by, created_at, updated_at, patients(name, mrn), appointments(date, time, type, patients(name))';

export const INVOICE_STATUS_OPTIONS = ['pending', 'paid', 'overdue', 'cancelled'];
export const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer', 'insurance'];

// Pending-count change notifications — lets the sidebar badge refresh instantly
// whenever an invoice is created, updated, deleted or paid.
const pendingCountListeners = new Set();

export function subscribePendingCount(listener) {
  pendingCountListeners.add(listener);
  return () => {
    pendingCountListeners.delete(listener);
  };
}

function notifyPendingCountChanged() {
  pendingCountListeners.forEach((listener) => listener());
}

function toFriendlyInvoiceError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23503' || message.toLowerCase().includes('foreign key')) {
    return new Error('Please select a valid patient.');
  }
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('Invoice number already exists. Please try again.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage invoices.');
  }
  return error;
}

// Next unique invoice number (e.g. "INV-1042") — pulled from the
// PostgreSQL `invoice_no_seq` sequence via RPC so concurrent
// creates never collide.
export async function getNextInvoiceNo() {
  const { data, error } = await supabase.rpc('next_invoice_no');

  if (error) throw error;
  return data;
}

// Resolve invoice IDs matching a search term. PostgREST cannot parse an or()
// that mixes direct columns with embedded (joined) ones like `patients.name`,
// so search each source separately and union the IDs.
async function searchInvoiceIds(search) {
  const term = `%${search.trim()}%`;
  const ids = new Set();

  const { data: localMatches } = await supabase
    .from('invoices')
    .select('id')
    .ilike('invoice_no', term);
  (localMatches ?? []).forEach((r) => ids.add(r.id));

  const { data: matchingPatients } = await supabase
    .from('patients')
    .select('id')
    .ilike('name', term);
  if (matchingPatients?.length) {
    const { data: viaPatient } = await supabase
      .from('invoices')
      .select('id')
      .in('patient_id', matchingPatients.map((p) => p.id));
    (viaPatient ?? []).forEach((r) => ids.add(r.id));
  }

  return [...ids];
}

export async function fetchInvoices({ search = '', page = 1, pageSize = 20, status = '' } = {}) {
  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  if (search.trim()) {
    const ids = await searchInvoiceIds(search);
    if (ids.length === 0) return { data: [], count: 0 };
    query = query.in('id', ids);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchInvoiceById(id) {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function addInvoice(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('invoices')
    .insert([{ ...payload, created_by: hasProfile ? payload.created_by ?? user?.id : null }])
    .select(INVOICE_SELECT)
    .single();

  if (error) throw toFriendlyInvoiceError(error);
  notifyPendingCountChanged();
  return data;
}

export async function updateInvoice(id, payload) {
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .select(INVOICE_SELECT)
    .single();

  if (error) throw toFriendlyInvoiceError(error);
  notifyPendingCountChanged();
  return data;
}

// The ONLY sanctioned way to mark an invoice cancelled (RLS forbids
// writing status='cancelled' via a direct update). Admin-only RPC.
export async function cancelInvoice(id, reason) {
  const { error } = await supabase.rpc('admin_cancel_invoice', {
    p_invoice_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  notifyPendingCountChanged();
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
  notifyPendingCountChanged();
}

export async function getInvoiceCount() {
  const { count, error } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

// Pending invoice count — used for the sidebar badge
export async function getPendingInvoiceCount() {
  const { count, error } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}

// Billing summary for the page header — total collected, outstanding, overdue & pending.
// Aggregated inside PostgreSQL (get_billing_stats RPC) instead of
// transferring every invoice row into JavaScript.
export async function getBillingStats() {
  const { data, error } = await supabase.rpc('get_billing_stats');
  if (error) throw error;
  return data;
}

// Today's collections (payments minus refunds) — admin + receptionist.
export async function getTodayCollections() {
  const { data, error } = await supabase.rpc('get_today_collections');
  if (error) throw error;
  return data;
}

// ---------- Payments ----------

export async function fetchPayments(invoiceId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Refunds against an invoice (admin correction history).
export async function fetchRefunds(invoiceId) {
  const { data, error } = await supabase
    .from('refunds')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Record a payment. The invoice's paid_amount / status are recomputed by
// the AFTER INSERT trigger (migration 013), so the client must NOT update
// the invoice itself anymore.
export async function addPayment({ invoice_id, amount, method = 'cash', transaction_id = '' }, user) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Enter a valid payment amount.');
  }

  const { data: inv, error: invError } = await supabase
    .from('invoices')
    .select('total, paid_amount, status')
    .eq('id', invoice_id)
    .single();
  if (invError) throw invError;

  if (inv?.status === 'paid' || inv?.status === 'cancelled') {
    throw new Error('This invoice cannot accept payments.');
  }
  const balance = Math.max(0, Number(inv?.total || 0) - Number(inv?.paid_amount || 0));
  if (value > balance) {
    throw new Error('Payment amount exceeds the outstanding balance.');
  }

  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('payments')
    .insert([
      {
        invoice_id,
        amount: value,
        method,
        transaction_id: transaction_id || null,
        created_by: hasProfile ? user?.id : null,
      },
    ])
    .select()
    .single();
  if (error) throw error;

  notifyPendingCountChanged();

  return data;
}

// Admin-only corrections (record_refund / reverse_payment RPCs). These
// write a `refunds` row and recompute the invoice server-side.
export async function recordRefund({ payment_id, amount, reason }) {
  const { error } = await supabase.rpc('record_refund', {
    p_payment_id: payment_id,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw error;
  notifyPendingCountChanged();
}

export async function reversePayment({ payment_id, reason }) {
  const { error } = await supabase.rpc('reverse_payment', {
    p_payment_id: payment_id,
    p_reason: reason,
  });
  if (error) throw error;
  notifyPendingCountChanged();
}