-- ============================================================
-- MediCare HMS — 021_signup_phone.sql
-- RUN AFTER 020
-- ------------------------------------------------------------
-- The signup form now collects a phone number and an optional
-- designation. Both arrive via user_metadata (set by
-- supabase.auth.signUp options.data), so the handle_new_user
-- trigger writes them into profiles.phone / profiles.designation.
-- Replaces the 010 version; role default stays 'user'.
-- Safe to re-run (create or replace).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone, designation)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User'),
    'user',
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'designation'), '')
  );
  return new;
end;
$$;
