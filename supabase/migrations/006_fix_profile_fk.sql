-- ============================================================
-- MediCare HMS — 006_fix_profile_fk.sql
-- RUN THIS (Supabase -> SQL Editor)
-- ------------------------------------------------------------
-- Existing users (jo schema banne se pehle sign up hue) ke paas
-- profiles row nahi hai, isliye patients.created_by FK fail
-- ho raha tha. Yeh insert policy user ko apna profile banane deti hai.
-- ============================================================

create policy "insert_own_profile" on profiles
  for insert with check (auth.uid() = id);