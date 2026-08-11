/* ------------------------------------------------------------------
   MediCare HMS — Reports service
   Aggregations are computed inside PostgreSQL via RPC functions
   (see supabase/migrations/008_aggregate_functions.sql) so the
   browser never receives whole tables just to count/sum them.
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';

const STATUS_COLORS = {
  scheduled: '#2563eb',
  in_progress: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const INVOICE_STATUS_COLORS = {
  pending: '#f59e0b',
  paid: '#10b981',
  overdue: '#ef4444',
  cancelled: '#94a3b8',
};

const INVENTORY_STATUS_COLORS = {
  in_stock: '#10b981',
  low: '#f59e0b',
  out_of_stock: '#ef4444',
  expired: '#8b5cf6',
};

function toTitle(value) {
  return String(value || '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toNumber(value) {
  return Number(value || 0);
}

// Everything the Reports page needs in ONE PostgreSQL RPC call.
// The RPC returns a single jsonb payload which we shape here into
// the exact objects the page components already expect.
export async function fetchReportSummary() {
  const { data, error } = await supabase.rpc('get_report_summary');
  if (error) throw error;

  const appointmentsByStatus = (data?.appointmentsByStatus ?? []).map((r) => ({
    status: r.status,
    label: toTitle(r.status),
    value: toNumber(r.count),
    color: STATUS_COLORS[r.status],
  }));

  const appointmentsByDepartment = (data?.appointmentsByDepartment ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color || '#2563eb',
    count: toNumber(r.count),
  }));

  const revenue = (data?.revenueByStatus ?? []).map((r) => ({
    status: r.status,
    label: String(r.status || '').charAt(0).toUpperCase() + String(r.status || '').slice(1),
    amount: toNumber(r.amount),
    count: toNumber(r.count),
    color: INVOICE_STATUS_COLORS[r.status],
  }));

  const topDoctors = (data?.topDoctors ?? []).map((r) => ({
    id: r.id,
    name: r.name || 'Unknown doctor',
    specialization: r.specialization || '',
    count: toNumber(r.count),
  }));

  const inventoryStatus = (data?.inventoryStatus ?? []).map((r) => ({
    status: r.status,
    label: toTitle(r.status),
    value: toNumber(r.count),
    color: INVENTORY_STATUS_COLORS[r.status],
  }));

  const recentInvoices = (data?.recentInvoices ?? []).map((r) => ({
    id: r.id,
    invoice_no: r.invoice_no,
    total: r.total,
    paid_amount: r.paid_amount,
    status: r.status,
    created_at: r.created_at,
    patients: r.patient_name ? { name: r.patient_name } : null,
  }));

  return {
    totals: data?.totals ?? { patients: 0, doctors: 0, appointments: 0, inventory: 0, staff: 0, beds: 0 },
    billing: data?.billing ?? { collected: 0, outstanding: 0, overdue: 0, pendingCount: 0, pendingAmount: 0, total: 0 },
    appointmentsByStatus,
    appointmentsByDepartment,
    revenue,
    topDoctors,
    inventoryStatus,
    recentInvoices,
  };
}
