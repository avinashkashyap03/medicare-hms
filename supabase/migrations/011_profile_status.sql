-- ============================================================
-- MediCare HMS — 011_profile_status.sql
-- RUN AFTER 010
-- ------------------------------------------------------------
-- Adds account lifecycle status to profiles:
--   1) account_status enum (pending / active / suspended / deactivated).
--   2) profiles.status column (default 'pending').
--   3) role default reverts to 'staff'; the signup trigger now creates
--      staff + pending accounts (previously 'user' + no status).
--   4) is_active() helper (SECURITY DEFINER) used by policies/guards.
--   5) Backfill: every existing profile becomes status = 'active' so
--      current users keep working. role values are NOT touched here —
--      the gated 'user' -> 'staff' backfill lives in 011b.
--   6) Profiles RLS updates:
--        * users may only self-update when role AND status are unchanged;
--        * self-insert is limited to role = 'staff' + status = 'pending'
--          (defaults), so nobody can self-promote;
--        * the admin update policy requires role/status unchanged, so even
--          admins cannot change role/status through direct SQL — only the
--          SECURITY DEFINER RPCs in 013 may.
--
-- IMPORTANT: role backfill is deliberately NOT in this file. Run the
-- read-only verification queries first (see README), review the output,
-- then apply 011b_role_backfill.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1) account_status enum
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t where t.typname = 'account_status'
  ) then
    create type account_status as enum ('pending', 'active', 'suspended', 'deactivated');
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2) profiles.status column (default 'pending')
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists status account_status not null default 'pending';

-- ------------------------------------------------------------
-- 3) role default + signup trigger now create staff + pending
-- ------------------------------------------------------------
alter table public.profiles alter column role set default 'staff';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User'),
    'staff',
    'pending'
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4) is_active() — SECURITY DEFINER so policies/guards can read
--    the caller's status without recursion.
-- ------------------------------------------------------------
create or replace function public.is_active()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

revoke execute on function public.is_active() from public, anon;
grant execute on function public.is_active() to authenticated;

-- ------------------------------------------------------------
-- 5) Backfill: existing accounts become active (no role changes)
-- ------------------------------------------------------------
update public.profiles
set status = 'active'
where status is distinct from 'active';

-- ------------------------------------------------------------
-- 6) profiles policies
-- ------------------------------------------------------------
drop policy if exists "update_own_profile" on profiles;
create policy "update_own_profile" on profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "insert_own_profile" on profiles;
create policy "insert_own_profile" on profiles
  for insert with check (auth.uid() = id and role = 'staff' and status = 'pending');

drop policy if exists "admin_update_all_profiles" on profiles;
create policy "admin_update_all_profiles" on profiles
  for update using (public.is_admin())
  with check (
    public.is_admin()
    and role = (select p.role from public.profiles p where p.id = profiles.id)
    and status = (select p.status from public.profiles p where p.id = profiles.id)
  );