-- ============================================
-- KASIR ATM - Migration v2
-- ============================================

alter table profiles add column if not exists role text not null default 'admin' check (role in ('admin', 'staff'));
alter table profiles add column if not exists pin_hash text;
alter table profiles add column if not exists created_by uuid references auth.users(id);

-- Policy lama dihapus dulu semua sebelum dibuat ulang
drop policy if exists "profiles_own" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create policy "profiles_select" on profiles
  for select using (auth.uid() = id or is_admin());

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- SELESAI Migration v2.