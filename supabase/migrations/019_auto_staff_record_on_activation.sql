-- ============================================================
-- MediCare HMS — 019_auto_staff_record_on_activation.sql
-- RUN AFTER 018
-- ------------------------------------------------------------
-- Every account that becomes ACTIVE automatically gets a matching
-- row in the `staff` table, so the "Staff Members" tab stays in
-- sync with "All Profiles".
--
--   1) ensure_staff_record() trigger on profiles — fires on INSERT
--      and whenever `status` changes to 'active' (approval via
--      admin_approve_staff, or reactivation via admin_set_user_status)
--      and creates a staff row if none exists for that user.
--      designation is a placeholder (profile designation, else the
--      role name) so the NOT NULL constraint is satisfied; admins can
--      edit it on the Staff page.
--   2) Backfill: active profiles that already have no staff row get
--      one now, so existing accounts appear immediately.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Trigger function
-- ------------------------------------------------------------
create or replace function public.ensure_staff_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'::public.account_status
     and not exists (
       select 1 from public.staff s where s.user_id = new.id
     ) then
    insert into public.staff (user_id, name, designation, status)
    values (
      new.id,
      new.full_name,
      coalesce(nullif(new.designation, ''), new.role::text),
      'active'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_staff_record on profiles;
create trigger trg_ensure_staff_record
  after insert or update of status on public.profiles
  for each row execute function public.ensure_staff_record();

-- ------------------------------------------------------------
-- 2) Backfill existing active accounts without a staff row
-- ------------------------------------------------------------
insert into public.staff (user_id, name, designation, status)
select
  p.id,
  p.full_name,
  coalesce(nullif(p.designation, ''), p.role::text),
  'active'
from public.profiles p
where p.status = 'active'::public.account_status
  and not exists (
    select 1 from public.staff s where s.user_id = p.id
  );