/* ------------------------------------------------------------------
   MediCare HMS — Reports service
   Aggregated, real data pulled from existing tables for the Reports page.
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

export function appointmentStatusColor(status) {
  return STATUS_COLORS[status] || '#94a3b8';
}

export function invoiceStatusColor(status) {
  return INVOICE_STATUS_COLORS[status] || '#94a3b8';
}

// Count of appointments grouped by status.
export async function getAppointmentsByStatus() {
  const { data, error } = await supabase.from('appointments').select('status');
  if (error) throw error;

  const tally = { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
  (data ?? []).forEach((a) => {
    const status = String(a.status || 'scheduled');
    if (status in tally) tally[status] += 1;
  });

  return Object.entries(tally)
    .map(([status, value]) => ({
      status,
      label: status
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      value,
      color: STATUS_COLORS[status],
    }))
    .filter((d) => d.value > 0);
}

// Appointment counts per department, joined with department name + color.
export async function getAppointmentsByDepartment() {
  const { data, error } = await supabase.from('appointments').select('department_id');
  if (error) throw error;

  const counts = {};
  (data ?? []).forEach((a) => {
    if (a.department_id) counts[a.department_id] = (counts[a.department_id] || 0) + 1;
  });

  const { data: depts, error: deptError } = await supabase
    .from('departments')
    .select('id, name, color');
  if (deptError) throw deptError;

  return (depts ?? [])
    .map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color || '#2563eb',
      count: counts[d.id] || 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Revenue broken down by invoice status.
export async function getRevenueByStatus() {
  const { data, error } = await supabase
    .from('invoices')
    .select('total, paid_amount, status');
  if (error) throw error;

  const tally = { pending: 0, paid: 0, overdue: 0, cancelled: 0 };
  const counts = { pending: 0, paid: 0, overdue: 0, cancelled: 0 };
  (data ?? []).forEach((inv) => {
    const status = String(inv.status || 'pending');
    if (status in tally) {
      tally[status] += Number(inv.total || 0);
      counts[status] += 1;
    }
  });

  return Object.entries(tally)
    .map(([status, amount]) => ({
      status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      amount,
      count: counts[status],
      color: INVOICE_STATUS_COLORS[status],
    }))
    .filter((d) => d.count > 0);
}

// Top doctors by number of appointments.
export async function getTopDoctors(limit = 5) {
  const { data, error } = await supabase
    .from('appointments')
    .select('doctor_id, doctors(name, specialization)');
  if (error) throw error;

  const counts = {};
  const info = {};
  (data ?? []).forEach((a) => {
    if (!a.doctor_id) return;
    counts[a.doctor_id] = (counts[a.doctor_id] || 0) + 1;
    info[a.doctor_id] = a.doctors || null;
  });

  return Object.entries(counts)
    .map(([id, count]) => ({
      id,
      name: info[id]?.name || 'Unknown doctor',
      specialization: info[id]?.specialization || '',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Inventory counts by stock status.
export async function getInventoryStatus() {
  const { data, error } = await supabase.from('inventory').select('status');
  if (error) throw error;

  const tally = { in_stock: 0, low: 0, out_of_stock: 0, expired: 0 };
  (data ?? []).forEach((i) => {
    const status = String(i.status || 'in_stock');
    if (status in tally) tally[status] += 1;
  });

  const colorMap = { in_stock: '#10b981', low: '#f59e0b', out_of_stock: '#ef4444', expired: '#8b5cf6' };
  return Object.entries(tally)
    .map(([status, value]) => ({
      status,
      label: status
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      value,
      color: colorMap[status],
    }))
    .filter((d) => d.value > 0);
}

// Recent invoices for the "Latest invoices" table.
export async function getRecentInvoices(limit = 6) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, total, paid_amount, status, created_at, patients(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Everything the Reports page needs in one shot.
export async function fetchReportData() {
  const [patientsRes, doctorsRes, apptRes, inventoryRes, staffRes, bedsRes] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('doctors').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }),
    supabase.from('inventory').select('id', { count: 'exact', head: true }),
    supabase.from('staff').select('id', { count: 'exact', head: true }),
    supabase.from('beds').select('id', { count: 'exact', head: true }),
  ]);

  for (const res of [patientsRes, doctorsRes, apptRes, inventoryRes, staffRes, bedsRes]) {
    if (res.error) throw res.error;
  }

  return {
    patients: patientsRes.count ?? 0,
    doctors: doctorsRes.count ?? 0,
    appointments: apptRes.count ?? 0,
    inventory: inventoryRes.count ?? 0,
    staff: staffRes.count ?? 0,
    beds: bedsRes.count ?? 0,
  };
}
