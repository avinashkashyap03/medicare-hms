-- ============================================================
-- MediCare HMS — 015_fix_list_pending_profiles.sql
-- RUN AFTER 014
-- ------------------------------------------------------------
-- Fixes admin_list_pending_profiles() so pending signups actually
-- appear on the Staff page.
--
-- Root causes in 014:
--   1) RETURNS TABLE (id, role, status, ...) declares PL/pgSQL OUT
--      variables of those names. The admin EXISTS check used
--      unqualified `id`, `role`, and `status`, which resolved to the
--      still-NULL OUT vars — so even an active admin always hit
--      RAISE insufficient_privilege.
--   2) RETURN QUERY selected auth.users.email (varchar) into a text
--      output column, which PostgreSQL rejects as
--      "structure of query does not match function result type".
--   3) Returning public.user_role / public.account_status with
--      search_path = '' makes PostgreSQL look up "user_role" by
--      unqualified name and fail (see 016).
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
