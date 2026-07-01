-- ============================================
-- KASIR ATM - Migration v8 — Catatan Channel Customer
-- ============================================
-- Jalankan di: Supabase Dashboard > SQL Editor
--
-- Menambahkan kolom "channel_customer" ke tabel transaksi.
-- Kolom ini HANYA catatan/informasi tambahan (tidak mempengaruhi saldo),
-- untuk mencatat:
--   - TU: customer kirim transfer-nya dari mana (mis. "BCA")
--   - TF: customer minta kirim ke tujuan apa (mis. "GOPAY")
-- Dipisah dari rekening_id / cash_rekening_id (yang memang mempengaruhi saldo)
-- supaya tidak ketuker antara "yang pengaruh ke saldo" vs "cuma catatan".

alter table transaksi add column if not exists channel_customer text;

-- SELESAI Migration v8.
