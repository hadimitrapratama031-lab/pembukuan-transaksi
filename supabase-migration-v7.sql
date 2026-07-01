-- ============================================
-- KASIR ATM - Migration v7 — Logo Brand Otomatis
-- ============================================
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Menambahkan kolom logo_url ke tabel rekening supaya logo brand
-- (DANA, GoPay, BCA, dst) yang terdeteksi otomatis saat Tambah Rekening
-- ikut tersimpan dan tetap muncul lagi setelah dibuka ulang.

alter table rekening add column if not exists logo_url text;

-- SELESAI Migration v7.
