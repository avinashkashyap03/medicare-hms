-- ============================================================
-- MediCare HMS — 018_admin_list_all_profiles.sql
-- RUN AFTER 017
-- ------------------------------------------------------------
-- Admin-only RPC that lists EVERY account (profiles) with its
-- auth email, for the "All Profiles" admin view on the Staff page.
--
-- Same pattern as admin_list_pending_profiles() (015/016):
--   * SECURITY DEFINER + search_path = ''
--   * guard requires an ACTIVE admin, else 42501
--   * email comes from auth.users (PostgREST cannot join
--     auth.users directly, so this helper exists)
--
-- The frontend renders this data read-only; role/status changes
-- still go through the guarded admin_set_profile_role /
-- admin_set_user_status RPCs.
-- ============================================================

drop function if exists public.admin_list_all_profiles();

create function public.admin_list_all_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  status text,
  phone text,
  designation text,
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
    raise exception 'Only an active administrator can list profiles'
      using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.full_name,
      u.email::text,
      p.role::text,
      p.status::text,
      p.phone,
      p.designation,
      p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_list_all_profiles() from public, anon;
grant execute on function public.admin_list_all_profiles() to authenticated;