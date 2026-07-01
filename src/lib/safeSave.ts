import { supabase } from './supabase';

// ============================================================
// Kenapa file ini ada:
// Sebelumnya banyak tempat di app pakai `.update({...}).eq('user_id', x)`
// untuk simpan PIN / nama warung / logo / biaya admin ke tabel
// `profiles` & `pengaturan`. Masalahnya: kalau baris untuk user itu
// ENTAH KENAPA belum ada di database (mis. trigger pembuatan akun
// sempat gagal di masa lalu, lihat supabase-migration-v5.sql),
// `.update()` TIDAK menghasilkan error sama sekali — Supabase cuma
// bilang "berhasil update 0 baris" dan kode lama menganggap itu sukses.
// Akibatnya: muncul "✅ Berhasil" padahal sebenarnya TIDAK ada yang
// tersimpan, dan setiap app dibuka ulang diminta isi ulang dari awal.
//
// Fungsi di bawah ini pakai `upsert` (insert kalau belum ada baris,
// update kalau sudah ada) DAN mengecek balikan datanya — kalau baris
// yang dikembalikan kosong, dianggap GAGAL dan dilempar sebagai error
// yang jelas, bukan didiamkan.
// ============================================================

/** Simpan (upsert) ke tabel `profiles`, pastikan benar-benar tersimpan. */
export async function saveProfile(userId: string, patch: Record<string, any>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Gagal menyimpan profil: baris data tidak ditemukan setelah disimpan.');
  return data;
}

/** Simpan (upsert) ke tabel `pengaturan`, pastikan benar-benar tersimpan. */
export async function savePengaturan(userId: string, patch: Record<string, any>) {
  const { data, error } = await supabase
    .from('pengaturan')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Gagal menyimpan pengaturan: baris data tidak ditemukan setelah disimpan.');
  return data;
}
