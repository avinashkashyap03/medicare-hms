/* ------------------------------------------------------------------
   MediCare HMS — Departments service
   Real data layer for the `departments` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const DEPARTMENT_SELECT =
  'id, name, description, color, head_doctor_id, created_by, created_at, doctors(name)';

function toFriendlyDepartmentError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('Department name already exists. Please use a different one.');
  }
  if (code === '23503' || message.toLowerCase().includes('foreign key')) {
    return new Error('Please select a valid head doctor.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage departments.');
  }
  return error;
}

// Lightweight list for forms/dropdowns (kept as an array for backwards use).
export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, color')
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDepartmentsPage({ search = '', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('departments')
    .select(DEPARTMENT_SELECT, { count: 'exact' })
    .order('name', { ascending: true });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getDepartmentCount() {
  const { count, error } = await supabase
    .from('departments')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function addDepartment(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('departments')
    .insert([
      {
        ...payload,
        head_doctor_id: payload.head_doctor_id || null,
        color: payload.color || '#2563eb',
        created_by: hasProfile ? payload.created_by : null,
      },
    ])
    .select(DEPARTMENT_SELECT)
    .single();

  if (error) throw toFriendlyDepartmentError(error);
  return data;
}

export async function updateDepartment(id, payload) {
  const { data, error } = await supabase
    .from('departments')
    .update({ ...payload, head_doctor_id: payload.head_doctor_id || null, color: payload.color || '#2563eb' })
    .eq('id', id)
    .select(DEPARTMENT_SELECT)
    .single();

  if (error) throw toFriendlyDepartmentError(error);
  return data;
}

export async function deleteDepartment(id) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
}

// Per-department doctor / appointment counts keyed by department_id.
// Lightweight selects are fine for this scale; swap for aggregates later if needed.
export async function getDepartmentStats() {
  const [doctorsRes, apptsRes] = await Promise.all([
    supabase.from('doctors').select('id, department_id'),
    supabase.from('appointments').select('id, department_id'),
  ]);

  if (doctorsRes.error) throw doctorsRes.error;
  if (apptsRes.error) throw apptsRes.error;

  const tally = (rows, key) =>
    (rows ?? []).reduce((acc, r) => {
      if (r[key]) acc[r[key]] = (acc[r[key]] || 0) + 1;
      return acc;
    }, {});

  return {
    doctors: tally(doctorsRes.data, 'department_id'),
    appointments: tally(apptsRes.data, 'department_id'),
  };
}