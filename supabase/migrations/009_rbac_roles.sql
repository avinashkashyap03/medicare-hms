-- ============================================================
-- MediCare HMS — 009_rbac_roles.sql
-- RUN FIRST (before 010)
-- ------------------------------------------------------------
-- Adds the 'user' value to the user_role enum.
--
-- IMPORTANT: PostgreSQL cannot use a newly added enum value in
-- the same transaction it was added (error 55P04). Supabase's
-- SQL Editor runs each script as one transaction, so this file
-- ONLY adds the enum value. The rest of the RBAC changes live
-- in 010_rbac_policies.sql and run AFTER this is committed.
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'user'
  ) then
    alter type user_role add value 'user';
  end if;
end;
$$;