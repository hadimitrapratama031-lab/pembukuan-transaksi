# 💰 Kasir ATM — Aplikasi Pembukuan Mini ATM

Aplikasi Android native (APK) untuk pembukuan Tarik Tunai & Transfer, dengan data tersimpan aman di cloud (Supabase) dan export laporan ke Excel.

---

## 📋 YANG PERLU DISIAPKAN DI PC

1. **Node.js** (versi 18 ke atas) → download di https://nodejs.org
2. **Akun Expo** (gratis) → daftar di https://expo.dev/signup
3. **Akun Supabase** (gratis) → daftar di https://supabase.com

---

## 🗄️ LANGKAH 1: Setup Database Supabase

1. Buka https://supabase.com → buat **New Project**
   - Pilih region: **Southeast Asia (Singapore)**
   - Catat password database yang kamu buat
2. Setelah project siap, buka menu **SQL Editor**
3. Copy seluruh isi file `supabase-setup.sql` (ada di folder ini) → paste → klik **Run**
4. Buka menu **Authentication → Users** → klik **Add User**
   - Masukkan email & password untuk akun kamu
   - Klik **Create User**
5. Buka menu **Project Settings → API**
   - Catat **Project URL** dan **anon public key** — akan dipakai di langkah berikutnya

---

## ⚙️ LANGKAH 2: Hubungkan App ke Supabase

1. Buka file `src/lib/supabase.ts`
2. Ganti baris ini dengan data dari Supabase kamu:
```ts
const SUPABASE_URL = 'GANTI_DENGAN_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'GANTI_DENGAN_SUPABASE_ANON_KEY';
```
Contoh setelah diisi:
```ts
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```
3. Simpan file.

---

## 💻 LANGKAH 3: Install & Jalankan di PC (untuk testing dulu)

Buka folder project di terminal/CMD, lalu jalankan:

```bash
npm install
npx expo start
```

Scan QR code yang muncul pakai app **Expo Go** (download dari Play Store) untuk testing langsung di HP tanpa perlu build APK dulu.

---

## 📦 LANGKAH 4: Build APK (install permanen di HP)

### A. Install EAS CLI (sekali saja)
```bash
npm install -g eas-cli
eas login
```
*(Login pakai akun Expo yang sudah didaftar)*

### B. Konfigurasi project
```bash
eas build:configure
```
Pilih **Android** ketika ditanya platform.

### C. Build APK
```bash
eas build -p android --profile preview
```

Proses build di server Expo (gratis, tier hobi) memakan waktu **±10-20 menit**. Setelah selesai akan muncul link download APK di terminal, atau bisa dicek di https://expo.dev → project kamu → Builds.

### D. Install APK ke HP
1. Download file `.apk` dari link yang diberikan (lewat HP langsung, atau transfer dari PC)
2. Buka file APK di HP → izinkan **"Install dari sumber tidak dikenal"** jika diminta
3. Install seperti app biasa
4. App siap dipakai offline-install, data tetap sync ke cloud Supabase!

---

## 🆕 Setup Fitur Baru (Admin, PIN, dll)

Sebelum pakai fitur "Kelola Akun" dan "PIN", jalankan langkah berikut:

### A. Jalankan Migration SQL
1. Buka Supabase → **SQL Editor**
2. Copy isi `supabase-migration-v2.sql` → paste → **Run**
3. Di file itu ada baris `update profiles set role = 'admin' where ...` yang di-comment — uncomment, ganti `EMAIL_KAMU` dengan email akun utamamu, lalu jalankan baris itu sendiri supaya akun kamu jadi admin.

### B. Deploy Edge Function `admin-users`
Fitur "+ Tambah Akun User" di halaman Pengaturan butuh Edge Function ini (supaya tidak perlu service role key disimpan di app).

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref-kamu>   # lihat di Project Settings > General
supabase functions deploy admin-users
```

*(Project ref kamu: `dqiayrsojpyglkumtsgo` — sudah otomatis dari `src/lib/supabase.ts`)*

Setelah deploy selesai, tombol **"+ Tambah Akun User"** di Pengaturan akan langsung bisa dipakai membuat akun staff/mitra baru tanpa buka dashboard Supabase.

### C. PIN Keamanan
Tidak perlu setup tambahan — setelah migration SQL jalan, setiap login pertama kali kamu akan diminta membuat PIN 6 digit. PIN bisa diganti lewat Pengaturan → **Ubah PIN**.

**Update PIN terbaru:**
- PIN sekarang **selalu diminta lagi** setiap kali app dibuka ulang dari kondisi tertutup (force close / restart HP), maupun setelah app diminimize ke background lalu dibuka lagi.
- Tombol **Reset Modal ke Awal**, **Hapus Semua Transaksi**, dan **Hapus Semua Rekening & Modal** sekarang wajib konfirmasi PIN dulu sebelum benar-benar jalan — supaya tidak ke-trigger gara-gara kepencet.

---

## 🆕 Migration v3 (wajib untuk fitur "Hapus Semua Rekening & Modal")

1. Buka Supabase → **SQL Editor**
2. Copy isi `supabase-migration-v3.sql` → paste → **Run**

Tanpa migration ini, fitur "Hapus Semua Rekening & Modal" akan gagal kalau rekening tsb pernah dipakai di transaksi (karena foreign key constraint). Setelah migration ini, riwayat transaksi lama tetap aman tersimpan walau rekeningnya sudah dihapus (nama rekening di riwayat tetap muncul).

---

## 🆕 Migration v4 (wajib untuk fitur "Identitas Aplikasi" — nama warung & logo)

1. Buka Supabase → **SQL Editor**
2. Copy isi `supabase-migration-v4.sql` → paste → **Run**

Tanpa migration ini, fitur ganti nama & logo aplikasi di Pengaturan / saat setup PIN pertama kali akan error karena kolomnya belum ada di database.

## 🆕 Migration v5 (perbaikan "Database error creating new user")

Kalau muncul error **"Database error creating new user"** (baik saat Add User langsung di dashboard Supabase, maupun lewat tombol "+ Tambah Akun User" di app):

1. Buka Supabase → **SQL Editor**
2. Copy isi `supabase-migration-v5.sql` → paste → **Run**

Ini memperbaiki trigger otomatis yang membuat baris `profiles` & `pengaturan` setiap ada user baru daftar (penyebab paling umum: trigger-nya nggak punya `search_path` yang jelas). Kalau setelah migration ini masih gagal, cek **Logs → Postgres Logs** di dashboard Supabase, cari kata `handle_new_user` untuk lihat pesan error detailnya.

---

## 👤 Menambah Akun Baru (mitra/karyawan)

**Cara baru (lebih mudah):** Login sebagai admin → tab **Pengaturan** → **Kelola Akun** → **+ Tambah Akun User**. Isi nama, email, password, lalu kasih ke orangnya. Selesai — tidak perlu buka Supabase sama sekali. (Pastikan Edge Function `admin-users` sudah di-deploy, lihat bagian "Setup Fitur Baru" di atas.)

**Cara lama (manual via dashboard, kalau Edge Function belum di-deploy):**
1. Buka Supabase Dashboard → **Authentication → Users**
2. Klik **Add User** → isi email & password
3. Berikan email & password itu ke orang yang bersangkutan
4. Mereka install APK yang sama, lalu login pakai akun tersebut

> Catatan: setiap user punya rekening modal & transaksi terpisah (sesuai Row Level Security). Jika ingin semua user berbagi data yang sama, beri tahu saya — strukturnya bisa disesuaikan.

---

## 🔄 Update App di Kemudian Hari

Jika ingin menambah fitur atau memperbaiki bug, jalankan ulang:
```bash
eas build -p android --profile preview
```
Lalu install ulang APK baru ke HP (data tidak akan hilang karena tersimpan di Supabase, bukan di app).

---

## 📁 Struktur Folder

```
kasir-atm-rn/
├── app/                    → semua halaman (screens)
│   ├── login.tsx           → halaman login
│   └── (tabs)/
│       ├── dashboard.tsx   → beranda
│       ├── tarik.tsx       → tarik tunai
│       ├── transfer.tsx    → transfer
│       ├── riwayat.tsx     → riwayat transaksi
│       ├── laporan.tsx     → laporan & export excel
│       └── settings.tsx    → pengaturan
├── src/
│   ├── lib/
│   │   ├── supabase.ts     → koneksi database (ISI URL & KEY DI SINI)
│   │   ├── theme.ts        → warna & style
│   │   └── utils.ts        → fungsi format
│   └── components/
│       └── PromptModal.tsx → modal input custom
├── supabase-setup.sql      → script setup database (jalankan di Supabase)
└── app.json / eas.json     → konfigurasi build
```

---

## ❓ Troubleshooting

**"Module not found" saat npm install** → pastikan Node.js sudah terinstall, coba `npm cache clean --force` lalu install ulang.

**Build gagal di EAS** → cek di https://expo.dev/accounts/[username]/projects/kasir-atm/builds untuk log error detail.

**Login gagal "Invalid login credentials"** → pastikan user sudah dibuat di Supabase Authentication, dan email/password sesuai.

**Data tidak muncul setelah login** → cek apakah SQL setup sudah dijalankan dengan benar (tabel `rekening`, `transaksi`, `pengaturan`, `profiles` harus ada).

**"+ Tambah Akun User" gagal / error "FunctionsFetchError"** → Edge Function `admin-users` belum di-deploy. Lihat bagian "🆕 Setup Fitur Baru" di atas.

**Tidak muncul section "Kelola Akun" di Pengaturan** → akunmu belum berstatus admin. Jalankan ulang baris `update profiles set role = 'admin' ...` di `supabase-migration-v2.sql` dengan email akunmu.

**Lupa PIN** → hubungi admin (atau kalau itu akun admin sendiri), jalankan SQL ini di Supabase SQL Editor untuk reset PIN: `update profiles set pin_hash = null where id = (select id from auth.users where email = 'EMAIL_AKUN');` — lalu login ulang, akan diminta membuat PIN baru.
