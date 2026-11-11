# PPK LabPortal Design System

> **Institusi**: Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)  
> **Mata Praktikum**: Praktikum Pengembangan Platform Khusus (PPK)  
> **Referensi Desain**: Terinspirasi oleh antarmuka dashboard modern *E-Stock Management* (`e-stock.hancreativemedia.com`).  
> **Tujuan**: Menghadirkan portal akademik laboratorium yang fungsional, bersih, berorientasi data, tidak membosankan (*anti-slop*), dan tampil selaras di **Android (Expo Go)**, **iOS**, maupun **Web Browser**.

---

## 1. Filosofi & Arah Visual

1. **Dashboard-Forward & Data-Centric**:
   - Setiap halaman utama dilengkapi kartu metrik (*stats overview cards*) di bagian atas untuk memberikan visibilitas cepat terhadap data esensial (total sesi, sesi dibuka, tingkat kehadiran, mahasiswa hadir).
   - Tampilan berimbang, modern, dan profesional tanpa elemen kosong.
2. **Navigasi Terintegrasi & Aksesibel**:
   - Header universal menyediakan brand logo interaktif `PPK LabPortal` untuk kembali ke portal utama.
   - Halaman detail dilengkapi breadcrumb navigasi yang konsisten di atas judul konten (`← Kembali ke Jadwal Praktikum` / `← Kembali ke Pemilihan Peran`).
   - Informasi pengguna aktif (nama, peran, kelas/pengampu) dan tombol `Ganti Akun` selalu dapat diakses dari header dengan modal popup terpusat.
3. **Penyelarasan Responsif (Web vs Mobile)**:
   - **Pada Web**: Konten dibatasi dalam kontainer elegan (`maxWidth: 960, width: '100%', alignSelf: 'center'`). Bar navigasi tab tidak diregangkan dari ujung ke ujung monitor, melainkan dipusatkan (*floating centered pill navigation*) yang proporsional dan sedap dipandang.
   - **Pada Mobile (Android & iOS)**: Full-width dengan padding 14px–20px, touch targets $\ge 44$px, dan perlindungan safe-area terhadap kamera punch-hole / notch.

---

## 2. Palet Warna (Color Tokens)

Mengikuti palet terkurasi dari referensi E-Stock:

### A. Aksen Utama (Primary Brand)
- **Terracotta Orange** (`#EA580C`): Warna identitas utama, tombol aksi primer, indikator aktif, aksen portal praktikan.
- **Warm Orange Hover / Pressed** (`#C2410C`): State tombol ketika ditekan.
- **Soft Peach / Tint** (`#FFF7ED`): Latar belakang badge halus, chip terpilih, dan highlight kartu praktikan.
- **Border Peach** (`#FFEDD5`): Garis pembatas aksen hangat.

### B. Aksen Sekunder (Asisten & Akademik)
- **Academic Teal** (`#0D9488`): Identitas peran asisten laboratorium, badge info, link sekunder.
- **Teal Hover / Pressed** (`#0F766E`): State tombol asisten aktif.
- **Teal Tint** (`#F0FDFA`): Latar kartu dan badge asisten.
- **Teal Border** (`#CCFBF1`): Garis pembatas kartu asisten.

### C. Skala Netral (Slate Neutral)
- **Canvas Background** (`#F8FAFC`): Latar belakang utama aplikasi yang ramah di mata.
- **Card / Surface Background** (`#FFFFFF`): Latar belakang kartu, modal, dan navbar.
- **Heading Text** (`#0F172A`): Teks judul tebal dengan kontras tinggi (WCAG AAA).
- **Body Text** (`#334155`): Teks isi, informasi sesi, nama mahasiswa.
- **Muted Text** (`#64748B`): Keterangan waktu, label metadata, placeholder input.
- **Default Border** (`#E2E8F0`): Garis batas kartu, divider, dan stroke form input.

### D. Warna Status Fungsional (Status Indicators)
- **Dibuka / Hadir (Success)**: Dot `#16A34A`, Teks `#15803D`, Latar `#DCFCE7`, Border `#86EFAC`.
- **Belum Dibuka (Warning)**: Dot `#EAB308`, Teks `#B45309`, Latar `#FEF3C7`, Border `#FDE68A`.
- **Ditutup / Belum Hadir (Danger / Inactive)**: Dot `#DC2626`, Teks `#B91C1C`, Latar `#FEE2E2`, Border `#FCA5A5`.

---

## 3. Komponen Utama & Pola Antarmuka

1. **`RoleHeader` (Universal Top Bar)**:
   - Sisi Kiri: Logo brand badge `PPK` dan teks `PPK LabPortal Presensi & Manajemen Sesi` yang dapat diklik untuk kembali ke portal utama.
   - Sisi Kanan: Badge peran aktif (`MAHASISWA` atau `ASISTEN`), nama pengguna, dan tombol `Ganti Akun`.
   - Beralih akun memunculkan modal popup terpusat dengan daftar akun dan opsi keluar ke portal peran.
2. **`BreadcrumbBack` (Navigasi Kembali Antar-Halaman)**:
   - Tombol pil bersih di atas judul konten (`← Kembali ke Jadwal Praktikum` / `← Kembali ke Pemilihan Peran`) yang sejajar dengan layout konten utama.
3. **`StatCard` / Metrics Overview Row**:
   - Baris 4 kartu ringkasan di bagian atas layar Jadwal, Rekap, dan Riwayat.
   - Menampilkan angka besar tebal, label deskriptif, dan status visual.
4. **`SesiCard` (Kartu Sesi Praktikum)**:
   - Judul praktikum, chip kelas, badge status sesi dengan dot warna.
   - Garis waktu pelaksanaan (`Tanggal • Jam WIB`) dan ruang laboratorium (`Lab`).
   - Sisi Asisten: Badge jumlah mahasiswa yang telah hadir (`X Mahasiswa Hadir`).
   - Sisi Praktikan: Banner hijau verifikasi kehadiran jika sudah presensi (`Sudah Presensi [Waktu]`).
5. **Modal Manajemen Sesi (Asisten CRUD)**:
   - Modal popup Tambah Sesi: Form terpusat untuk menambahkan materi, kelas (A/B), ruang, tanggal, dan jam.
   - Modal popup Edit Sesi: Form terpusat untuk menyunting materi, ruang, dan jam.
   - Tombol Buka Kembali Sesi: Mengizinkan asisten membuka sesi yang telah ditutup untuk presensi susulan.
6. **`ConfirmationModal`**:
   - Dialog konfirmasi elegan untuk aksi buka sesi, tutup sesi, buka kembali, hapus sesi, kirim presensi, dan dialog feedback.
7. **`EmptyState`**:
   - Ikon konteks bulat, judul tegas, pesan informatif, dan tombol aksi pemulih.
