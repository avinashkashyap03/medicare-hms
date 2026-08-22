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

// Permanent removal: deletes every staff row linked to a login account
// (staff.user_id === profiles.id). Works from both tabs — the Staff tab
// supplies member.user_id and the All Profiles tab supplies acc.id,
// which are the same value.
export async function removeStaffByUser(userId) {
  const { data, error } = await supabase
    .from('staff')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) throw toFriendlyStaffError(error);

  // Supabase/RLS quirk: a blocked DELETE returns success with zero rows.
  // Surface that as a real error instead of silently doing nothing.
  if (!data || data.length === 0) {
    throw new Error(
      'Staff record could not be deleted (permission denied or not found). Run the latest has_permission() migration.'
    );
  }

  return data;
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

// Accounts awaiting an administrator's approval, with their auth email.
// Admin-only SECURITY DEFINER RPC (profiles has no email column and
// PostgREST cannot join auth.users, so the client reads emails this way).
export async function fetchPendingProfiles() {
  const { data, error } = await supabase.rpc('admin_list_pending_profiles');
  if (error) throw error;
  return data ?? [];
}

// Every account (all profiles) with their auth email — admin only.
// Same SECURITY DEFINER RPC pattern as fetchPendingProfiles, so non-admins
// get a 42501 from the database even though the UI never shows this tab.
export async function fetchAllProfiles() {
  const { data, error } = await supabase.rpc('admin_list_all_profiles');
  if (error) throw error;
  return data ?? [];
}

// Atomic approval via the secure RPC: sets role + status='active' in one
// database update. The client only supplies the target's email; the
// function resolves the profile, validates the caller, and writes the
// audit log. The frontend never touches profiles.role/status directly.
export async function approveStaff(email, role, reason) {
  const { error } = await supabase.rpc('admin_approve_staff', {
    target_email: email,
    new_role: role,
    reason,
  });
  if (error) throw error;
}

export async function setUserRole(profileId, role, reason) {
  const { error } = await supabase.rpc('admin_set_profile_role', {
    p_target: profileId,
    new_role: role,
    p_reason: reason,
  });
  if (error) throw error;
}

// Permanent removal via the secure RPC: deletes all staff rows for the
// account AND deactivates the login in one server-side transaction.
// SECURITY DEFINER, so it works even where direct RLS deletes silently
// delete zero rows. Returns the number of staff records removed.
export async function adminRemoveStaff(userId, reason) {
  const { data, error } = await supabase.rpc('admin_remove_staff', {
    p_target: userId,
    p_reason: reason,
  });
  if (error) throw error;
  return data ?? 0;
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
