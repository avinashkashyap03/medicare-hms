/* ------------------------------------------------------------------
   MediCare HMS — Staff service
   Real data layer for the `staff` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const STAFF_SELECT =
  'id, user_id, name, designation, department_id, phone, email, shift, salary, hire_date, status, created_by, created_at, updated_at, departments(name, color), profiles!staff_user_id_fkey(status, role)';

export const STAFF_STATUS_OPTIONS = ['active', 'on_leave', 'inactive'];

function toFriendlyStaffError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23503' || message.toLowerCase().includes('foreign key')) {
    return new Error('Please select a valid department.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage staff.');
  }
  return error;
}

export async function fetchStaffPage({ search = '', page = 1, pageSize = 20, department = '' } = {}) {
  let query = supabase
    .from('staff')
    .select(STAFF_SELECT, { count: 'exact' })
    .order('name', { ascending: true });

  if (department) query = query.eq('department_id', department);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${term},designation.ilike.${term},phone.ilike.${term},email.ilike.${term}`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getStaffCount() {
  const { count, error } = await supabase
    .from('staff')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function addStaff(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('staff')
    .insert([
      {
        ...payload,
        department_id: payload.department_id || null,
        created_by: hasProfile ? payload.created_by : null,
      },
    ])
    .select(STAFF_SELECT)
    .single();

  if (error) throw toFriendlyStaffError(error);
  return data;
}

export async function updateStaff(id, payload) {
  const { data, error } = await supabase
    .from('staff')
    .update({ ...payload, department_id: payload.department_id || null })
    .eq('id', id)
    .select(STAFF_SELECT)
    .single();

  if (error) throw toFriendlyStaffError(error);
  return data;
}

export async function deleteStaff(id) {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw error;
}

// Staff summary — totals and counts by status + designations map.
// Aggregated inside PostgreSQL (get_staff_stats RPC) instead of
// transferring every row into JavaScript.
export async function getStaffStats() {
  const { data, error } = await supabase.rpc('get_staff_stats');
  if (error) throw error;
  return data;
}

// ---------- Account approvals (admin) ----------

// Accounts awaiting an administrator's approval. RLS lets admins read
// every profile, so this is admin-only in practice.
export async function fetchPendingProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Atomic approval: sets role + status='active' in one update (RPC).
export async function approveStaff(profileId, role, reason) {
  const { error } = await supabase.rpc('admin_approve_staff', {
    p_target: profileId,
    p_role: role,
    p_reason: reason,
  });
  if (error) throw error;
}

// Suspend / deactivate / reactivate an account (RPC).
export async function setUserStatus(profileId, status, reason) {
  const { error } = await supabase.rpc('admin_set_user_status', {
    p_target: profileId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}
