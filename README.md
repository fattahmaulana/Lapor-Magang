# LaporMagang

> **Alat Bantu Mandiri & Pengingat Laporan Harian Pemagangan Nasional (Maganghub, Kemnaker)**  
> *Bukan aplikasi resmi Kementerian Ketenagakerjaan RI.*

LaporMagang adalah Progressive Web App (PWA) untuk membantu peserta program magang Kemnaker menjaga disiplin absensi dan menyusun draf 3 kolom laporan harian (Uraian Aktivitas, Pelajaran yang Diperoleh, Kendala yang Dialami) sebelum batas akhir pukul 23.59 waktu setempat.

---

## 🔒 8 Aturan Keras Keamanan & Kedaulatan Data

1. **Tanpa Password Akun Pemerintah:** Tidak pernah meminta, memproses, atau menyimpan kata sandi SIAP Kerja atau Maganghub.
2. **Tanpa Otomasi Pengiriman:** Tidak melakukan web scraping atau submit laporan otomatis. Pengguna menyalin dan mengirim sendiri secara mandiri.
3. **AI Berbasis Fakta Murni:** Draf AI hanya menggunakan fakta dari catatan pengguna. Jika catatan kurang dari 80 karakter atau ambigu, sistem menanyakan 1 pertanyaan klarifikasi tanpa mengarang kegiatan fiktif.
4. **Minimasi Data (UU PDP No. 27/2022):** Catatan mentah tidak disimpan permanen di server. Pengguna dapat menghapus seluruh data dalam 1 klik.
5. **Penafian Resmi Transparan:** Label "Bukan aplikasi resmi Kemnaker" tercantum jelas di landing page, antarmuka aplikasi, dan dokumen hukum.
6. **Pengingat Selamanya Gratis:** Pengingat multi-kanal (Telegram, Web Push, kalender, email) tetap gratis. Paket Pro hanya untuk fitur kenyamanan ekstra.
7. **Keamanan Pembayaran Berbasis Server:** Status Pro hanya ditulis oleh server setelah verifikasi signature webhook SHA-512 Midtrans secara idempoten.
8. **Tanpa Klaim Palsu:** Tanpa testimoni rekayasa, angka pengguna manipulatif, atau klaim yang tidak dapat diverifikasi secara faktual.

---

## 🚀 Fitur Utama

- **Hitung Mundur Tabular ke 23.59:** Indikator visual urgensi waktu (Normal > 3 jam, Peringatan < 3 jam, Kritis < 1 jam).
- **Generator Draf 3 Kolom:** Validasi Zod ketat memastikan setiap kolom memenuhi standar 120–400 karakter (aturan Maganghub minimal 100 karakter).
- **Deteksi Kemiripan Trigram Jaccard:** Membandingkan draf baru dengan 7 hari terakhir dan memberikan peringatan jika skor > 0.6 untuk mencegah laporan monoton.
- **Pengingat Multi-Kanal:**
  - Bot Telegram interaktif dengan tombol "Sudah Lapor" dan "Ingatkan 30 Menit Lagi".
  - Notifikasi Web Push langsung ke layar kunci Android.
  - File kalender `.ics` & integrasi Google Calendar.
- **Dukungan Pembayaran QRIS Dinamis:** Paket 1 Bulan (Rp5.000), 3 Bulan (Rp12.000), dan 6 Bulan (Rp22.000) tanpa auto-debit.
- **Panel Admin Internal:** Pencatatan audit trail untuk aktivasi manual.

---

## 🛠️ Stack Teknologi

- **Framework:** Next.js 15+ (App Router), React 19, TypeScript (Strict Mode)
- **Styling & Desain:** Tailwind CSS v4, Plus Jakarta Sans, Desain Mobile-First (360px–640px)
- **AI Engine:** Google Gemini Flash (`@google/genai`) dengan adapter isolasi delimiter XML
- **Validasi Data:** Zod Schema Validation
- **Keamanan:** Row Level Security (RLS) Postgres, Constant-Time Comparison, Security Headers (CSP, X-Frame-Options, Permissions-Policy)

---

## 📦 Menjalankan Proyek

```bash
# 1. Jalankan development server
npm run dev

# 2. Jalankan test suite keamanan, RLS, & unit tests
npm run test

# 3. Jalankan evaluasi 30 kasus catatan uji
npm run eval

# 4. Build untuk produksi
npm run build
```

---

## 🔑 Variabel Lingkungan (`.env`)

Lihat referensi lengkap di `.env.example`.
- `GEMINI_API_KEY`: Kunci API Gemini untuk adapter AI server-side.
- `NEXT_PUBLIC_SUPABASE_URL`: URL REST API project Supabase (contoh: `https://xyz.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Kunci Anon publik Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Kunci Service Role Supabase untuk operasi backend aman.
- `MIDTRANS_SERVER_KEY`: Kunci server Midtrans (Sandbox/Production).
- `MIDTRANS_CLIENT_KEY`: Kunci client Midtrans.
- `MIDTRANS_IS_PRODUCTION`: `"false"` untuk Sandbox, `"true"` untuk Production.
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram untuk notifikasi interaktif.
- `CRON_SCHEDULER_SECRET`: Token otorisasi constant-time untuk cron runner.

---

## 💳 Uji Pembayaran Sandbox (Midtrans QRIS)

Berikut panduan menguji alur pembayaran QRIS dinamis dan aktivasi otomatis Paket Pro di lingkungan Sandbox:

1. **Ambil Kunci Sandbox di Dashboard Midtrans:**
   - Masuk ke [Midtrans Dashboard](https://dashboard.midtrans.com/).
   - Pastikan toggle di pojok kiri atas berada pada mode **Sandbox Environment**.
   - Buka menu **Settings** → **Access Keys**.
   - Salin nilai **Server Key** dan **Client Key**.

2. **Konfigurasi Environment Variable:**
   - Masukkan ke file `.env.local` lokal Anda dan pada dashboard **Vercel** (Project Settings → Environment Variables):
     ```env
     MIDTRANS_SERVER_KEY="SB-Mid-server-xxxx..."
     MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxx..."
     MIDTRANS_IS_PRODUCTION="false"
     ```
   - Redeploy aplikasi Anda di Vercel setelah variabel lingkungan disimpan.

3. **Atur Payment Notification URL:**
   - Di dashboard Midtrans Sandbox, buka **Settings** → **Configuration**.
   - Masukkan URL webhook produksi/deploy Anda:
     ```text
     https://DOMAIN-SAYA.vercel.app/api/payments/webhook
     ```
   - Simpan pengaturan konfigurasi webhook.

4. **Cara Simulasi Pembayaran:**
   - Buka aplikasi Anda, masuk ke akun, lalu buka halaman **Profil** (`/app/profil`).
   - Pilih paket (1 Bulan: Rp5.000, 3 Bulan: Rp12.000, atau 6 Bulan: Rp22.000).
   - Klik **"Bayar dengan QRIS Dinamis"**. Salin string QR atau catat Order ID (`LM-...`).
   - Buka [Midtrans Payment Simulator (QRIS)](https://simulator.sandbox.midtrans.com/qris/index).
   - Masukkan Order ID atau scan string QRIS tersebut, lalu klik **"Pay"**.
   - Server LaporMagang akan menerima notifikasi webhook, memvalidasi signature SHA-512 secara idempoten, dan status Pro di antarmuka web Anda akan langsung aktif otomatis dalam beberapa detik.

> **Catatan Penting Menuju Production:**  
> Ganti nilai `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` ke kredensial Production serta ubah `MIDTRANS_IS_PRODUCTION="true"` **hanya setelah verifikasi dan aktivasi akun bisnis Midtrans Anda resmi disetujui**.

