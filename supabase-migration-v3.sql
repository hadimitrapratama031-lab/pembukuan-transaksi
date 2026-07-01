-- ============================================
-- KASIR ATM - Migration v3
-- ============================================

alter table transaksi drop constraint if exists transaksi_rekening_id_fkey;
alter table transaksi
  add constraint transaksi_rekening_id_fkey
  foreign key (rekening_id) references rekening(id) on delete set null;

alter table transaksi drop constraint if exists transaksi_cash_rekening_id_fkey;
alter table transaksi
  add constraint transaksi_cash_rekening_id_fkey
  foreign key (cash_rekening_id) references rekening(id) on delete set null;

-- SELESAI Migration v3.