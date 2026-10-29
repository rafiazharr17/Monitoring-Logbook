# PRD — Website Monitoring Logbook Harian

**Versi:** 1.0 (MVP)  
**Status:** Spesifikasi awal siap implementasi  
**Zona waktu bisnis:** Asia/Jakarta (WIB, UTC+7)

## 1. Ringkasan
Website multi-user untuk menulis dan memantau logbook wajib **Senin–Jumat**. Pengguna mengisi **Uraian Aktivitas**, lalu meminta AI Agent berbasis **Groq API** menyusun draf **Pembelajaran yang Diperoleh** dan **Kendala yang Dialami**. Pengguna dapat memeriksa dan mengedit kedua hasil sebelum menyimpan. Logbook yang tersimpan ditampilkan dalam kalender riwayat. Jika logbook hari kerja belum tersimpan, sistem mengirim pengingat melalui **email dan WhatsApp** pada pukul **15.00 dan 19.00 WIB** (kedua kanal tersedia sejak MVP).

## 2. Tujuan dan indikator keberhasilan
- Pengguna dapat register, login, mengisi/mengedit satu logbook per tanggal kerja, dan melihat riwayatnya sendiri.
- Pengingat terkirim hanya kepada pengguna yang belum menyimpan logbook untuk tanggal berjalan pada kedua jadwal.
- Riwayat kalender mudah dibaca: hijau = sudah tersimpan; abu-abu = hari libur/akhir pekan atau hari yang belum jatuh tempo dan belum terisi; merah = hari kerja yang sudah lewat tanpa logbook.
- Penggunaan AI mempersingkat penulisan tetapi pengguna tetap memegang keputusan akhir.
- Target operasional: tidak ada pengingat ganda untuk pengguna/tanggal/jam/kanal; kegagalan kanal dicatat dan dapat dicoba ulang secara aman.

## 3. Persona dan hak akses
**Pengguna terdaftar:** mengelola profil, preferensi/persetujuan notifikasi, logbook dan kalender miliknya. **Sistem terjadwal:** memeriksa ketidaklengkapan dan mengirim notifikasi. Tidak ada dashboard admin yang wajib pada MVP. Semua query data pengguna wajib dibatasi dengan `user_id` dari sesi terverifikasi.

## 4. Ruang lingkup MVP
1. Register, login, logout, hash password, validasi input, autentikasi aman, dan halaman profil.
2. Profil berisi email terverifikasi, nomor WhatsApp format E.164 (contoh `+628...`), zona waktu bisnis WIB, serta persetujuan eksplisit menerima pengingat WhatsApp. Verifikasi nomor sesuai persyaratan provider sebelum pengiriman produksi.
3. Form logbook dengan tiga bidang: **Uraian Aktivitas** (input utama), **Pembelajaran yang Diperoleh**, **Kendala yang Dialami** (keduanya dapat diisi manual atau dibuat draf oleh AI).
4. Tombol **Generate dengan AI** aktif jika Uraian Aktivitas valid; tampilkan status loading, hasil terpisah yang dapat diedit, serta tindakan generate ulang dengan konfirmasi bila berpotensi menimpa edit pengguna. Jika AI gagal, form tetap bisa diisi manual.
5. Satu logbook per pengguna per tanggal WIB; pengguna bisa melihat dan mengedit entri tersimpan miliknya. Simpan mencatat waktu pembuatan dan perubahan.
6. Kalender bulanan dengan navigasi bulan, legenda, klik tanggal untuk melihat/mengedit entri. Status dihitung di server memakai tanggal WIB.
7. Pengingat **email dan WhatsApp** pada **15.00 dan 19.00 WIB**, Senin–Jumat, hanya ketika entri tanggal tersebut belum disimpan. Setiap kanal memiliki rekam status pengiriman.
8. Antarmuka responsif, indikator error/sukses, dan aksesibilitas dasar.

## 5. Aturan bisnis dan acceptance criteria
| ID | Aturan | Kriteria penerimaan |
|---|---|---|
| BR-01 | Kewajiban Senin–Jumat berdasarkan tanggal WIB | Sabtu/Minggu tidak memicu pengingat atau status merah. |
| BR-02 | Tepat satu logbook per user/tanggal | Constraint unik database mencegah duplikat, termasuk request bersamaan. |
| BR-03 | Logbook sah bila ketiga bidang telah diisi dan disimpan | Draf AI saja tidak mengubah warna kalender menjadi hijau. |
| BR-04 | Hari kerja lampau tanpa logbook = merah | Hari ini yang belum terisi tetap abu-abu hingga berganti tanggal WIB; jadwal pengingat tidak mengubahnya menjadi merah lebih awal. |
| BR-05 | Logbook tersimpan = hijau | Entri tersimpan tetap hijau saat riwayat dibuka ulang. |
| BR-06 | Akhir pekan = abu-abu | Tanggal mendatang yang belum terisi juga abu-abu; legenda/tooltip membedakan 'libur' dan 'belum jatuh tempo'. |
| BR-07 | Jadwal pengingat 15.00 dan 19.00 WIB | Pada tiap jadwal, sistem mengecek ulang database sebelum mengirim; yang sudah mengisi tidak dikirimi. |
| BR-08 | Kedua kanal tersedia di MVP | Email dan WhatsApp dikirim jika alamat/nomor valid, terverifikasi, dan izin yang diperlukan telah diberikan; kegagalan salah satu kanal tidak menghalangi kanal lain. |
| BR-09 | Pengingat idempoten | Maksimal satu pengiriman efektif per user/tanggal/slot/kanal, dengan pencatatan upaya dan status. |
| BR-10 | AI menghasilkan saran, bukan fakta terjamin | Hasil dapat diedit; prompt melarang mengarang pengalaman dan menyarankan 'Tidak ada kendala yang dilaporkan' bila aktivitas tidak menyebut kendala. |
| BR-11 | Data privat per user | User A tidak dapat membaca/menulis logbook User B dengan memodifikasi ID/URL. |

**Hari libur:** MVP mendefinisikan libur otomatis sebagai Sabtu–Minggu. Libur nasional/cuti bersama belum otomatis dikecualikan; kalender dan mesin aturan disiapkan untuk tabel pengecualian hari libur di iterasi selanjutnya. Jangan menandai hari kerja nasional sebagai libur tanpa sumber/konfigurasi yang jelas.

## 6. Alur pengguna
1. Register → verifikasi email → login → lengkapi nomor WhatsApp dan persetujuan notifikasi.
2. Buka dashboard → lihat status logbook hari ini dan kalender.
3. Tulis Uraian Aktivitas → klik Generate dengan AI (opsional) → tinjau/edit Pembelajaran dan Kendala → Simpan.
4. Kalender hari itu menjadi hijau; dari kalender user bisa melihat/mengedit logbook.
5. Pada 15.00 dan 19.00 WIB hari kerja, sistem melewati user yang telah menyimpan; user yang belum menyimpan mendapatkan email dan WhatsApp sesuai kelayakan kanal.

## 7. Kebutuhan nonfungsional
- Password di-hash (Argon2id atau bcrypt); autentikasi berbasis cookie HttpOnly Secure SameSite yang sesuai topologi; rate limit auth dan endpoint AI; validasi server-side.
- Kunci Groq, database, email, dan WhatsApp hanya di backend; transport HTTPS; pembatasan ukuran input dan output AI; minimisasi data pribadi di prompt.
- Timestamps disimpan UTC, `entry_date` memakai tanggal kalender WIB; jangan bergantung pada timezone server Vercel.
- Log pengiriman, error yang terpantau, retry terbatas, dan perlindungan duplikasi; data pribadi tidak dimasukkan ke log aplikasi secara berlebihan.
- Layout mobile dan desktop; status warna juga diberi teks/ikon agar tidak bergantung pada warna saja.

## 8. Di luar cakupan MVP
Admin organisasi, persetujuan atasan, ekspor PDF/Excel, lampiran, integrasi absensi, aplikasi mobile native, analitik lintas pengguna, serta sinkronisasi otomatis kalender libur nasional.

## 9. Dependensi dan asumsi
- Frontend React + Vite dan backend Node.js + Express; MySQL dikelola di penyedia database yang bisa diakses secara aman dari Vercel.
- Deploy frontend dan Express melalui Vercel dengan konfigurasi fungsi serverless yang kompatibel. Jadwal dijalankan oleh Vercel Cron bila dukungan plan dan presisinya memenuhi kebutuhan, atau scheduler eksternal yang memanggil endpoint aman.
- Provider email transaksional dan **WhatsApp Business Platform** (Cloud API atau BSP resmi) dibutuhkan; pengiriman WhatsApp proaktif menggunakan template yang disetujui, persetujuan penerima, dan aturan platform yang berlaku.
- Ketepatan jadwal adalah target pemicu 15.00/19.00 WIB; antrean/provider dapat menyebabkan pesan diterima sedikit setelah waktu tersebut.

## 10. Pertanyaan implementasi yang dapat diputuskan saat setup
Pilih provider email, WhatsApp, MySQL terkelola, domain, dan mekanisme verifikasi nomor. Pilihan vendor tidak mengubah kewajiban fitur MVP di atas.
