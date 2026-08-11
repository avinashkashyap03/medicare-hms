-- ============================================================
-- MediCare HMS — 004_functions_and_triggers.sql
-- RUN FOURTH (after 003)
-- ============================================================

-- AUTO-CREATE profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User'),
    'staff'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- AUTO updated_at on update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_departments  before update on departments  for each row execute function public.set_updated_at();
create trigger set_updated_at_doctors      before update on doctors      for each row execute function public.set_updated_at();
create trigger set_updated_at_patients     before update on patients     for each row execute function public.set_updated_at();
create trigger set_updated_at_appointments before update on appointments for each row execute function public.set_updated_at();
create trigger set_updated_at_invoices     before update on invoices     for each row execute function public.set_updated_at();
create trigger set_updated_at_inventory    before update on inventory    for each row execute function public.set_updated_at();
create trigger set_updated_at_staff        before update on staff        for each row execute function public.set_updated_at();
create trigger set_updated_at_pharmacy     before update on pharmacy     for each row execute function public.set_updated_at();
create trigger set_updated_at_beds         before update on beds         for each row execute function public.set_updated_at();