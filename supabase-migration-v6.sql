-- ============================================
-- KASIR ATM - Migration v6
-- ============================================

-- Step 1: Pastikan kolom branding sudah ada
alter table pengaturan add column if not exists app_name  text    default 'Kasir ATM';
alter table pengaturan add column if not exists app_logo  text;
alter table pengaturan add column if not exists brand_set boolean default false;

-- Step 2: Buat baris profiles yang hilang untuk akun yang sudah ada
insert into public.profiles (id, nama, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nama', split_part(u.email, '@', 1), 'Admin') as nama,
  'admin' as role
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Step 3: Buat baris pengaturan yang hilang
insert into public.pengaturan (user_id)
select p.id
from public.profiles p
where not exists (select 1 from public.pengaturan pg where pg.user_id = p.id)
on conflict (user_id) do nothing;

-- Step 4: Trigger lebih tangguh untuk akun baru
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1), 'Admin'),
    coalesce((new.raw_user_meta_data->>'role')::text, 'admin')
  )
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

-- Step 5: Pastikan policy pengaturan ada
drop policy if exists "pengaturan_own" on pengaturan;
create policy "pengaturan_own" on pengaturan
  for all using (auth.uid() = user_id);

-- SELESAI Migration v6.