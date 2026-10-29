# DESIGN — Arsitektur dan Desain Teknis Logbook

**Versi:** 1.0 | **Acuan:** [PRD.md](./PRD.md) | **Zona waktu bisnis:** `Asia/Jakarta`

## 1. Arsitektur
```text
React + Vite (Vercel)
  └─ HTTPS /api → Node.js + Express (Vercel Function)
                    ├─ MySQL terkelola (TLS, connection pool terbatas)
                    ├─ Groq API (server-side only)
                    ├─ Email provider (transactional API)
                    └─ WhatsApp Business Platform / BSP resmi
Scheduler (Vercel Cron atau eksternal) → endpoint terproteksi /api/internal/reminders/run
```
**Catatan Vercel:** fungsi Express harus diekspor melalui entry serverless kompatibel, bukan `app.listen()` sebagai proses persisten. Jangan memakai `node-cron` di dalam fungsi serverless untuk penjadwalan permanen. MySQL tidak di-host sebagai server database di Vercel; gunakan layanan MySQL eksternal. Konfigurasi jumlah koneksi/pooling dan batas fungsi sesuai plan dan adapter yang dipakai. Gunakan transaksi pendek dan retry error transient seperlunya.

## 2. Struktur proyek yang disarankan
```text
logbook/
  client/                  # React + Vite
    src/{app,components,pages,features,services,styles}/
  api/                     # Entrypoint Vercel function untuk Express
  server/
    src/{app,routes,controllers,services,repositories,middleware,jobs,lib}/
    migrations/
  docs/{PRD.md,DESIGN.md,TASK.md}
  .env.example
  vercel.json              # routing + scheduler bila didukung plan
```
Gunakan satu origin `/api` bila memungkinkan agar cookie, CORS, dan deployment lebih sederhana. Bila origin berbeda, konfigurasikan CORS kredensial, CSRF, dan atribut cookie secara eksplisit.

## 3. Desain data MySQL (skema logis)
- `users`: `id` PK, `name`, `email` UNIQUE, `password_hash`, `email_verified_at`, `whatsapp_number` (E.164), `whatsapp_verified_at`, `whatsapp_opt_in_at`, `created_at`, `updated_at`.
- `logbooks`: `id` PK, `user_id` FK, `entry_date` DATE (tanggal WIB), `activity` TEXT, `learning` TEXT, `obstacles` TEXT, `ai_generated_at` NULL, `created_at`, `updated_at`, **UNIQUE (`user_id`, `entry_date`)**; indeks (`user_id`, `entry_date`).
- `notification_deliveries`: `id` PK, `user_id` FK, `entry_date` DATE, `slot` ENUM('15:00','19:00'), `channel` ENUM('email','whatsapp'), `status` ENUM('pending','sending','sent','failed','skipped'), `attempt_count`, `provider_message_id` NULL, `last_error_code` NULL, `sent_at` NULL, `created_at`, `updated_at`, **UNIQUE (`user_id`,`entry_date`,`slot`,`channel`)**.
- `auth_sessions`/refresh-token store bila memilih sesi tersimpan; token reset/verifikasi disimpan dalam bentuk hash dengan expiry.
- Opsional iterasi lanjut: `holidays` untuk pengecualian kalender dengan sumber resmi/konfigurasi administrator.

Seluruh `created_at`, `updated_at`, dan waktu pengiriman direpresentasikan dalam UTC. `entry_date` selalu dihitung eksplisit memakai `Asia/Jakarta` dari waktu server yang tepercaya, bukan tanggal UTC mentah atau tanggal dari browser tanpa validasi.

## 4. Kontrak API (contoh)
| Metode dan endpoint | Fungsi | Otorisasi |
|---|---|---|
| `POST /api/auth/register` | Daftar akun, kirim verifikasi email | Publik, rate limited |
| `POST /api/auth/login` | Login, set sesi aman | Publik, rate limited |
| `POST /api/auth/logout` | Keluar | Login |
| `GET /api/me`; `PATCH /api/me` | Profil, nomor, izin WA | Login |
| `POST /api/auth/verify-email` | Verifikasi token sekali pakai | Token |
| `GET /api/logbooks/today` | Entri tanggal WIB hari ini, jika ada | Login |
| `PUT /api/logbooks/:date` | Create/update entri tanggal `YYYY-MM-DD`; validasi tiga field, weekday, kepemilikan | Login |
| `GET /api/logbooks/:date` | Detail entri sendiri | Login |
| `GET /api/calendar?month=YYYY-MM` | Hari per bulan dengan status + metadata | Login |
| `POST /api/ai/generate` | Input `{activity}`; output `{learning, obstacles}` | Login, rate limited |
| `POST /api/internal/reminders/run?slot=15:00|19:00` | Jalankan slot terjadwal | Secret scheduler, bukan sesi user |

Gunakan status HTTP konsisten (`400/401/403/404/409/422/429/5xx`); validasi input dengan Zod/Joi; batasi panjang `activity` dan output AI; jangan mengandalkan ownership dari payload user. Endpoint scheduler perlu membandingkan secret secara aman, menolak slot yang bukan waktu yang diizinkan jika pemicu otomatis, dan mencatat run ID untuk audit. Untuk Vercel Cron yang memakai GET, buat route internal GET khusus dengan autentikasi `CRON_SECRET`; jangan asumsikan cron dapat melakukan POST atau mengirim header kustom. Scheduler eksternal dapat memakai metode/header yang didukungnya.

## 5. Alur AI Agent (Groq)
1. User mengisi `activity` dan menekan **Generate dengan AI**.
2. Backend memvalidasi panjang input, rate limit per user, lalu memanggil Groq dengan API key dari environment dan model yang tersedia/ditetapkan dalam konfigurasi.
3. System prompt: bahasa Indonesia formal dan ringkas; keluarkan JSON dengan kunci `learning`, `obstacles`; hanya tarik kesimpulan yang didukung aktivitas; jangan mengarang kendala, fakta, identitas, atau hasil yang tidak disebut; jika tak ada informasi kendala, isi 'Tidak ada kendala yang dilaporkan.'
4. Backend memvalidasi/parsing JSON respons, memberi fallback atau pesan kesalahan bila respons tidak sesuai. User dapat mengedit hasil; **tidak ada autosave** dari proses generate.
5. User mengonfirmasi dengan menyimpan ketiga isian; semua nilai disimpan sebagai konten user. Tandai `ai_generated_at` hanya sebagai metadata bila hasil AI dipakai.

Jangan kirim email, nomor WA, password, atau data profil lain dalam prompt. Pertimbangkan pengumuman privasi penggunaan API pihak ketiga.

## 6. Mesin status kalender
Untuk setiap tanggal `d` dalam bulan yang diminta, berdasarkan tanggal `todayWIB`:
```text
if logbook tersimpan pada d: GREEN (terisi)
else if d adalah Sabtu/Minggu: GRAY (libur)
else if d < todayWIB: RED (terlewat)
else: GRAY (belum terisi / belum jatuh tempo)
```
Urutan pengecekan membuat entri tersimpan tetap hijau. MVP membatasi pembuatan/edit logbook ke hari Senin–Jumat; kebijakan backfill: **diizinkan untuk hari kerja lampau** agar merah bisa diperbaiki; tanggal masa depan tidak dapat diisi. Status `GRAY` punya `reason` (`weekend`, `today_unfilled`, `future`) agar UI membedakan labelnya. Bila kemudian ada fitur libur nasional, perluas predicate hari libur yang sama di calendar, validasi form, dan scheduler.

## 7. Workflow notifikasi
- Dua slot **15.00 WIB = 08.00 UTC**, **19.00 WIB = 12.00 UTC**; Indonesia WIB tidak menggunakan DST. Vercel Cron umumnya menggunakan cron UTC. Contoh jadwal `0 8 * * 1-5` dan `0 12 * * 1-5` jika dua cron didukung oleh plan yang dipilih. Verifikasi batas jumlah jadwal/frekuensi dan ketepatan eksekusi pada plan Vercel saat deployment; bila tidak memenuhi kebutuhan, gunakan scheduler eksternal andal yang memanggil endpoint aman. Tetap cek tanggal/jam `Asia/Jakarta` di backend.
- Untuk slot aktif, iterasi user dengan akun layak, query **belum ada** logbook tersimpan pada `todayWIB`, lalu buat record unik per `user/date/slot/channel` secara atomik.
- Sebelum dispatch, cek ulang apakah logbook sudah tersimpan. Jika sudah, tandai `skipped`. Email dikirim ke alamat terverifikasi; WhatsApp ke nomor terverifikasi dengan opt-in, memakai **template pengingat yang disetujui** provider dan memenuhi aturan window percakapan WhatsApp. Template menyebut tanggal dan tautan login, tidak memuat isi logbook sensitif.
- Catat `pending → sending → sent/failed/skipped` dan id provider. Pengiriman provider bersifat eksternal sehingga 'exactly once' end-to-end tidak dapat dijamin sempurna; gunakan idempotency key bila provider mendukung, reservation/lease dan rekonsiliasi untuk mengurangi duplikasi. Retry terbatas dengan backoff, tidak mengulang pesan yang sudah dikonfirmasi terkirim.
- Jika logbook diisi setelah 15.00 tetapi sebelum 19.00, slot 19.00 tidak mengirimkan pengingat. Jika masih kosong, kedua slot dapat mengirim melalui kedua kanal.

## 8. Desain halaman
- **Register/Login:** form, validasi, status verifikasi, tautan kebijakan privasi dan persetujuan notifikasi.
- **Dashboard:** salam singkat, tanggal WIB, kartu status hari ini, CTA isi/edit, kalender bulanan dengan legenda warna dan teks.
- **Editor Logbook:** Uraian Aktivitas, tombol Generate AI, Pembelajaran, Kendala, loading/error, konfirmasi regenerate jika sudah ada edit, tombol Simpan.
- **Riwayat:** kalender dengan status hijau/abu-abu/merah dan detail tanggal terpilih.
- **Profil/Notifikasi:** email dan status verifikasi, nomor WhatsApp dan status opt-in, informasi jadwal pengingat serta status kanal.

## 9. Environment variables (nama contoh, tanpa nilai rahasia)
`DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`, `EMAIL_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, `CRON_SECRET`, `APP_BASE_URL`, `NODE_ENV`. Pisahkan variabel preview/production; jangan gunakan prefix `VITE_` untuk rahasia.

## 10. Keamanan, observabilitas, dan pengujian
- SQL parameterized/ORM, proteksi XSS/CSRF sesuai skema auth, HTTPS, cookie aman, rate limit login/AI/scheduler, secrets management, backup database dan retensi data sesuai kebijakan privasi.
- Log audit minimal: jadwal dijalankan, jumlah user eligible, jumlah skipped/sent/failed per kanal, latensi, dan error provider tanpa membocorkan secret atau konten pribadi.
- Uji unit kalender termasuk Jumat→Sabtu→Senin, bulan/tahun baru dan UTC↔WIB; integrasi unique constraint, ownership, kegagalan Groq, email/WA, race antara save dan job, retry; E2E registrasi hingga kalender hijau; staging test kedua jadwal dengan provider sandbox/akun uji.
