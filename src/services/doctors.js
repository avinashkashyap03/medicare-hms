/* ------------------------------------------------------------------
   MediCare HMS — Doctors service
   Real data layer for the `doctors` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const DOCTOR_SELECT =
  'id, user_id, name, department_id, specialization, license_no, phone, email, fee, status, created_by, created_at, departments(name, color)';

function toFriendlyDoctorError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('License number already exists. Please use a different one.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage doctors.');
  }
  return error;
}

export async function fetchDoctors({ search = '', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('doctors')
    .select(DOCTOR_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},specialization.ilike.${term},license_no.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function addDoctor(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('doctors')
    .insert([{ ...payload, created_by: hasProfile ? payload.created_by : null }])
    .select(DOCTOR_SELECT)
    .single();

  if (error) throw toFriendlyDoctorError(error);
  return data;
}

export async function updateDoctor(id, payload) {
  const { data, error } = await supabase
    .from('doctors')
    .update(payload)
    .eq('id', id)
    .select(DOCTOR_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDoctor(id) {
  const { error } = await supabase.from('doctors').delete().eq('id', id);
  if (error) throw error;
}

export async function getDoctorCount() {
  const { count, error } = await supabase
    .from('doctors')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function fetchRecentDoctors(limit = 5) {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, name, specialization, department_id, status, departments(name, color)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Lightweight doctor lookup for search-as-you-type dropdowns
// (max `limit` rows; substring ILIKE is backed by pg_trgm indexes).
export async function searchDoctorOptions(search = '', limit = 20) {
  let query = supabase
    .from('doctors')
    .select('id, name, specialization, department_id')
    .order('name', { ascending: true });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},specialization.ilike.${term},license_no.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query.limit(limit);

  if (error) throw error;
  return data ?? [];
}