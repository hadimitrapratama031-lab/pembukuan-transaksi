# Panduan Setup — Custom Branding Build Pipeline

Panduan ini menjelaskan langkah demi langkah supaya fitur "ganti nama & logo usaha di Setting → otomatis ada APK baru dengan homescreen sesuai branding itu" bisa jalan.

Total ada **7 tahap setup** (dilakukan sekali saja), lalu pipeline-nya jalan otomatis selamanya.

---

## TAHAP 0 — Pahami dulu alurnya

```
1. User isi nama usaha + pilih logo di layar "Identitas Aplikasi"
2. App upload logo ke Supabase Storage
3. App panggil Edge Function "request-build"
4. Edge Function catat permintaan build + trigger GitHub Actions
5. GitHub Actions checkout kode, ganti app.json + icon, jalankan `eas build`
6. EAS Build proses di server Expo (~10-20 menit)
7. EAS kirim webhook ke Edge Function "build-webhook" saat selesai
8. Edge Function update status jadi "ready" + link APK
9. User buka layar "Status Build", download APK, install manual
```

Yang butuh setup manual dari kamu: tahap 2-7 (infrastruktur). Tahap 1, 8, 9 sudah saya tuliskan kodenya.

---

## TAHAP 1 — Taruh file ke project

1. Extract `custom-build-pipeline.zip`.
2. Copy & timpa file berikut ke folder project kamu (root folder yang ada `app.json`):
   - `app/brand-setup.tsx` → timpa yang lama
   - `app/build-status.tsx` → file baru
   - `supabase/functions/request-build/index.ts` → file baru
   - `supabase/functions/build-webhook/index.ts` → file baru
   - `.github/workflows/custom-build.yml` → file baru
   - `supabase-migration-v9.sql` → taruh di root project (sejajar migration v1-v8)

---

## TAHAP 2 — Push project ke GitHub

Kalau project kamu **belum** ada di GitHub:

```bash
cd nama-folder-project-kamu
git init
git add .
git commit -m "setup custom build pipeline"
```

Lalu buat repo baru di https://github.com/new (bisa **Private**, tidak masalah), kemudian:

```bash
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main
git push -u origin main
```

Kalau project **sudah** ada di GitHub, tinggal:
```bash
git add .
git commit -m "setup custom build pipeline"
git push
```

Catat `USERNAME/NAMA-REPO` — akan dipakai di Tahap 5.

---

## TAHAP 3 — Jalankan migration database

1. Buka https://supabase.com/dashboard → pilih project kamu
2. Menu **SQL Editor** (sidebar kiri)
3. Buka file `supabase-migration-v9.sql`, copy semua isinya
4. Paste di SQL Editor → klik **Run**
5. Pastikan tidak ada error merah. Ini akan membuat tabel `build_requests` dan bucket storage `app-logos`.

---

## TAHAP 4 — Deploy 2 Edge Function

Kalau belum pernah pakai Supabase CLI:
```bash
npm install -g supabase
supabase login
```

Di folder project (yang ada folder `supabase/`):
```bash
supabase link --project-ref XXXXXXXXXX
```
*(project-ref bisa dilihat di URL dashboard Supabase kamu, contoh: `dqiayrsojpyglkumtsgo` dari URL project kamu di `supabase.ts`)*

Lalu deploy:
```bash
supabase functions deploy request-build
supabase functions deploy build-webhook
```

Kalau sukses, akan muncul URL seperti:
`https://dqiayrsojpyglkumtsgo.supabase.co/functions/v1/request-build`

---

## TAHAP 5 — Isi Secrets di Supabase

Dashboard Supabase → **Project Settings** → **Edge Functions** → **Secrets** → tambahkan:

| Nama Secret | Isi | Cara dapatnya |
|---|---|---|
| `GITHUB_TOKEN` | token GitHub | Lihat sub-langkah A di bawah |
| `GITHUB_REPO` | `USERNAME/NAMA-REPO` | dari Tahap 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | key panjang | **Project Settings → API → service_role key** (klik "reveal") |

**Sub-langkah A — bikin GitHub Token:**
1. Buka https://github.com/settings/tokens?type=beta
2. **Generate new token** (Fine-grained)
3. Pilih repo yang tadi kamu buat di Tahap 2
4. Di bagian **Repository permissions**, cari **Contents** → set jadi **Read and write**
5. Generate, lalu **copy tokennya** (cuma muncul sekali!)

---

## TAHAP 6 — Isi Secrets di GitHub

Buka repo kamu di GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, tambahkan 3 ini:

| Nama Secret | Isi | Cara dapatnya |
|---|---|---|
| `EXPO_TOKEN` | token Expo | https://expo.dev → foto profil → Account settings → Access Tokens → Create Token |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | dari `src/lib/supabase.ts` project kamu |
| `SUPABASE_SERVICE_ROLE_KEY` | sama seperti Tahap 5 | Project Settings → API |

---

## TAHAP 7 — Daftarkan Webhook EAS

Ini supaya Expo kasih tahu Supabase saat build sudah selesai.

1. Bikin secret acak dulu, contoh pakai command ini (atau ketik bebas minimal 16 karakter):
```bash
openssl rand -hex 16
```
2. Di terminal, folder project:
```bash
eas webhook:create --event BUILD \
  --url https://XXXXXXXXXX.supabase.co/functions/v1/build-webhook \
  --secret HASIL-RANDOM-TADI
```
*(ganti `XXXXXXXXXX` dengan project-ref Supabase kamu)*

3. Tambahkan secret yang sama itu ke Supabase: **Project Settings → Edge Functions → Secrets** → nama `EAS_WEBHOOK_SECRET`, isi dengan string random yang sama persis dari langkah 1.

---

## SELESAI — Cara testing

1. Buka aplikasi di HP kamu (mode development/Expo Go, atau APK yang sudah terinstall)
2. Masuk ke layar **Identitas Aplikasi**, isi nama usaha baru + pilih logo, klik **Simpan & Lanjutkan**
3. Buka layar **Status Build** (`app/build-status.tsx`) → harusnya muncul status "Menyiapkan build..." lalu "Sedang build APK..."
4. Cek juga di GitHub repo kamu → tab **Actions** → harusnya ada 1 run workflow "Custom Branding Build" yang jalan
5. Tunggu ±10-20 menit → status di app berubah jadi **"APK baru siap!"** dengan tombol Download
6. Download, install manual di HP (aktifkan "izinkan install dari sumber tidak dikenal" kalau HP minta)
7. Cek homescreen — nama & ikon aplikasi harusnya sudah sesuai branding baru

---

## Kalau ada yang gagal, cek di sini duluan

- **Status stuck di "pending"** → cek Edge Function `request-build` di Supabase Dashboard → Edge Functions → Logs. Biasanya masalah di `GITHUB_TOKEN` salah/expired.
- **GitHub Actions merah (gagal)** → klik run yang gagal di tab Actions, baca error-nya. Sering karena `EXPO_TOKEN` salah atau belum `eas build:configure` sebelumnya secara manual satu kali dari laptop kamu.
- **Status stuck di "building" selamanya (padahal GitHub Actions sudah selesai)** → cek webhook EAS sudah terdaftar dengan benar (`eas webhook:list`), dan `EAS_WEBHOOK_SECRET` di Supabase sama persis dengan yang didaftarkan.
