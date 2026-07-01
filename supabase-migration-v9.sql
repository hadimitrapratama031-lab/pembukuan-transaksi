-- ============================================
-- KASIR ATM - Migration v9 — Custom Branding Build Pipeline
-- ============================================
-- Jalankan di: Supabase Dashboard > SQL Editor
--
-- Tabel ini nyimpen status "build APK custom" tiap kali user ganti
-- nama usaha / logo di brand-setup.tsx dan minta APK baru yang
-- ikon + nama-nya sesuai homescreen HP mereka.
--
-- Alur status: pending -> building -> ready (atau failed)

create table if not exists build_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_name text not null,
  logo_storage_path text,           -- path logo di Supabase Storage (bucket: app-logos)
  status text not null default 'pending', -- pending | building | ready | failed
  eas_build_id text,                -- id build dari EAS, dipakai buat matching webhook
  apk_url text,                     -- link download APK kalau sudah selesai
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index buat query "build terakhir milik user ini"
create index if not exists idx_build_requests_user_id on build_requests(user_id, created_at desc);

-- RLS: user cuma boleh lihat & bikin build request miliknya sendiri
alter table build_requests enable row level security;

drop policy if exists "user lihat build sendiri" on build_requests;
create policy "user lihat build sendiri"
  on build_requests for select
  using (auth.uid() = user_id);

drop policy if exists "user bikin build request sendiri" on build_requests;
create policy "user bikin build request sendiri"
  on build_requests for insert
  with check (auth.uid() = user_id);

-- Catatan: UPDATE (ubah status/apk_url) HANYA boleh dilakukan oleh
-- Edge Function "build-webhook" yang jalan pakai service_role key
-- (bypass RLS), bukan oleh user langsung. Makanya tidak ada policy
-- UPDATE untuk role biasa di sini — ini sengaja.

-- Bucket storage untuk logo yang diupload (buat dikirim ke GitHub Actions)
insert into storage.buckets (id, name, public)
values ('app-logos', 'app-logos', true)
on conflict (id) do nothing;

drop policy if exists "user upload logo sendiri" on storage.objects;
create policy "user upload logo sendiri"
  on storage.objects for insert
  with check (bucket_id = 'app-logos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "logo bisa dibaca publik" on storage.objects;
create policy "logo bisa dibaca publik"
  on storage.objects for select
  using (bucket_id = 'app-logos');

-- SELESAI Migration v9.
