-- ============================================================
-- MediCare HMS — 003_rls_policies.sql
-- RUN THIRD (after 002)
-- ============================================================

alter table profiles     enable row level security;
alter table departments  enable row level security;
alter table doctors      enable row level security;
alter table patients     enable row level security;
alter table appointments enable row level security;
alter table invoices     enable row level security;
alter table payments     enable row level security;
alter table inventory    enable row level security;
alter table staff        enable row level security;
alter table pharmacy     enable row level security;
alter table prescriptions enable row level security;
alter table beds         enable row level security;

-- profiles: ONLY khud ka profile (per-user)
create policy "select_own_profile" on profiles
  for select using (auth.uid() = id);
create policy "update_own_profile" on profiles
  for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- NOTE (intentional design — NOT an accidental security hole):
-- The current system uses a SHARED hospital access model. Every
-- authenticated user can read/write all business tables. This is
-- deliberate for this phase of the application.
-- Role-based restrictions (admin/doctor/receptionist/nurse/...)
-- are planned for a future phase; those policies should replace
-- the ones below when that work lands. Do not treat these as a
-- bug to be "fixed" in isolation.
-- ------------------------------------------------------------
-- Business tables: SHARED (koi bhi logged-in user)
create policy "all_users_read_departments"  on departments  for select using (auth.uid() is not null);
create policy "all_users_insert_departments" on departments  for insert with check (auth.uid() is not null);
create policy "all_users_update_departments" on departments  for update using (auth.uid() is not null);
create policy "all_users_delete_departments" on departments  for delete using (auth.uid() is not null);

create policy "all_users_read_doctors"   on doctors   for select using (auth.uid() is not null);
create policy "all_users_insert_doctors"  on doctors   for insert with check (auth.uid() is not null);
create policy "all_users_update_doctors"  on doctors   for update using (auth.uid() is not null);
create policy "all_users_delete_doctors"  on doctors   for delete using (auth.uid() is not null);

create policy "all_users_read_patients"   on patients   for select using (auth.uid() is not null);
create policy "all_users_insert_patients"  on patients   for insert with check (auth.uid() is not null);
create policy "all_users_update_patients"  on patients   for update using (auth.uid() is not null);
create policy "all_users_delete_patients"  on patients   for delete using (auth.uid() is not null);

create policy "all_users_read_appointments"   on appointments   for select using (auth.uid() is not null);
create policy "all_users_insert_appointments"  on appointments   for insert with check (auth.uid() is not null);
create policy "all_users_update_appointments"  on appointments   for update using (auth.uid() is not null);
create policy "all_users_delete_appointments"  on appointments   for delete using (auth.uid() is not null);

create policy "all_users_read_invoices"   on invoices   for select using (auth.uid() is not null);
create policy "all_users_insert_invoices"  on invoices   for insert with check (auth.uid() is not null);
create policy "all_users_update_invoices"  on invoices   for update using (auth.uid() is not null);
create policy "all_users_delete_invoices"  on invoices   for delete using (auth.uid() is not null);

create policy "all_users_read_payments"   on payments   for select using (auth.uid() is not null);
create policy "all_users_insert_payments"  on payments   for insert with check (auth.uid() is not null);
create policy "all_users_update_payments"  on payments   for update using (auth.uid() is not null);
create policy "all_users_delete_payments"  on payments   for delete using (auth.uid() is not null);

create policy "all_users_read_inventory"   on inventory   for select using (auth.uid() is not null);
create policy "all_users_insert_inventory"  on inventory   for insert with check (auth.uid() is not null);
create policy "all_users_update_inventory"  on inventory   for update using (auth.uid() is not null);
create policy "all_users_delete_inventory"  on inventory   for delete using (auth.uid() is not null);

create policy "all_users_read_staff"   on staff   for select using (auth.uid() is not null);
create policy "all_users_insert_staff"  on staff   for insert with check (auth.uid() is not null);
create policy "all_users_update_staff"  on staff   for update using (auth.uid() is not null);
create policy "all_users_delete_staff"  on staff   for delete using (auth.uid() is not null);

create policy "all_users_read_pharmacy"   on pharmacy   for select using (auth.uid() is not null);
create policy "all_users_insert_pharmacy"  on pharmacy   for insert with check (auth.uid() is not null);
create policy "all_users_update_pharmacy"  on pharmacy   for update using (auth.uid() is not null);
create policy "all_users_delete_pharmacy"  on pharmacy   for delete using (auth.uid() is not null);

create policy "all_users_read_prescriptions"   on prescriptions   for select using (auth.uid() is not null);
create policy "all_users_insert_prescriptions"  on prescriptions   for insert with check (auth.uid() is not null);
create policy "all_users_update_prescriptions"  on prescriptions   for update using (auth.uid() is not null);
create policy "all_users_delete_prescriptions"  on prescriptions   for delete using (auth.uid() is not null);

create policy "all_users_read_beds"   on beds   for select using (auth.uid() is not null);
create policy "all_users_insert_beds"  on beds   for insert with check (auth.uid() is not null);
create policy "all_users_update_beds"  on beds   for update using (auth.uid() is not null);
create policy "all_users_delete_beds"  on beds   for delete using (auth.uid() is not null);