/* ------------------------------------------------------------------
   MediCare HMS — Appointments service
   Real data layer for the `appointments` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const APPOINTMENT_SELECT =
  'id, patient_id, doctor_id, department_id, date, time, type, reason, status, notes, created_by, created_at, patients(name, mrn), doctors(name, department_id, specialization), departments(name)';

// Local calendar date (YYYY-MM-DD). `toISOString()` is UTC and can shift a
// day for users east of UTC, so never use it for "today".
export function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toFriendlyAppointmentError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23503' || message.toLowerCase().includes('foreign key')) {
    return new Error('Please select a valid patient and doctor.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage appointments.');
  }
  return error;
}

export async function getTodayAppointmentCount() {
  const today = localDateString();
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('date', today);

  if (error) throw error;
  return count ?? 0;
}

export async function getAppointmentCount() {
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function fetchTodaysAppointments(limit = 12) {
  const today = localDateString();
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('date', today)
    .order('time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Resolve appointment IDs matching a search term. PostgREST cannot parse an
// `or()` that mixes direct columns with embedded (joined) columns like
// `patients.name`, so search each source separately and union the IDs.
async function searchAppointmentIds(search) {
  const term = `%${search.trim()}%`;
  const ids = new Set();

  const { data: localMatches } = await supabase
    .from('appointments')
    .select('id')
    .or(`type.ilike.${term},reason.ilike.${term}`);
  (localMatches ?? []).forEach((r) => ids.add(r.id));

  const { data: matchingPatients } = await supabase
    .from('patients')
    .select('id')
    .ilike('name', term);
  if (matchingPatients?.length) {
    const { data: viaPatient } = await supabase
      .from('appointments')
      .select('id')
      .in('patient_id', matchingPatients.map((p) => p.id));
    (viaPatient ?? []).forEach((r) => ids.add(r.id));
  }

  const { data: matchingDoctors } = await supabase
    .from('doctors')
    .select('id')
    .ilike('name', term);
  if (matchingDoctors?.length) {
    const { data: viaDoctor } = await supabase
      .from('appointments')
      .select('id')
      .in('doctor_id', matchingDoctors.map((d) => d.id));
    (viaDoctor ?? []).forEach((r) => ids.add(r.id));
  }

  return [...ids];
}

export async function fetchAppointments({ search = '', page = 1, pageSize = 20, status = '', date = '' } = {}) {
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT, { count: 'exact' })
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (date) query = query.eq('date', date);
  if (status) query = query.eq('status', status);

  if (search.trim()) {
    const ids = await searchAppointmentIds(search);
    if (ids.length === 0) return { data: [], count: 0 };
    query = query.in('id', ids);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function addAppointment(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('appointments')
    .insert([
      {
        ...payload,
        department_id: payload.department_id || null,
        created_by: hasProfile ? payload.created_by : null,
      },
    ])
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) throw toFriendlyAppointmentError(error);
  return data;
}

// Lightweight appointment lookup for the Billing "link appointment"
// dropdown — max `limit` rows, optionally scoped to one patient.
export async function searchAppointmentOptions(search = '', patientId = '', limit = 20) {
  let query = supabase
    .from('appointments')
    .select('id, patient_id, date, time, type, patients(name)');

  if (patientId) query = query.eq('patient_id', patientId);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`type.ilike.${term},reason.ilike.${term}`);
  }

  const { data, error } = await query.order('date', { ascending: false }).limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function updateAppointment(id, payload) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ ...payload, department_id: payload.department_id || null })
    .eq('id', id)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) throw toFriendlyAppointmentError(error);
  return data;
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

function formatTime(time) {
  if (!time) return '—';
  const [h, m] = String(time).slice(0, 5).split(':').map(Number);
  if (h === undefined || m === undefined) return time;
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export { formatTime, formatDate };