-- ============================================
-- KASIR ATM - Supabase Database Setup
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. TABEL PROFIL USER
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nama text not null,
  created_at timestamptz default now()
);

-- 2. TABEL REKENING MODAL
create table if not exists rekening (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  nama text not null,
  emoji text default '💳',
  warna text default 'bg-blue',
  logo_url text,
  tipe text default 'digital', -- digital / cash / bank
  saldo bigint default 0,
  modal_awal bigint default 0,
  urutan int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. TABEL TRANSAKSI
create table if not exists transaksi (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  jenis text not null check (jenis in ('TU', 'TF')),
  nominal bigint not null,
  admin bigint not null default 0,
  rekening_id uuid references rekening(id),
  rekening_nama text,
  cash_rekening_id uuid references rekening(id),
  cash_rekening_nama text,
  catatan text,
  tanggal timestamptz default now(),
  created_at timestamptz default now()
);

-- 4. TABEL PENGATURAN (fees admin, dll)
create table if not exists pengaturan (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null unique,
  fees_tu bigint[] default array[3000, 5000, 10000],
  fees_tf bigint[] default array[3000, 5000, 10000],
  total_keuntungan bigint default 0,
  updated_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (setiap user hanya bisa lihat datanya sendiri)
-- ============================================

alter table profiles enable row level security;
alter table rekening enable row level security;
alter table transaksi enable row level security;
alter table pengaturan enable row level security;

-- Profiles: hanya bisa akses profil sendiri
drop policy if exists "profiles_own" on profiles;
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- Rekening: hanya milik sendiri
drop policy if exists "rekening_own" on rekening;
create policy "rekening_own" on rekening
  for all using (auth.uid() = user_id);

-- Transaksi: hanya milik sendiri
drop policy if exists "transaksi_own" on transaksi;
create policy "transaksi_own" on transaksi
  for all using (auth.uid() = user_id);

-- Pengaturan: hanya milik sendiri
drop policy if exists "pengaturan_own" on pengaturan;
create policy "pengaturan_own" on pengaturan
  for all using (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Auto-buat profil & pengaturan saat user baru daftar
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', 'Admin'));

  insert into pengaturan (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger otomatis
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================
-- SELESAI! Lanjut ke langkah berikutnya.
-- ============================================