-- ============================================================
-- MediCare HMS — 012_permission_gating.sql
-- RUN AFTER 011 (profiles.status must exist; is_active/is_admin used)
-- ------------------------------------------------------------
-- Enforces the approved role matrix at the database layer.
--
--   1) has_permission(module, action) — SECURITY DEFINER, the single
--      source of truth for what each role may do. Requires an ACTIVE
--      account. Admin has full access; receptionist is read-mostly
--      front-desk; staff (and legacy doctor/nurse/pharmacist/user
--      roles) get general operational access.
--   2) Re-gates every surfaced business table with has_permission()
--      policies (SELECT + writes). Pending/suspended/deactivated
--      accounts lose access entirely (has_permission returns false).
--   3) Financial protection:
--        * invoices are editable ONLY while unpaid (paid_amount = 0)
--          and not paid/cancelled; a new status of 'paid'/'cancelled'
--          can never be written via direct SQL (SECURITY DEFINER
--          RPCs in 013 handle those transitions);
--        * invoice DELETE is admin-only and limited to unpaid,
--          non-paid invoices;
--        * payments have SELECT + INSERT policies ONLY — no update,
--          no delete — so payment history is append-only.
--   4) Payment INSERT validation trigger: positive amount, invoice
--      exists and is not paid/cancelled, never exceeds the
--      outstanding balance; non-admins are timestamped now().
--   5) Aggregate RPCs that other roles may call (get_billing_stats,
--      get_revenue_by_status, get_report_summary) become SECURITY
--      DEFINER with explicit module guards so a missing RLS policy
--      on one joined table can never leak or error for an authorised
--      caller.
--
-- prescriptions and beds are not surfaced by any page and are left
-- unchanged (documented in 003).
-- ============================================================

-- ------------------------------------------------------------
-- 1) has_permission(module, action)
--    Legacy roles (doctor/nurse/pharmacist/user) intentionally fall
--    through to the staff branch so pre-existing accounts keep their
--    operational access until future role phases activate them.
-- ------------------------------------------------------------
create or replace function public.has_permission(module text, action text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.user_role;
begin
  select p.role into r
  from public.profiles p
  where p.id = auth.uid() and p.status = 'active';

  if r is null then
    return false;
  end if;

  if r = 'admin' then
    return true;
  end if;

  -- Receptionist: strictly front-desk, read-mostly operations.
  if r = 'receptionist' then
    return (
      (module = 'patients'      and action in ('view', 'create', 'update')) or
      (module = 'doctors'       and action = 'view') or
      (module = 'appointments'  and action in ('view', 'create', 'update')) or
      (module = 'departments'   and action = 'view') or
      (module = 'billing'       and action in ('view', 'create', 'update', 'collect_payment')) or
      (module = 'payments'      and action in ('view', 'create'))
    );
  end if;

  -- Staff and legacy operational roles.
  return (
    (module = 'patients'      and action in ('view', 'create', 'update', 'delete')) or
    (module = 'doctors'       and action in ('view', 'create', 'update', 'delete')) or
    (module = 'appointments'  and action in ('view', 'create', 'update', 'delete')) or
    (module = 'departments'   and action = 'view') or
    (module = 'billing'       and action in ('view', 'create', 'update', 'collect_payment')) or
    (module = 'payments'      and action in ('view', 'create')) or
    (module = 'inventory'     and action = 'view') or
    (module = 'pharmacy'      and action = 'view') or
    (module = 'staff'         and action = 'view') or
    (module = 'reports'       and action = 'view')
  );
end;
$$;

revoke execute on function public.has_permission(text, text) from public, anon;
grant execute on function public.has_permission(text, text) to authenticated;

-- ------------------------------------------------------------
-- 2a) departments — view for active staff/receptionist/admin,
--     writes admin-only.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_departments" on departments;
create policy "permission_select_departments" on departments
  for select using (public.has_permission('departments', 'view'));
drop policy if exists "admin_insert_departments" on departments;
create policy "permission_insert_departments" on departments
  for insert with check (public.has_permission('departments', 'create'));
drop policy if exists "admin_update_departments" on departments;
create policy "permission_update_departments" on departments
  for update using (public.has_permission('departments', 'update'));
drop policy if exists "admin_delete_departments" on departments;
create policy "permission_delete_departments" on departments
  for delete using (public.has_permission('departments', 'delete'));

-- ------------------------------------------------------------
-- 2b) doctors — full CRUD for staff/admin, view-only receptionist.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_doctors" on doctors;
create policy "permission_select_doctors" on doctors
  for select using (public.has_permission('doctors', 'view'));
drop policy if exists "all_users_insert_doctors" on doctors;
create policy "permission_insert_doctors" on doctors
  for insert with check (public.has_permission('doctors', 'create'));
drop policy if exists "all_users_update_doctors" on doctors;
create policy "permission_update_doctors" on doctors
  for update using (public.has_permission('doctors', 'update'));
drop policy if exists "all_users_delete_doctors" on doctors;
create policy "permission_delete_doctors" on doctors
  for delete using (public.has_permission('doctors', 'delete'));

-- ------------------------------------------------------------
-- 2c) patients — full CRUD for staff/admin, no delete for
--     receptionist.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_patients" on patients;
create policy "permission_select_patients" on patients
  for select using (public.has_permission('patients', 'view'));
drop policy if exists "all_users_insert_patients" on patients;
create policy "permission_insert_patients" on patients
  for insert with check (public.has_permission('patients', 'create'));
drop policy if exists "all_users_update_patients" on patients;
create policy "permission_update_patients" on patients
  for update using (public.has_permission('patients', 'update'));
drop policy if exists "all_users_delete_patients" on patients;
create policy "permission_delete_patients" on patients
  for delete using (public.has_permission('patients', 'delete'));

-- ------------------------------------------------------------
-- 2d) appointments — full CRUD for staff/admin, no delete for
--     receptionist.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_appointments" on appointments;
create policy "permission_select_appointments" on appointments
  for select using (public.has_permission('appointments', 'view'));
drop policy if exists "all_users_insert_appointments" on appointments;
create policy "permission_insert_appointments" on appointments
  for insert with check (public.has_permission('appointments', 'create'));
drop policy if exists "all_users_update_appointments" on appointments;
create policy "permission_update_appointments" on appointments
  for update using (public.has_permission('appointments', 'update'));
drop policy if exists "all_users_delete_appointments" on appointments;
create policy "permission_delete_appointments" on appointments
  for delete using (public.has_permission('appointments', 'delete'));

-- ------------------------------------------------------------
-- 2e) invoices — editable only while unpaid + not paid/cancelled.
--     'paid' is reached through the payment recompute trigger (013);
--     'cancelled' only through admin_cancel_invoice (013).
-- ------------------------------------------------------------
drop policy if exists "all_users_read_invoices" on invoices;
create policy "permission_select_invoices" on invoices
  for select using (public.has_permission('billing', 'view'));

drop policy if exists "admin_insert_invoices" on invoices;
create policy "permission_insert_invoices" on invoices
  for insert with check (public.has_permission('billing', 'create'));

drop policy if exists "admin_update_invoices" on invoices;
create policy "permission_update_invoices" on invoices
  for update using (
    public.has_permission('billing', 'update')
    and status not in ('paid', 'cancelled')
    and paid_amount = 0
  )
  with check (
    public.has_permission('billing', 'update')
    and status not in ('paid', 'cancelled')
    and paid_amount = 0
    and not (status = 'paid' and paid_amount < total)
  );

drop policy if exists "admin_delete_invoices" on invoices;
create policy "permission_delete_invoices" on invoices
  for delete using (
    public.has_permission('billing', 'delete')
    and status <> 'paid'
    and paid_amount = 0
  );

-- ------------------------------------------------------------
-- 2f) payments — SELECT + INSERT only. No update/delete policies:
--     payment history is immutable for everyone (corrections are
--     handled by record_refund / reverse_payment in 013).
-- ------------------------------------------------------------
drop policy if exists "all_users_read_payments" on payments;
create policy "permission_select_payments" on payments
  for select using (public.has_permission('payments', 'view'));

drop policy if exists "all_users_insert_payments" on payments;
drop policy if exists "admin_insert_payments" on payments;
create policy "permission_insert_payments" on payments
  for insert with check (public.has_permission('payments', 'create'));

drop policy if exists "all_users_update_payments" on payments;
drop policy if exists "admin_update_payments" on payments;

drop policy if exists "all_users_delete_payments" on payments;
drop policy if exists "admin_delete_payments" on payments;

-- ------------------------------------------------------------
-- 2g) inventory — staff view-only, admin writes.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_inventory" on inventory;
create policy "permission_select_inventory" on inventory
  for select using (public.has_permission('inventory', 'view'));
drop policy if exists "admin_insert_inventory" on inventory;
create policy "permission_insert_inventory" on inventory
  for insert with check (public.has_permission('inventory', 'create'));
drop policy if exists "admin_update_inventory" on inventory;
create policy "permission_update_inventory" on inventory
  for update using (public.has_permission('inventory', 'update'));
drop policy if exists "admin_delete_inventory" on inventory;
create policy "permission_delete_inventory" on inventory
  for delete using (public.has_permission('inventory', 'delete'));

-- ------------------------------------------------------------
-- 2h) staff — staff view-only, admin writes.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_staff" on staff;
create policy "permission_select_staff" on staff
  for select using (public.has_permission('staff', 'view'));
drop policy if exists "admin_insert_staff" on staff;
create policy "permission_insert_staff" on staff
  for insert with check (public.has_permission('staff', 'create'));
drop policy if exists "admin_update_staff" on staff;
create policy "permission_update_staff" on staff
  for update using (public.has_permission('staff', 'update'));
drop policy if exists "admin_delete_staff" on staff;
create policy "permission_delete_staff" on staff
  for delete using (public.has_permission('staff', 'delete'));

-- ------------------------------------------------------------
-- 2i) pharmacy — staff view-only, admin writes.
-- ------------------------------------------------------------
drop policy if exists "all_users_read_pharmacy" on pharmacy;
create policy "permission_select_pharmacy" on pharmacy
  for select using (public.has_permission('pharmacy', 'view'));
drop policy if exists "admin_insert_pharmacy" on pharmacy;
create policy "permission_insert_pharmacy" on pharmacy
  for insert with check (public.has_permission('pharmacy', 'create'));
drop policy if exists "admin_update_pharmacy" on pharmacy;
create policy "permission_update_pharmacy" on pharmacy
  for update using (public.has_permission('pharmacy', 'update'));
drop policy if exists "admin_delete_pharmacy" on pharmacy;
create policy "permission_delete_pharmacy" on pharmacy
  for delete using (public.has_permission('pharmacy', 'delete'));

-- ------------------------------------------------------------
-- 3) Payment INSERT validation trigger.
--    SECURITY DEFINER so it can inspect the invoice while the RLS
--    insert policy only checks module-level permission.
-- ------------------------------------------------------------
create or replace function public.validate_payment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices%rowtype;
begin
  if new.amount is null or new.amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into inv from public.invoices where id = new.invoice_id;
  if not found then
    raise exception 'Invoice does not exist';
  end if;

  if inv.status in ('paid', 'cancelled') then
    raise exception 'Cannot add a payment to a % invoice', inv.status;
  end if;

  if new.amount > inv.total - inv.paid_amount then
    raise exception 'Payment amount exceeds the outstanding balance';
  end if;

  -- Non-admins cannot backdate; admins may (via the service key / SQL
  -- editor) for reconciliation. SECURITY DEFINER path enforces now().
  if new.paid_at is null or not public.is_admin() then
    new.paid_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists validate_payment_insert on payments;
create trigger validate_payment_insert
  before insert on payments
  for each row execute function public.validate_payment_insert();

-- ------------------------------------------------------------
-- 4) Aggregate RPCs → SECURITY DEFINER with explicit module guards.
--    Guards call has_permission(), so only active accounts with the
--    right module access can execute; joins can no longer leak/error
--    on tables the caller has no RLS policy for.
-- ------------------------------------------------------------
create or replace function public.get_billing_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('billing', 'view') then
    raise insufficient_privilege;
  end if;

  select jsonb_build_object(
    'collected',     collected,
    'outstanding',   outstanding,
    'overdue',       overdue,
    'pendingCount',  pending_count,
    'pendingAmount', pending_amount,
    'total',         total
  )
  into result
  from (
    select
      coalesce(sum(paid_amount) filter (where status <> 'cancelled'), 0) as collected,
      coalesce(sum(greatest(total - paid_amount, 0)) filter (where status <> 'cancelled'), 0) as outstanding,
      coalesce(sum(greatest(total - paid_amount, 0)) filter (
        where status <> 'cancelled'
          and greatest(total - paid_amount, 0) > 0
          and (status = 'overdue' or (status = 'pending' and due_date < current_date))
      ), 0) as overdue,
      count(*) filter (where status = 'pending') as pending_count,
      coalesce(sum(greatest(total - paid_amount, 0)) filter (where status = 'pending'), 0) as pending_amount,
      count(*) as total
    from public.invoices
  ) s;

  return result;
end;
$$;

create or replace function public.get_revenue_by_status()
returns table (status text, amount numeric, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('billing', 'view') then
    raise insufficient_privilege;
  end if;

  return query
    select s.status::text as status, s.amount::numeric as amount, s.cnt::bigint as count
    from (
      select status, sum(total) as amount, count(*) as cnt
      from public.invoices
      group by status
      order by status
    ) s;
end;
$$;

create or replace function public.get_report_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('reports', 'view') then
    raise insufficient_privilege;
  end if;

  with counts as (
    select
      (select count(*) from public.patients)    as patients,
      (select count(*) from public.doctors)     as doctors,
      (select count(*) from public.appointments) as appointments,
      (select count(*) from public.inventory)   as inventory,
      (select count(*) from public.staff)       as staff,
      (select count(*) from public.beds)        as beds
  ),
  appt_status as (
    select status, count(*) as cnt
    from public.appointments
    group by status
  ),
  dept_appts as (
    select d.id, d.name, coalesce(d.color, '#2563eb') as color, s.cnt
    from public.departments d
    join (
      select department_id, count(*) as cnt
      from public.appointments
      where department_id is not null
      group by department_id
    ) s on s.department_id = d.id
  ),
  revenue as (
    select status, sum(total) as amount, count(*) as cnt
    from public.invoices
    group by status
  ),
  top_docs as (
    select d.id, coalesce(d.name, 'Unknown doctor') as name, coalesce(d.specialization, '') as specialization, s.cnt
    from (
      select doctor_id, count(*) as cnt
      from public.appointments
      where doctor_id is not null
      group by doctor_id
      order by count(*) desc
      limit 5
    ) s
    join public.doctors d on d.id = s.doctor_id
  ),
  inv_status as (
    select status, count(*) as cnt
    from public.inventory
    group by status
  ),
  recent_invoices as (
    select i.id, i.invoice_no, p.name as patient_name, i.total, i.paid_amount, i.status::text, i.created_at
    from public.invoices i
    left join public.patients p on p.id = i.patient_id
    order by i.created_at desc
    limit 6
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'patients',     counts.patients,
      'doctors',      counts.doctors,
      'appointments', counts.appointments,
      'inventory',    counts.inventory,
      'staff',        counts.staff,
      'beds',         counts.beds
    ),
    'billing', (select public.get_billing_stats()),
    'appointmentsByStatus', coalesce((
      select jsonb_agg(jsonb_build_object('status', status::text, 'count', cnt) order by status)
      from appt_status
    ), '[]'::jsonb),
    'appointmentsByDepartment', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'count', cnt) order by cnt desc)
      from dept_appts
    ), '[]'::jsonb),
    'revenueByStatus', coalesce((
      select jsonb_agg(jsonb_build_object('status', status::text, 'amount', amount, 'count', cnt) order by status)
      from revenue
    ), '[]'::jsonb),
    'topDoctors', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'specialization', specialization, 'count', cnt) order by cnt desc)
      from top_docs
    ), '[]'::jsonb),
    'inventoryStatus', coalesce((
      select jsonb_agg(jsonb_build_object('status', status::text, 'count', cnt) order by status)
      from inv_status
    ), '[]'::jsonb),
    'recentInvoices', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'invoice_no', invoice_no,
          'patient_name', patient_name,
          'total', total,
          'paid_amount', paid_amount,
          'status', status,
          'created_at', created_at
        )
        order by created_at desc
      )
      from recent_invoices
    ), '[]'::jsonb)
  )
  into result
  from counts;

  return result;
end;
$$;

-- Re-apply execute restrictions (008 previously granted these to
-- authenticated only; keep them that way).
revoke execute on function public.get_billing_stats() from public, anon;
revoke execute on function public.get_revenue_by_status() from public, anon;
revoke execute on function public.get_report_summary() from public, anon;
grant execute on function public.get_billing_stats() to authenticated;
grant execute on function public.get_revenue_by_status() to authenticated;
grant execute on function public.get_report_summary() to authenticated;