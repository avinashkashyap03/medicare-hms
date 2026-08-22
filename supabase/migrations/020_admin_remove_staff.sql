-- ============================================================
-- MediCare HMS — 020_admin_remove_staff.sql
-- RUN AFTER 019
-- ------------------------------------------------------------
-- admin_remove_staff(p_target uuid, p_reason text)
--
-- Permanent removal of a staff member from the Staff page:
--   * deletes every `staff` row linked to the target account
--     (staff.user_id = profiles.id)
--   * deactivates the login account so it can no longer sign in
--     and the auto-staff trigger (019) cannot recreate a record
--
-- SECURITY DEFINER so the DELETE succeeds regardless of which
-- RLS policy combination applies to the caller. Guards mirror
-- admin_set_user_status:
--   * caller must be an ACTIVE admin
--   * reason is required (audit trail)
--   * no self-removal; admin accounts untouchable
--   * every call writes an audit_logs entry with the number of
--     staff rows removed
-- Returns the count of deleted staff rows.
-- ============================================================

create or replace function public.admin_remove_staff(p_target uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role public.user_role;
  v_target_name text;
  v_deleted integer;
begin
  -- Caller must be an authenticated, ACTIVE admin.
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can remove staff';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to remove staff';
  end if;

  if p_target = auth.uid() then
    raise exception 'You cannot remove your own account';
  end if;

  select role, full_name into v_target_role, v_target_name
  from public.profiles where id = p_target;
  if not found then
    raise exception 'No profile found for the given user';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Admin accounts cannot be removed';
  end if;

  delete from public.staff where user_id = p_target;
  get diagnostics v_deleted = row_count;

  -- Deactivate the login so it cannot sign in and trigger 019
  -- cannot recreate a staff row on reactivation without approval.
  update public.profiles set status = 'deactivated' where id = p_target;

  perform public.log_audit(
    auth.uid(),
    'staff_removed',
    'profiles',
    p_target,
    jsonb_build_object(
      'target_name', v_target_name,
      'staff_rows_deleted', v_deleted,
      'new_status', 'deactivated',
      'reason', trim(p_reason)
    )
  );

  return v_deleted;
end;
$$;

revoke execute on function public.admin_remove_staff(uuid, text) from public, anon;
grant execute on function public.admin_remove_staff(uuid, text) to authenticated;
