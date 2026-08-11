-- ============================================================
-- MediCare HMS — 008_aggregate_functions.sql
-- RUN AFTER 007
-- ------------------------------------------------------------
-- 1) Sequences for race-free MRN / invoice-number generation.
-- 2) SECURITY DEFINER RPCs: next_mrn(), next_invoice_no().
-- 3) Aggregation RPCs (SECURITY INVOKER — RLS stays intact) so
--    the React app stops pulling whole tables into JavaScript.
-- 4) pg_trgm GIN indexes so substring ILIKE searches on patients
--    and doctors are actually index-accelerated.
-- 5) Execute permissions restricted to `authenticated` only.
--
-- All objects are idempotent-safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- pg_trgm for indexed substring (contains) search.
-- NOTE: a regular btree index cannot accelerate `ILIKE '%x%'`;
-- a GIN trigram index can (for terms of >= 3 characters).
-- ------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists patients_name_trgm_idx   on public.patients  using gin (name   gin_trgm_ops);
create index if not exists patients_mrn_trgm_idx    on public.patients  using gin (mrn    gin_trgm_ops);
create index if not exists patients_phone_trgm_idx  on public.patients  using gin (phone  gin_trgm_ops);
create index if not exists patients_email_trgm_idx  on public.patients  using gin (email  gin_trgm_ops);

create index if not exists doctors_name_trgm_idx           on public.doctors using gin (name           gin_trgm_ops);
create index if not exists doctors_specialization_trgm_idx on public.doctors using gin (specialization gin_trgm_ops);
create index if not exists doctors_license_no_trgm_idx     on public.doctors using gin (license_no     gin_trgm_ops);
create index if not exists doctors_phone_trgm_idx          on public.doctors using gin (phone          gin_trgm_ops);
create index if not exists doctors_email_trgm_idx          on public.doctors using gin (email          gin_trgm_ops);

-- ------------------------------------------------------------
-- Sequences for MRN / invoice numbers
-- Seeded from the current numeric max so the next value is
-- max + 1 (matching the old "max + 1" behaviour exactly).
-- ------------------------------------------------------------
create sequence if not exists public.mrn_seq;
create sequence if not exists public.invoice_no_seq;

select setval(
  'public.mrn_seq',
  coalesce(
    (select max(nullif(regexp_replace(mrn, '[^0-9]', '', 'g'), '')::bigint) from public.patients),
    9000
  ),
  true
);

select setval(
  'public.invoice_no_seq',
  coalesce(
    (select max(nullif(regexp_replace(invoice_no, '[^0-9]', '', 'g'), '')::bigint) from public.invoices),
    1000
  ),
  true
);

-- ------------------------------------------------------------
-- next_mrn() / next_invoice_no()
-- SECURITY DEFINER so the `authenticated` role can read the
-- sequences. `set search_path = ''` + fully-qualified names =
-- safe fixed search_path (immune to search_path hijacking).
-- These touch only the sequence (never table data), so no RLS
-- bypass / data exposure is possible.
-- ------------------------------------------------------------
create or replace function public.next_mrn()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'P-' || nextval('public.mrn_seq');
$$;

create or replace function public.next_invoice_no()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'INV-' || nextval('public.invoice_no_seq');
$$;

-- ------------------------------------------------------------
-- Billing summary — single scan of `invoices`.
-- Mirrors the previous JS reduce() exactly:
--   collected      = sum(paid_amount)          where status <> 'cancelled'
--   outstanding    = sum(max(total-paid, 0))   where status <> 'cancelled'
--   overdue        = unpaid balance where status = 'overdue' OR
--                   (status = 'pending' AND due_date < today)
--   pendingCount   = count where status = 'pending'
--   pendingAmount  = sum(max(total-paid, 0))   where status = 'pending'
--   total          = row count
-- ------------------------------------------------------------
create or replace function public.get_billing_stats()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'collected',     collected,
    'outstanding',   outstanding,
    'overdue',       overdue,
    'pendingCount',  pending_count,
    'pendingAmount', pending_amount,
    'total',         total
  )
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
$$;

-- ------------------------------------------------------------
-- Appointments grouped by status (enum order = previous JS order)
-- ------------------------------------------------------------
create or replace function public.get_appointments_by_status()
returns table (status text, count bigint)
language sql
security invoker
set search_path = public
as $$
  select s.status::text as status, s.cnt::bigint as count
  from (
    select status, count(*) as cnt
    from public.appointments
    group by status
    order by status
  ) s;
$$;

-- ------------------------------------------------------------
-- Appointments per department (only depts with >= 1 appt,
-- sorted by count desc — matches previous JS behaviour)
-- ------------------------------------------------------------
create or replace function public.get_appointments_by_department()
returns table (id uuid, name text, color text, count bigint)
language sql
security invoker
set search_path = public
as $$
  select d.id, d.name, coalesce(d.color, '#2563eb') as color, s.cnt as count
  from public.departments d
  join (
    select department_id, count(*) as cnt
    from public.appointments
    where department_id is not null
    group by department_id
  ) s on s.department_id = d.id
  order by s.cnt desc;
$$;

-- ------------------------------------------------------------
-- Revenue grouped by invoice status (enum order), count too
-- ------------------------------------------------------------
create or replace function public.get_revenue_by_status()
returns table (status text, amount numeric, count bigint)
language sql
security invoker
set search_path = public
as $$
  select s.status::text as status, s.amount::numeric as amount, s.cnt::bigint as count
  from (
    select status, sum(total) as amount, count(*) as cnt
    from public.invoices
    group by status
    order by status
  ) s;
$$;

-- ------------------------------------------------------------
-- Top doctors by number of appointments (limit_count rows)
-- ------------------------------------------------------------
create or replace function public.get_top_doctors(limit_count integer default 5)
returns table (id uuid, name text, specialization text, count bigint)
language sql
security invoker
set search_path = public
as $$
  select d.id, coalesce(d.name, 'Unknown doctor') as name, coalesce(d.specialization, '') as specialization, s.cnt as count
  from (
    select doctor_id, count(*) as cnt
    from public.appointments
    where doctor_id is not null
    group by doctor_id
    order by count(*) desc
    limit limit_count
  ) s
  join public.doctors d on d.id = s.doctor_id
  order by s.cnt desc;
$$;

-- ------------------------------------------------------------
-- Inventory counts by stock status (for the Reports donut)
-- ------------------------------------------------------------
create or replace function public.get_inventory_status()
returns table (status text, count bigint)
language sql
security invoker
set search_path = public
as $$
  select s.status::text as status, s.cnt::bigint as count
  from (
    select status, count(*) as cnt
    from public.inventory
    group by status
    order by status
  ) s;
$$;

-- ------------------------------------------------------------
-- Inventory summary cards — total + stock/retail value + counts
-- ------------------------------------------------------------
create or replace function public.get_inventory_stats()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',            count(*),
    'stockValue',       coalesce(sum(quantity * coalesce(purchase_price, 0)), 0),
    'retailValue',      coalesce(sum(quantity * coalesce(selling_price, 0)), 0),
    'lowCount',         count(*) filter (where status = 'low'),
    'outOfStockCount',  count(*) filter (where status = 'out_of_stock'),
    'expiredCount',     count(*) filter (where status = 'expired')
  )
  from public.inventory;
$$;

-- ------------------------------------------------------------
-- Staff summary — totals + counts by status + designations map
-- ------------------------------------------------------------
create or replace function public.get_staff_stats()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',    count(*),
    'active',   count(*) filter (where status = 'active'),
    'onLeave',  count(*) filter (where status = 'on_leave'),
    'inactive', count(*) filter (where status = 'inactive'),
    'designations', coalesce(
      (
        select jsonb_object_agg(designation, cnt)
        from (
          select designation, count(*) as cnt
          from public.staff
          where designation is not null
          group by designation
        ) d
      ),
      '{}'::jsonb
    )
  )
  from public.staff;
$$;

-- ------------------------------------------------------------
-- Consolidated report summary — one RPC for the whole Reports page
-- ------------------------------------------------------------
create or replace function public.get_report_summary()
returns jsonb
language sql
security invoker
set search_path = public
as $$
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
  from counts;
$$;

-- ------------------------------------------------------------
-- Restrict execute permissions — only `authenticated` callers.
-- (anon / public / service callers must not run these.)
-- ------------------------------------------------------------
revoke execute on function public.next_mrn() from public, anon;
revoke execute on function public.next_invoice_no() from public, anon;
revoke execute on function public.get_billing_stats() from public, anon;
revoke execute on function public.get_appointments_by_status() from public, anon;
revoke execute on function public.get_appointments_by_department() from public, anon;
revoke execute on function public.get_revenue_by_status() from public, anon;
revoke execute on function public.get_top_doctors(integer) from public, anon;
revoke execute on function public.get_inventory_status() from public, anon;
revoke execute on function public.get_inventory_stats() from public, anon;
revoke execute on function public.get_staff_stats() from public, anon;
revoke execute on function public.get_report_summary() from public, anon;

grant execute on function public.next_mrn() to authenticated;
grant execute on function public.next_invoice_no() to authenticated;
grant execute on function public.get_billing_stats() to authenticated;
grant execute on function public.get_appointments_by_status() to authenticated;
grant execute on function public.get_appointments_by_department() to authenticated;
grant execute on function public.get_revenue_by_status() to authenticated;
grant execute on function public.get_top_doctors(integer) to authenticated;
grant execute on function public.get_inventory_status() to authenticated;
grant execute on function public.get_inventory_stats() to authenticated;
grant execute on function public.get_staff_stats() to authenticated;
grant execute on function public.get_report_summary() to authenticated;
