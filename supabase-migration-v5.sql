-- ============================================
-- KASIR ATM - Migration v5
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', 'Admin'))
  on conflict (id) do nothing;

  insert into public.pengaturan (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception when others then
  raise exception 'handle_new_user gagal untuk user %: %', new.id, sqlerrm;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SELESAI Migration v5.