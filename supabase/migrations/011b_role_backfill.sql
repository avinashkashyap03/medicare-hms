-- ============================================================
-- MediCare HMS — 011b_role_backfill.sql
-- RUN AFTER 011 — ONLY AFTER reviewing the verification output
-- ------------------------------------------------------------
-- GATED: converts remaining `role = 'user'` profiles to 'staff'.
--
-- 011 leaves role values untouched on purpose. Before running this
-- file, execute the read-only verification queries in the README
-- (list all profiles with role = 'user' and check for orphaned /
-- unexpected accounts). Review the output with the team, then run
-- this backfill.
--
-- Skipping this file is safe: the app treats any non-admin role as a
-- general operational user, so leftover 'user' rows keep working. This
-- file only normalises them to the canonical 'staff' role.
-- ============================================================

update public.profiles
set role = 'staff'
where role = 'user';