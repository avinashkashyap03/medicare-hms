-- ============================================================
-- MediCare HMS — 016_fix_pending_profiles_user_role.sql
-- RUN AFTER 015
-- ------------------------------------------------------------
-- admin_list_pending_profiles() still failed at RETURN QUERY with:
--   type "user_role" does not exist
--
-- Cause: SECURITY DEFINER uses set search_path = ''. RETURNS TABLE
-- declared role as public.user_role, but selecting p.role (an enum)
-- makes PostgreSQL look up the type name "user_role" with an empty
-- search_path, which fails. The Staff page then hides Pending
-- Account Approvals.
--
-- Fix: return role/status as text (what the UI uses anyway) and
-- cast through public.user_role / public.account_status.
-- CREATE OR REPLACE cannot change OUT types, so DROP first.
-- ============================================================

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
