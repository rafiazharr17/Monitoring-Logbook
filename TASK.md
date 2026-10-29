# TASK — Rencana Implementasi Website Logbook

**Versi:** 1.0 | **Acuan:** [PRD.md](./PRD.md) dan [DESIGN.md](./DESIGN.md)  
**Prioritas:** P0 = harus tersedia sebelum MVP rilis; P1 = peningkatan setelah MVP.

## Milestone 0 — Setup dan keputusan infrastruktur (P0)
- [ ] Buat monorepo `client/`, `server/`, `api/`, `docs/`; pasang lint, formatter, TypeScript (disarankan), dan skrip test/build.
- [ ] Tentukan hosting MySQL terkelola, provider email transaksional, penyedia WhatsApp Business Platform/BSP resmi, domain, dan model Groq.
- [ ] Validasi aturan provider WhatsApp: onboarding, verifikasi nomor bisnis/pengguna, opt-in, persetujuan template pengingat, sandbox/production, biaya.
- [ ] Tentukan scheduler sesuai kemampuan plan Vercel: dua Vercel Cron UTC atau scheduler eksternal; simpan `CRON_SECRET`.
- [ ] Siapkan `.env.example`, environment preview/production, dan dokumentasi setup tanpa meng-commit secrets.

**Selesai bila:** frontend/backend dapat dijalankan lokal, MySQL tersambung, dan provider/scheduler produksi telah dipilih.

## Milestone 1 — Database dan autentikasi (P0)
- [ ] Buat migrasi `users`, `logbooks`, `notification_deliveries` dan constraint/index sesuai DESIGN.
- [ ] Implement register/login/logout dan sesi aman; hash password; validasi + rate limit.
- [ ] Implement verifikasi email, profil dan penyimpanan nomor E.164, opt-in WhatsApp dan status verifikasi.
- [ ] Terapkan middleware auth dan pembatasan query berbasis `user_id`.
- [ ] Test register duplikat, password salah, akses tanpa login, dan akses lintas user.

**Selesai bila:** dua pengguna dapat login dan hanya melihat datanya masing-masing.

## Milestone 2 — Pengisian logbook (P0)
- [ ] Buat API create/update/get logbook dan hitung `entry_date` WIB di server.
- [ ] Validasi tiga field wajib, aturan Senin–Jumat, backfill hari kerja lampau, larangan tanggal masa depan.
- [ ] Buat form tiga field dan status simpan/loading/error/sukses.
- [ ] Tangani dua request bersamaan dengan unique key `(user_id, entry_date)`.
- [ ] Test perubahan logbook, validasi input kosong dan transisi tanggal WIB.

**Selesai bila:** user dapat menyimpan/mengedit satu logbook sah per hari kerja.

## Milestone 3 — Integrasi AI Groq (P0)
- [ ] Simpan `GROQ_API_KEY` di backend; buat client Groq dengan timeout dan penanganan error.
- [ ] Rancang prompt output JSON `{learning, obstacles}` berbasis Uraian Aktivitas tanpa fabrikasi.
- [ ] Implement `POST /api/ai/generate`, validasi panjang input dan respons, rate limit.
- [ ] Tampilkan tombol Generate, dua draf editable, fallback manual dan konfirmasi sebelum overwrite edit.
- [ ] Uji respons Groq invalid, timeout, aktivitas ambigu, tidak menyebut kendala, dan kegagalan provider.

**Selesai bila:** generate membantu isi dua field tetapi tidak pernah menyimpan otomatis.

## Milestone 4 — Riwayat kalender (P0)
- [ ] Buat `GET /api/calendar?month=YYYY-MM` dan fungsi status deterministik per hari WIB.
- [ ] Implement warna + label: hijau (tersimpan), abu-abu (akhir pekan/today/future belum terisi), merah (hari kerja lampau terlewat).
- [ ] Tambahkan navigasi bulan, tooltip/legenda, klik tanggal untuk detail/edit.
- [ ] Uji akhir pekan, akhir bulan, lintas tahun, hari ini sebelum/sesudah jam notifikasi, dan entri backfill.

**Selesai bila:** kalender menampilkan status yang cocok dengan database dan tanggal WIB.

## Milestone 5 — Email dan WhatsApp, wajib di MVP (P0)
- [ ] Siapkan integrasi provider email (sender/domain terverifikasi) dan template pengingat.
- [ ] Siapkan WhatsApp resmi: opt-in, template disetujui, kredensial, mapping status/provider message ID.
- [ ] Implement service masing-masing kanal secara independen dan pencatatan `notification_deliveries`.
- [ ] Implement job 15.00/19.00 WIB, cek weekday dan ketiadaan logbook, reservation unik, recheck sebelum send.
- [ ] Lindungi endpoint internal dengan scheduler secret; konfigurasi cron UTC `08:00` dan `12:00` pada Senin–Jumat atau scheduler eksternal setara.
- [ ] Tambahkan retry terbatas, logging dan penanganan kegagalan satu kanal tanpa memblokir kanal lain.
- [ ] Uji: kosong di 15→dua kanal; terisi sebelum 15→tanpa pesan; isi antara 15–19→tanpa pesan 19; tetap kosong→pengingat kedua; weekend→tanpa pesan; retry/race→tanpa duplikat efektif sebisa mungkin.

**Selesai bila:** **kedua kanal** telah diuji end-to-end dengan akun uji dan memenuhi kebijakan provider sebelum rilis; bukan fitur yang ditunda.

## Milestone 6 — UI, keamanan, QA, dan deploy (P0)
- [ ] Finalisasi dashboard responsif, login/register, editor, kalender, profil dan status notifikasi.
- [ ] Audit keamanan: akses lintas user, secret, input, cookie/CSRF, TLS DB, rate limit, kesalahan yang aman.
- [ ] Uji integrasi/E2E, termasuk simulasi waktu WIB dan mock provider; buat backup dan prosedur restore DB.
- [ ] Deploy React/Vite dan Express function di Vercel; sambungkan MySQL eksternal dan env vars produksi.
- [ ] Verifikasi routing `/api`, migrasi produksi, batas koneksi MySQL, latensi fungsi, scheduler di plan aktual.
- [ ] Jalankan smoke test pendaftaran→verifikasi→generate→edit→simpan→kalender hijau dan uji jadwal notifikasi email+WA.
- [ ] Sediakan halaman kebijakan privasi dan penjelasan pemrosesan konten oleh Groq serta opt-in WhatsApp.

**Kriteria rilis MVP:** seluruh tugas P0 selesai; logbook Senin–Jumat, login multi-user, AI editable, kalender 3 warna, dan pengingat **email sekaligus WhatsApp** pada kedua slot telah tervalidasi.

## Milestone 7 — Setelah MVP (P1)
- [ ] Tambah pengaturan/kalender libur nasional dan cuti bersama dari sumber tepercaya.
- [ ] Tambah dashboard admin (jika ada kebutuhan organisasi), statistik kepatuhan, ekspor, dan analitik pengiriman.
- [ ] Tambah pengaturan kanal/jam notifikasi bila kebijakan produk berubah.

## Definition of Done per tugas
Implementasi memiliki validasi frontend/backend, tes untuk happy path + failure path, tidak mengekspos secret, ada error yang bisa dipahami user, dan dokumentasi endpoint/konfigurasi diperbarui. Untuk integrasi eksternal, simpan bukti uji sandbox dan produksi tanpa mencatat data sensitif.
