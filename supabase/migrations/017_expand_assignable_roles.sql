-- ============================================================
-- MediCare HMS — 017_expand_assignable_roles.sql
-- RUN AFTER 016
-- ------------------------------------------------------------
-- Admins can assign any operational role from the Staff page
-- (staff, receptionist, doctor, nurse, pharmacist, admin), for
-- pending signups AND existing accounts.
--
-- Still blocked: changing your own role (no self-promotion).
-- Other admin accounts CAN be reassigned (demote / change).
-- ============================================================

-- 1) Approval: any user_role, including admin
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
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'::public.user_role and status = 'active'::public.account_status
  ) then
    raise exception 'Only an active administrator can approve staff';
  end if;

  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'A target email is required';
  end if;

  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required to approve staff';
  end if;

  select p.id, p.full_name, p.role, p.status
  into v_target, v_target_name, v_old_role, v_old_status
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(target_email));

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;

  if v_target = auth.uid() then
    raise exception 'You cannot approve your own account';
  end if;

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

-- 2) Email-based role change: any user_role, including admin
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
    where id = auth.uid() and role = 'admin'::public.user_role and status = 'active'::public.account_status
  ) then
    raise exception 'Only an active administrator can change user roles';
  end if;

  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'A target email is required';
  end if;

  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required to change a user role';
  end if;

  select p.id, p.full_name, p.role
  into v_target, v_target_name, v_old_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(target_email));

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;

  if v_target = auth.uid() then
    raise exception 'You cannot change your own role';
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

-- 3) Profile-id role change (staff rows have user_id, email can be missing)
drop function if exists public.admin_set_profile_role(uuid, public.user_role, text);

create function public.admin_set_profile_role(p_target uuid, new_role public.user_role, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_name text;
  v_old_role public.user_role;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'::public.user_role and status = 'active'::public.account_status
  ) then
    raise exception 'Only an active administrator can change user roles';
  end if;

  if p_target is null then
    raise exception 'A target account is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to change a user role';
  end if;

  select p.full_name, p.role
  into v_target_name, v_old_role
  from public.profiles p
  where p.id = p_target;

  if not found then
    raise exception 'No user found with id %', p_target;
  end if;

  if p_target = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  update public.profiles set role = new_role where id = p_target;

  perform public.log_audit(
    auth.uid(),
    'role_changed',
    'profiles',
    p_target,
    jsonb_build_object(
      'target_name', v_target_name,
      'old_role', v_old_role,
      'new_role', new_role,
      'reason', trim(p_reason)
    )
  );
end;
$$;

revoke execute on function public.admin_set_profile_role(uuid, public.user_role, text) from public, anon;
grant execute on function public.admin_set_profile_role(uuid, public.user_role, text) to authenticated;
