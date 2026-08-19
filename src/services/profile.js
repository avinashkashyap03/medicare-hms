/* ------------------------------------------------------------------
   MediCare HMS — Profile service
   Real data layer for the signed-in user's own `profiles` row.
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';

const PROFILE_SELECT =
  'id, full_name, role, status, phone, designation, created_at';

function toFriendlyProfileError(error) {
  const message = String(error?.message ?? '');
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to update this profile.');
  }
  return error;
}

export async function fetchOwnProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updateOwnProfile(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw toFriendlyProfileError(error);
  return data;
}

// Confirm the current password before allowing a password change.
export async function verifyPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}