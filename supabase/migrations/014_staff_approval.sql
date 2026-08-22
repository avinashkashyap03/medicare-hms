-- ============================================================
-- MediCare HMS — 014_staff_approval.sql
-- RUN AFTER 013 (needs log_audit / audit_logs)
-- ------------------------------------------------------------
-- Staff Approval & Receptionist Role Assignment.
--
--   1) admin_approve_staff(target_email, new_role, reason) —
--      the SINGLE sanctioned path for approving a pending signup:
--      atomically sets role + status='active' in one UPDATE, from an
--      email (not a raw id). SECURITY DEFINER + safe search_path.
--        * caller must be an ACTIVE admin
--        * new_role must be an assignable role ('staff' | 'receptionist');
--          'admin' can never be assigned through this function
--        * target must exist (resolved via auth.users email) and must not
--          be an admin account or the caller themselves
--        * reason is required (audit trail)
--        * every call writes an audit_logs entry (old/new role, old/new
--          status, target name, reason)
--
--   2) admin_set_user_role(target_email, new_role, reason) —
--      replaces the 010/013 email-based role change. Same guards plus a
--      required reason and an explicit no-self-modification check; the
--      assignable set is the same initial set (staff / receptionist).
--      Status is never touched here (that is admin_set_user_status /
--      admin_approve_staff).
--
--   3) admin_list_pending_profiles() — admin-only RPC that lists
--      accounts awaiting approval WITH their auth email (profiles has no
--      email column and PostgREST cannot join auth.users, so the client
--      needs this SECURITY DEFINER helper to render the approval UI).
--
-- The frontend NEVER writes profiles.role/status directly — RLS (011)
-- makes role/status immutable even for admins, so every role/status
-- change must go through a SECURITY DEFINER function above.
-- ============================================================

-- ------------------------------------------------------------
-- 1) admin_approve_staff(target_email, new_role, reason)
--    NOTE: 013 defined this with (uuid, user_role, text); it is dropped
--    and re-created email-based per the workflow spec.
-- ------------------------------------------------------------
drop function if exists public.admin_approve_staff(uuid, public.user_role, text);

create or replace function public.admin_approve_staff(target_email text, new_role public.user_role, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_target_name text;
  v_old_role public.user_role;
  v_old_status public.account_status;
begin
  -- Caller must be an authenticated, ACTIVE admin.
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can approve staff';
  end if;

  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'A target email is required';
  end if;

  -- reason is mandatory so every approval is auditable.
  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required to approve staff';
  end if;

  -- Assignable roles for the initial rollout. 'admin' is never assignable.
  if new_role not in ('staff', 'receptionist') then
    raise exception 'Role % cannot be assigned through staff approval', new_role;
  end if;

  -- Resolve the target profile by email (join auth.users inside the
  -- SECURITY DEFINER context; the client only ever passes an email).
  select p.id, p.full_name, p.role, p.status
  into v_target, v_target_name, v_old_role, v_old_status
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(target_email));

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;

  -- No self-approval / self-modification, and admin accounts are untouchable.
  if v_target = auth.uid() then
    raise exception 'You cannot approve your own account';
  end if;

  if v_old_role = 'admin' then
    raise exception 'Admin accounts cannot be modified';
  end if;

  -- Atomic approval: role + status in ONE update.
  update public.profiles
  set role = new_role, status = 'active'
  where id = v_target;

  perform public.log_audit(
    auth.uid(),
    'staff_approved',
    'profiles',
    v_target,
    jsonb_build_object(
      'target_name', v_target_name,
      'old_role', v_old_role,
      'new_role', new_role,
      'old_status', v_old_status,
      'new_status', 'active',
      'reason', trim(reason)
    )
  );
end;
$$;

revoke execute on function public.admin_approve_staff(text, public.user_role, text) from public, anon;
grant execute on function public.admin_approve_staff(text, public.user_role, text) to authenticated;

-- ------------------------------------------------------------
-- 2) admin_set_user_role(target_email, new_role, reason)
--    Replaces 010/013 (text, user_role) with a reason-requiring,
--    self-modification-proof version. Same assignable set.
-- ------------------------------------------------------------
drop function if exists public.admin_set_user_role(text, public.user_role);

create or replace function public.admin_set_user_role(target_email text, new_role public.user_role, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_target_name text;
  v_old_role public.user_role;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can change user roles';
  end if;

  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'A target email is required';
  end if;

  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required to change a user role';
  end if;

  -- Admin is never assignable, and the initial assignable set mirrors
  -- admin_approve_staff (staff / receptionist).
  if new_role not in ('staff', 'receptionist') then
    raise exception 'Role % cannot be assigned', new_role;
  end if;

  select p.id, p.full_name, p.role
  into v_target, v_target_name, v_old_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(target_email));

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;

  -- No self-promotion / self-modification.
  if v_target = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  if v_old_role = 'admin' then
    raise exception 'Admin accounts cannot be modified';
  end if;

  update public.profiles set role = new_role where id = v_target;

  perform public.log_audit(
    auth.uid(),
    'role_changed',
    'profiles',
    v_target,
    jsonb_build_object(
      'target_name', v_target_name,
      'old_role', v_old_role,
      'new_role', new_role,
      'reason', trim(reason)
    )
  );
end;
$$;

revoke execute on function public.admin_set_user_role(text, public.user_role, text) from public, anon;
grant execute on function public.admin_set_user_role(text, public.user_role, text) to authenticated;

-- ------------------------------------------------------------
-- 3) admin_list_pending_profiles()
--    Admin-only: pending accounts + auth email for the approval UI.
-- ------------------------------------------------------------
drop function if exists public.admin_list_pending_profiles();

create function public.admin_list_pending_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Qualify columns: RETURNS TABLE exposes id/role/status as OUT vars.
  if not exists (
    select 1
    from public.profiles caller
    where caller.id = auth.uid()
      and caller.role = 'admin'::public.user_role
      and caller.status = 'active'::public.account_status
  ) then
    raise exception 'Only an active administrator can list pending profiles'
      using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.full_name,
      u.email::text,
      p.role::text,
      p.status::text,
      p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.status = 'pending'::public.account_status
    order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_list_pending_profiles() from public, anon;
grant execute on function public.admin_list_pending_profiles() to authenticated;