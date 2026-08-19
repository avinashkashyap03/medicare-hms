-- ============================================================
-- MediCare HMS — 013_audit_and_corrections.sql
-- RUN AFTER 012 (needs has_permission / validate_payment_insert)
-- ------------------------------------------------------------
-- Audit trail + financial corrections + account management.
--
--   1) audit_logs table — append-only history of privileged actions.
--      SELECT is admin-only; nothing may INSERT/UPDATE/DELETE directly
--      except the SECURITY DEFINER log_audit() function.
--   2) refunds table — corrections against individual payments.
--      SELECT is admin-only; records are created only by the
--      SECURITY DEFINER record_refund() / reverse_payment().
--   3) recompute_invoice_financials() — SECURITY DEFINER recompute of
--      an invoice's paid_amount/status from its payments minus refunds.
--      Fired AFTER INSERT on payments and refunds, so the client no
--      longer needs to update the invoice itself.
--   4) record_refund(payment, amount, reason) / reverse_payment(payment,
--      reason) — admin-only corrections; require a reason; audit-logged.
--   5) Account lifecycle RPCs (admin-only, audit-logged):
--        * admin_approve_staff(target_id, role, reason) — atomically sets
--          role + status='active' in ONE update (approval flow).
--        * admin_set_user_status(target_id, status, reason) — suspend /
--          deactivate / reactivate.
--        * admin_set_user_role(email, role) — extended from 010 with
--          guards + audit (email-based convenience, same protection).
--        * admin_cancel_invoice(invoice_id, reason) — the ONLY sanctioned
--          way to cancel an invoice through the API.
--      None of these can ever grant or modify an 'admin' account, and
--      role/status can never be changed by direct SQL (see 011/012).
--   6) get_today_collections() — admin + receptionist daily collection
--      total (payments minus refunds) for the front-desk widget.
--
-- Every RPC below runs SECURITY DEFINER with a fixed, empty search_path
-- and fully-qualified names, and every mutation is audit-logged.
-- ============================================================

-- ------------------------------------------------------------
-- 1) audit_logs
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "admin_read_audit_logs" on public.audit_logs;
create policy "admin_read_audit_logs" on public.audit_logs
  for select using (public.is_admin());

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ------------------------------------------------------------
-- 2) refunds
-- ------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(10,2) not null check (amount > 0),
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.refunds enable row level security;

drop policy if exists "admin_read_refunds" on public.refunds;
create policy "admin_read_refunds" on public.refunds
  for select using (public.is_admin());

create index if not exists refunds_invoice_id_idx on public.refunds (invoice_id);
create index if not exists refunds_payment_id_idx on public.refunds (payment_id);

-- ------------------------------------------------------------
-- 3) log_audit() — append-only audit entry
-- ------------------------------------------------------------
create or replace function public.log_audit(
  p_actor uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_details jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor, p_action, p_entity_type, p_entity_id, p_details);
$$;

revoke execute on function public.log_audit(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_audit(uuid, text, text, uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 4) recompute_invoice_financials() — derives paid_amount + status
--    from payments minus refunds. SECURITY DEFINER bypasses the
--    invoice update RLS by design.
-- ------------------------------------------------------------
create or replace function public.recompute_invoice_financials(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid numeric(10,2);
  v_total numeric(10,2);
  v_status public.invoice_status;
begin
  select total into v_total from public.invoices where id = p_invoice_id;
  if not found then
    return;
  end if;

  select
    coalesce(sum(p.amount), 0) - coalesce((
      select sum(r.amount) from public.refunds r where r.invoice_id = p_invoice_id
    ), 0)
  into v_paid
  from public.payments p
  where p.invoice_id = p_invoice_id;

  v_paid := greatest(v_paid, 0);
  if v_paid > v_total then
    v_paid := v_total;
  end if;

  select status into v_status from public.invoices where id = p_invoice_id;

  if v_status = 'cancelled' then
    update public.invoices set paid_amount = v_paid where id = p_invoice_id;
    return;
  end if;

  if v_paid >= v_total then
    v_status := 'paid';
  elsif exists (
    select 1 from public.invoices
    where id = p_invoice_id and due_date is not null and due_date < current_date
  ) then
    v_status := 'overdue';
  else
    v_status := 'pending';
  end if;

  update public.invoices
  set paid_amount = v_paid, status = v_status
  where id = p_invoice_id;
end;
$$;

revoke execute on function public.recompute_invoice_financials(uuid) from public, anon;
grant execute on function public.recompute_invoice_financials(uuid) to authenticated;

-- AFTER INSERT on payments / refunds → recompute the invoice.
-- The client's addPayment() no longer needs to write the invoice row.
create or replace function public.recompute_invoice_on_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_invoice_financials(new.invoice_id);
  return new;
end;
$$;

drop trigger if exists after_payment_recompute on public.payments;
create trigger after_payment_recompute
  after insert on public.payments
  for each row execute function public.recompute_invoice_on_payment();

create or replace function public.recompute_invoice_on_refund()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_invoice_financials(new.invoice_id);
  return new;
end;
$$;

drop trigger if exists after_refund_recompute on public.refunds;
create trigger after_refund_recompute
  after insert on public.refunds
  for each row execute function public.recompute_invoice_on_refund();

-- ------------------------------------------------------------
-- 5) record_refund() — admin-only partial refund of a payment.
-- ------------------------------------------------------------
create or replace function public.record_refund(p_payment_id uuid, p_amount numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid;
  v_payment numeric(10,2);
  v_already numeric(10,2);
  v_refund_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can record refunds';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to record a refund';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Refund amount must be greater than zero';
  end if;

  select invoice_id, amount into v_invoice, v_payment
  from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Payment not found';
  end if;

  select coalesce(sum(amount), 0) into v_already
  from public.refunds where payment_id = p_payment_id;

  if p_amount > v_payment - v_already then
    raise exception 'Refund amount exceeds the remaining payment amount';
  end if;

  insert into public.refunds (payment_id, invoice_id, amount, reason, created_by)
  values (p_payment_id, v_invoice, p_amount, trim(p_reason), auth.uid())
  returning id into v_refund_id;

  perform public.recompute_invoice_financials(v_invoice);

  perform public.log_audit(
    auth.uid(),
    'refund_recorded',
    'refunds',
    v_refund_id,
    jsonb_build_object('payment_id', p_payment_id, 'invoice_id', v_invoice, 'amount', p_amount, 'reason', trim(p_reason))
  );
end;
$$;

revoke execute on function public.record_refund(uuid, numeric, text) from public, anon;
grant execute on function public.record_refund(uuid, numeric, text) to authenticated;

-- ------------------------------------------------------------
-- 6) reverse_payment() — admin-only full reversal of a payment.
-- ------------------------------------------------------------
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid;
  v_payment numeric(10,2);
  v_refunded numeric(10,2);
  v_remaining numeric(10,2);
  v_refund_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can reverse payments';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to reverse a payment';
  end if;

  select invoice_id, amount into v_invoice, v_payment
  from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Payment not found';
  end if;

  select coalesce(sum(amount), 0) into v_refunded
  from public.refunds where payment_id = p_payment_id;

  v_remaining := v_payment - v_refunded;
  if v_remaining <= 0 then
    raise exception 'This payment has already been fully reversed';
  end if;

  insert into public.refunds (payment_id, invoice_id, amount, reason, created_by)
  values (p_payment_id, v_invoice, v_remaining, trim(p_reason), auth.uid())
  returning id into v_refund_id;

  perform public.recompute_invoice_financials(v_invoice);

  perform public.log_audit(
    auth.uid(),
    'payment_reversed',
    'refunds',
    v_refund_id,
    jsonb_build_object('payment_id', p_payment_id, 'invoice_id', v_invoice, 'amount', v_remaining, 'reason', trim(p_reason))
  );
end;
$$;

revoke execute on function public.reverse_payment(uuid, text) from public, anon;
grant execute on function public.reverse_payment(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 7) admin_approve_staff() — atomic approval: sets role + status
--    'active' in ONE update (the whole reason for SECURITY DEFINER).
--    Takes a profile id (not email): PostgREST cannot join auth.users,
--    and profiles has no email column.
-- ------------------------------------------------------------
create or replace function public.admin_approve_staff(p_target uuid, p_role user_role, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role public.user_role;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can approve staff';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to approve staff';
  end if;

  if p_role = 'admin' then
    raise exception 'The admin role cannot be assigned';
  end if;

  if p_target = auth.uid() then
    raise exception 'You cannot modify your own account';
  end if;

  select role into v_target_role from public.profiles where id = p_target;
  if not found then
    raise exception 'No profile found for the given user';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Admin accounts cannot be modified';
  end if;

  update public.profiles
  set role = p_role, status = 'active'
  where id = p_target;

  perform public.log_audit(
    auth.uid(),
    'staff_approved',
    'profiles',
    p_target,
    jsonb_build_object('role', p_role, 'reason', trim(p_reason))
  );
end;
$$;

revoke execute on function public.admin_approve_staff(uuid, user_role, text) from public, anon;
grant execute on function public.admin_approve_staff(uuid, user_role, text) to authenticated;

-- ------------------------------------------------------------
-- 8) admin_set_user_status() — suspend / deactivate / reactivate.
-- ------------------------------------------------------------
create or replace function public.admin_set_user_status(p_target uuid, p_status account_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role public.user_role;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can change account status';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to change account status';
  end if;

  if p_target = auth.uid() then
    raise exception 'You cannot change your own status';
  end if;

  select role into v_target_role from public.profiles where id = p_target;
  if not found then
    raise exception 'No profile found for the given user';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Admin accounts cannot be modified';
  end if;

  update public.profiles set status = p_status where id = p_target;

  perform public.log_audit(
    auth.uid(),
    'status_changed',
    'profiles',
    p_target,
    jsonb_build_object('status', p_status, 'reason', trim(p_reason))
  );
end;
$$;

revoke execute on function public.admin_set_user_status(uuid, account_status, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, account_status, text) to authenticated;

-- ------------------------------------------------------------
-- 9) admin_set_user_role() — extended from 010: caller must be an
--    active admin, the admin role is never assignable, existing
--    admins are untouchable, and the change is audit-logged.
-- ------------------------------------------------------------
create or replace function public.admin_set_user_role(target_email text, new_role user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_target_role public.user_role;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can change user roles';
  end if;

  if new_role = 'admin' then
    raise exception 'The admin role cannot be assigned';
  end if;

  select p.id, p.role into v_target, v_target_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = target_email;

  if not found then
    raise exception 'No user found with email %', target_email;
  end if;

  if v_target_role = 'admin' then
    raise exception 'Admin accounts cannot be modified';
  end if;

  update public.profiles set role = new_role where id = v_target;

  perform public.log_audit(
    auth.uid(),
    'role_changed',
    'profiles',
    v_target,
    jsonb_build_object('role', new_role)
  );
end;
$$;

revoke execute on function public.admin_set_user_role(text, user_role) from public, anon;
grant execute on function public.admin_set_user_role(text, user_role) to authenticated;

-- ------------------------------------------------------------
-- 10) admin_cancel_invoice() — the only API path to cancel an
--     invoice (RLS forbids writing status='cancelled' directly).
-- ------------------------------------------------------------
create or replace function public.admin_cancel_invoice(p_invoice_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice_no text;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active'
  ) then
    raise exception 'Only an active administrator can cancel invoices';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to cancel an invoice';
  end if;

  select invoice_no into v_invoice_no
  from public.invoices
  where id = p_invoice_id and paid_amount = 0 and status not in ('paid', 'cancelled');
  if not found then
    raise exception 'Only unpaid, non-cancelled invoices can be cancelled';
  end if;

  update public.invoices set status = 'cancelled' where id = p_invoice_id;

  perform public.log_audit(
    auth.uid(),
    'invoice_cancelled',
    'invoices',
    p_invoice_id,
    jsonb_build_object('invoice_no', v_invoice_no, 'reason', trim(p_reason))
  );
end;
$$;

revoke execute on function public.admin_cancel_invoice(uuid, text) from public, anon;
grant execute on function public.admin_cancel_invoice(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 11) get_today_collections() — admin + receptionist daily collection
--     total for the front-desk widget (payments minus refunds today).
-- ------------------------------------------------------------
create or replace function public.get_today_collections()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'receptionist' and status = 'active'
    )
  ) then
    raise insufficient_privilege;
  end if;

  select jsonb_build_object(
    'collected', coalesce((
      select sum(amount) from public.payments where paid_at::date = current_date
    ), 0) - coalesce((
      select sum(amount) from public.refunds where created_at::date = current_date
    ), 0),
    'payments', (select count(*) from public.payments where paid_at::date = current_date)
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.get_today_collections() from public, anon;
grant execute on function public.get_today_collections() to authenticated;