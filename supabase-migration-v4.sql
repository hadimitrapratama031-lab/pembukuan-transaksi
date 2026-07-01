-- ============================================
-- KASIR ATM - Migration v4 — Branding App
-- ============================================

alter table pengaturan add column if not exists app_name text default 'Kasir ATM';
alter table pengaturan add column if not exists app_logo text;
alter table pengaturan add column if not exists brand_set boolean default false;

-- SELESAI Migration v4.