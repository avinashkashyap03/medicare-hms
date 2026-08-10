/* ------------------------------------------------------------------
   MediCare HMS — Patients service
   Real data layer for the `patients` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';

const PATIENT_SELECT = 'id, mrn, name, dob, gender, phone, email, address, blood_group, allergies, insurance_no, emergency_contact, status, created_at, created_by';

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toFriendlyPatientError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('MR number already exists. Please refresh and try again.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to add patients.');
  }
  return error;
}

export async function ensureProfile(user) {
  if (!user?.id) return false;

  const { data: existing, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (findError) {
    console.warn('Failed to check profile:', findError);
    return false;
  }
  if (existing) return true;

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: user.user_metadata?.full_name || 'User',
  });
  if (error) {
    console.warn('Could not auto-create profile (RLS may be blocking):', error);
    return false;
  }
  return true;
}

export async function fetchPatients({ search = '', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('patients')
    .select(PATIENT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},mrn.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function addPatient(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('patients')
    .insert([{ ...payload, created_by: hasProfile ? payload.created_by : null, dob: toIsoDate(payload.dob) }])
    .select(PATIENT_SELECT)
    .single();

  if (error) throw toFriendlyPatientError(error);
  return data;
}

export async function updatePatient(id, payload) {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...payload, dob: toIsoDate(payload.dob) })
    .eq('id', id)
    .select(PATIENT_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePatient(id) {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) throw error;
}

export async function getPatientCount() {
  const { count, error } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function fetchRecentPatients(limit = 5) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, mrn, name, gender, dob, blood_group, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Next unique MRN (e.g. "P-9085") — numeric max across all rows.
// NOTE: ordering by the text column is lexicographic (P-9999 > P-10000), so we
// pull every value and reduce numerically to guarantee a fresh number.
export async function getNextMrn() {
  const { data, error } = await supabase.from('patients').select('mrn');

  if (error) throw error;

  const max = (data ?? []).reduce((m, p) => {
    const n = parseInt(String(p.mrn || '').replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 9000);

  return `P-${max + 1}`;
}