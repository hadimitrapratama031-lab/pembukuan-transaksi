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

## 👤 Menambah Akun Baru (mitra/karyawan)

Hanya kamu yang bisa membuat akun baru (tidak ada pendaftaran sendiri):
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
