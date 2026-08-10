-- ============================================================
-- MediCare HMS — 007_backfill_profiles.sql
-- RUN THIS (Supabase -> SQL Editor)
-- ------------------------------------------------------------
-- Purani users (jo schema banne se pehle sign up hue) ke paas
-- profiles row nahi thi -> patients.created_by FK fail ho jata tha.
--
-- Yeh migration har aise auth.user ke liye profile row CREATE
-- kar deta hai jo missing hai. Ek baar bhi ise literal, ab har
-- naya insert ka created_by DB level par track hoga.
-- NOTE: safe to re-run (idempotent) — duplicate nahi banayega.
-- ============================================================

insert into profiles (id, full_name, role)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'full_name', split_part(coalesce(au.email, 'user'), '@', 1), 'User'),
  'staff'::user_role
from auth.users au
where not exists (
  select 1
  from profiles p
  where p.id = au.id
);