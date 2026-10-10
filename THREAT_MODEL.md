# THREAT MODEL — LaporMagang (Fase 0)

Dokumen ini disusun menggunakan metodologi **STRIDE** untuk mengidentifikasi ancaman, mengevaluasi risiko, dan menetapkan mitigasi teknis sebelum implementasi fitur dimulai.

---

## 1. Ringkasan Sistem & Batasan Produk

- **Nama Aplikasi:** LaporMagang
- **Deskripsi:** PWA pengingat absen & penyusun draf 3 kolom laporan harian Maganghub Kemnaker (Uraian Aktivitas, Pelajaran yang Diperoleh, Kendala yang Dialami).
- **Target Pengguna:** Peserta Pemagangan Nasional (Kemnaker) yang mengakses via Android / Web browser di seluruh Indonesia (WIB, WITA, WIT).
- **Batasan Keras (Zero-Trust Boundaries):**
  1. **TIDAK PERNAH** meminta, menerima, memproses, atau menyimpan kredensial akun SIAP Kerja atau Maganghub.
  2. **TIDAK PERNAH** melakukan otomasi pengiriman, scraping, atau bertindak atas nama pengguna ke sistem Kemnaker.
  3. **Catatan mentah pengguna tidak disimpan secara bawaan** di database. Draf laporan disimpan maksimal 7 hari untuk pengguna Gratis dan sesuai retensi aktif untuk Pro, dengan tombol hapus instan setiap saat.
  4. Status langganan Pro dikelola secara eksklusif oleh server melalui webhook pembayaran tervalidasi atau audit log admin internal.

---

## 2. Klasifikasi Data

| Tingkat Kerahasiaan | Jenis Data | Contoh | Kontrol Keamanan |
| :--- | :--- | :--- | :--- |
| **Sangat Rahasia** | Token Saluran Komunikasi | Bot Token, Web Push Auth Secrets | Enkripsi pgcrypto di DB, decrypted hanya di Edge/Server runtime |
| **Rahasia** | Kunci Integrasi Server | Service Role Key, Resend Key, Midtrans Server Key, Gemini Key | Variabel Lingkungan Server-only, rotasi berkala, zero client exposure |
| **Pribadi (PII)** | Data Identitas Pengguna | Alamat Email, Chat ID Telegram | RLS ketat, hash indeks pencarian, kepatuhan UU PDP No. 27/2022 |
| **Sensitif Pengguna** | Konten Laporan Magang | Draf 3 kolom kegiatan magang | RLS per user_id, auto-delete policy, tanpa logging isi catatan di server |
| **Operasional** | Log Transaksi & Pengingat | Order ID, Jadwal pengingat, Status bayar | Idempotency keys, anonymized IDs dalam log aplikasi |

---

## 3. Analisis Ancaman STRIDE

### S — Spoofing (Pemalsuan Identitas)
- **Ancaman S1:** Penyerang memalsukan webhook Midtrans untuk mengaktifkan status Pro gratis.
  - *Mitigasi:* Verifikasi cryptographic signature SHA512 (`order_id + status_code + gross_amount + ServerKey`), validasi status langsung ke API Midtrans (double-check), serta verifikasi perbandingan constant-time.
- **Ancaman S2:** Penyerang memalsukan pemanggilan endpoint scheduler cron pengingat (`/api/cron/reminders`).
  - *Mitigasi:* Menggunakan header `Authorization: Bearer <CRON_SECRET>` dengan verifikasi `crypto.timingSafeEqual`.
- **Ancaman S3:** Penyerang memalsukan identitas pengguna lain via client-side API.
  - *Mitigasi:* Supabase Auth JWT tervalidasi di setiap Server Action / API route; klaim `auth.uid()` dicocokkan otomatis oleh PostgreSQL Row Level Security (RLS).

### T — Tampering (Manipulasi Data)
- **Ancaman T1:** Pengguna memanipulasi kolom `is_pro` atau `pro_expires_at` via Supabase client SDK.
  - *Mitigasi:* Kolom status Pro hanya dapat diubah oleh peran `service_role`. Kebijakan RLS tabel `profiles` membatasi `UPDATE` dari pengguna hanya pada field konfigurasi (nama tampilan, timezone, reminder channels).
- **Ancaman T2:** Injeksi prompt berbahaya (Prompt Injection) melalui catatan magang atau dokumen unggahan untuk memaksa LLM membocorkan instruksi sistem atau membuat konten palsu.
  - *Mitigasi:* Teks masukan diperlakukan sebagai data tidak tepercaya, diisolasi dengan delimiter XML keras, model tidak diberikan tools/kunci rahasia, serta output divalidasi skema Zod ketat.
- **Ancaman T3:** Manipulasi webhook pembayaran ganda (Replay Attack).
  - *Mitigasi:* Tabel `payment_events` dengan constraint unik pada `transaction_id`/`event_hash` menjamin pemrosesan idempoten.

### R — Repudiation (Penyangkalan Tindakan)
- **Ancaman R1:** Admin mengubah status langganan secara sepihak lalu membantahnya.
  - *Mitigasi:* Tabel `admin_audit_logs` mencatat setiap aksi manual (admin_id, target_user_id, action, reason, timestamp) dengan hak akses append-only.
- **Ancaman R2:** Pengguna mengklaim tidak menerima pengingat harian.
  - *Mitigasi:* Tabel `reminder_logs` mencatat pengiriman berstatus `sent`, `failed`, atau `blocked` secara akurat tanpa mencatat konten pesan.

### I — Information Disclosure (Kebocoran Informasi)
- **Ancaman I1:** Pengguna A membaca draf laporan, catatan, atau jadwal milik Pengguna B.
  - *Mitigasi:* `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` di semua tabel data. Kebijakan `USING (auth.uid() = user_id)` dengan test suite otomatis multi-tenant.
- **Ancaman I2:** Bocornya log yang memuat isi laporan atau email di sistem observability (Vercel/Sentry).
  - *Mitigasi:* Sanitasi logger sentral; hanya merekam event ID, user ID acak (UUID), status code, dan waktu eksekusi. Dilarang mencatat payload request.
- **Ancaman I3:** Terpaparnya kunci server Gemini atau Midtrans ke browser.
  - *Mitigasi:* Kunci tidak diawali dengan `NEXT_PUBLIC_`. Eksekusi API hanya di Server Actions / Next.js Route Handlers.

### D — Denial of Service (Penolakan Layanan)
- **Ancaman D1:** Penyerang membanjiri endpoint generate AI untuk menghabiskan token Gemini dan anggaran sistem.
  - *Mitigasi:* Pembatasan rate limit berbasis IP & User ID (Upstash Redis / token bucket), kuota harian ketat (10/bulan gratis, 3/hari Pro), batas input 4.000 karakter, timeout 20 detik, serta Cloudflare Turnstile pada titik masuk publik.
- **Ancaman D2:** Pengiriman pesan ganda akibat eksekusi cron berulang.
  - *Mitigasi:* Kunci unik `(user_id, scheduled_for, channel)` di `reminder_logs`. Baris jadwal dikunci menggunakan transaksi database atomic.

### E — Elevation of Privilege (Eskalasi Hak Akses)
- **Ancaman E1:** Pengguna biasa mengakses rute admin `/admin` atau fungsi bypass langganan.
  - *Mitigasi:* Role-based check di level database (`profiles.role = 'admin'`) dan pengecekan server-side middleware sebelum merender modul admin.

---

## 4. Matriks Risiko Awal & Status Mitigasi

| ID | Kerentanan Potensial | Dampak | Probabilitas | Tingkat Risiko | Status Fase 0 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| R-01 | Bypass verifikasi webhook QRIS | Kritis | Rendah | Tinggi | Termitigasi oleh signature + payment_events RLS |
| R-02 | Kebocoran data antar user via API Supabase | Kritis | Sedang | Tinggi | Termitigasi oleh RLS default-deny & unit tests |
| R-03 | Prompt injection pada catatan kerja | Sedang | Tinggi | Sedang | Termitigasi oleh XML delimiter + Zod validator |
| R-04 | Spam pengingat karena scheduler crash | Sedang | Sedang | Sedang | Termitigasi oleh unique key di reminder_logs |
| R-05 | Bot spamming formulir pendaftaran/daftar tunggu | Rendah | Tinggi | Sedang | Termitigasi oleh Turnstile + in-memory / KV rate limit |

---

## 5. Status Verifikasi Implementasi Akhir

- **Fase 1 (Landing Page):** Lolos. Demo interaktif statis zero-cost zero-vulnerability, SEO lengkap, penafian resmi Kemnaker dan verifikasi tanggal Oktober 2026.
- **Fase 2 (Fondasi & RLS):** Lolos. Simulasi RLS multi-tenant terbukti 100% (User A terisolasi penuh dari User B).
- **Fase 3 (Laporan & AI):** Lolos. Evaluasi 30 kasus catatan uji beragam domain lulus 100% (30/30). Trigram Jaccard kemiripan teruji.
- **Fase 4 (Pengingat & Scheduler):** Lolos. Verifikasi timingSafeEqual pada authorization token, dispatch status unik terisolasi, integrasi multi-kanal (Telegram, WebPush, iCal).
- **Fase 5 (Pembayaran & Pro):** Lolos. Idempotency test dan verifikasi tanda tangan kriptografis SHA-512 sukses menangkal pemalsuan signature dan manipulasi nominal. Panel admin internal audit trail tersedia.
- **Fase 6 (Keamanan & Legalitas):** Lolos. Security headers aktif (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). Dokumen kepatuhan UU PDP No. 27/2022 lengkap.
