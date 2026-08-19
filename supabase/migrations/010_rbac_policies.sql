-- ============================================================
-- MediCare HMS — 010_rbac_policies.sql
-- RUN SECOND (after 009, which adds the 'user' enum value)
-- ------------------------------------------------------------
-- RBAC roles + policies:
--   1) Defaults new profiles to role = 'user'.
--   2) The signup trigger now assigns 'user' (was 'staff').
--   3) is_admin() helper (SECURITY DEFINER) used by RLS policies.
--   4) admin_set_user_role() — secure, admin-only role changes.
--   5) Closes the profiles self-promotion holes:
--        * UPDATE own profile requires the new role to equal the
--          existing role (role is immutable for non-service paths).
--        * INSERT of your own profile is limited to role = 'user'.
--   6) Admins can SELECT/UPDATE any profile.
--   7) Admin-only modules (departments, invoices, payments,
--      inventory, staff, pharmacy) keep the existing shared
--      SELECT policies (preserves dashboards) but restrict
--      INSERT/UPDATE/DELETE to admins.
--
-- patients, doctors and appointments keep their existing shared
-- CRUD policies (user-accessible modules). prescriptions and beds
-- are not surfaced by any page and are left unchanged.
--
-- IMPORTANT: existing profile rows are NOT modified. No backfill.
-- The app treats any role other than 'admin' as a regular user,
-- so pre-existing 'staff' / 'doctor' / ... values are preserved
-- safely and remain functional until future role phases activate
-- them.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Default role for any insert that omits `role` = 'user'
-- ------------------------------------------------------------
alter table public.profiles alter column role set default 'user';

-- ------------------------------------------------------------
-- 2) Signup trigger assigns 'user' (was 'staff')
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User'),
    'user'
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3) is_admin() — SECURITY DEFINER so RLS policies and RPC
--    guards can read the caller's role without recursion.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 4) admin_set_user_role — the ONLY sanctioned path for role
--    changes besides the postgres/service-role SQL editor.
--    Verifies the caller is an existing admin first.
-- ------------------------------------------------------------
create or replace function public.admin_set_user_role(target_email text, new_role user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only an administrator can change user roles';
  end if;

  update public.profiles p
  set role = new_role
  from auth.users u
  where p.id = u.id and u.email = target_email;

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;
end;
$$;

revoke execute on function public.admin_set_user_role(text, user_role) from public, anon;
grant execute on function public.admin_set_user_role(text, user_role) to authenticated;

-- ------------------------------------------------------------
-- 5) profiles policies
-- ------------------------------------------------------------
drop policy if exists "update_own_profile" on profiles;
create policy "update_own_profile" on profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "insert_own_profile" on profiles;
create policy "insert_own_profile" on profiles
  for insert with check (auth.uid() = id and role = 'user');

create policy "admin_read_all_profiles" on profiles
  for select using (public.is_admin());

create policy "admin_update_all_profiles" on profiles
  for update using (public.is_admin());

-- ------------------------------------------------------------
-- 6) departments — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_departments" on departments;
create policy "admin_insert_departments" on departments
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_departments" on departments;
create policy "admin_update_departments" on departments
  for update using (public.is_admin());
drop policy if exists "all_users_delete_departments" on departments;
create policy "admin_delete_departments" on departments
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 7) invoices — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_invoices" on invoices;
create policy "admin_insert_invoices" on invoices
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_invoices" on invoices;
create policy "admin_update_invoices" on invoices
  for update using (public.is_admin());
drop policy if exists "all_users_delete_invoices" on invoices;
create policy "admin_delete_invoices" on invoices
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 8) payments — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_payments" on payments;
create policy "admin_insert_payments" on payments
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_payments" on payments;
create policy "admin_update_payments" on payments
  for update using (public.is_admin());
drop policy if exists "all_users_delete_payments" on payments;
create policy "admin_delete_payments" on payments
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 9) inventory — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_inventory" on inventory;
create policy "admin_insert_inventory" on inventory
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_inventory" on inventory;
create policy "admin_update_inventory" on inventory
  for update using (public.is_admin());
drop policy if exists "all_users_delete_inventory" on inventory;
create policy "admin_delete_inventory" on inventory
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 10) staff — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_staff" on staff;
create policy "admin_insert_staff" on staff
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_staff" on staff;
create policy "admin_update_staff" on staff
  for update using (public.is_admin());
drop policy if exists "all_users_delete_staff" on staff;
create policy "admin_delete_staff" on staff
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 11) pharmacy — writes restricted to admins
-- ------------------------------------------------------------
drop policy if exists "all_users_insert_pharmacy" on pharmacy;
create policy "admin_insert_pharmacy" on pharmacy
  for insert with check (public.is_admin());
drop policy if exists "all_users_update_pharmacy" on pharmacy;
create policy "admin_update_pharmacy" on pharmacy
  for update using (public.is_admin());
drop policy if exists "all_users_delete_pharmacy" on pharmacy;
create policy "admin_delete_pharmacy" on pharmacy
  for delete using (public.is_admin());