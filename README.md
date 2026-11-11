# PPK LabPortal — Sistem Presensi & Manajemen Sesi Praktikum

> **Sprint 1: Antarmuka dan Alur Praktikum**  
> Praktikum Pengembangan Platform Khusus (PPK) · Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)  
> Dibangun dengan **React Native**, **Expo**, dan **Expo Router**. Mendukung penuh **Android (Expo Go)**, **iOS**, dan **Web Browser**.

---

## 1. Deskripsi Proyek

**PPK LabPortal** adalah aplikasi pencatatan kehadiran laboratorium praktikum terpadu yang dirancang dari dua sudut pandang pengguna: **Mahasiswa / Praktikan** dan **Asisten Laboratorium**.

Pada Sprint 1 ini, aplikasi mendemonstrasikan siklus lengkap kegiatan praktikum:
1. **Asisten Mengelola & Membuka Sesi**: Asisten dapat membuat sesi baru (`+ Tambah Sesi`), memilih jadwal sesi berstatus `Belum Dibuka`, dan mengonfirmasi pembukaan sesi melalui dialog modal.
2. **Praktikan Melakukan Presensi**: Praktikan melihat sesi yang `Dibuka`, mengisi catatan kehadiran, menyetujui pernyataan integritas, dan mencatat kehadiran. Waktu kehadiran tercatat secara otomatis. Praktikan dilindungi dari presensi ganda (anti-duplikasi).
3. **Asisten Memantau Rekap & Roster Kelas**: Asisten melihat daftar lengkap mahasiswa kelas tersebut (status `Hadir` beserta jam presensi, atau `Belum Hadir`) dan statistik persentase kehadiran kelas.
4. **Praktikan Memeriksa Riwayat Kehadiran**: Praktikan memantau daftar sesi yang telah dihadiri beserta banner statistik keaktifan pribadi.
5. **Asisten Menutup & Membuka Kembali Sesi**: Asisten dapat menutup sesi praktikum saat selesai atau membuka kembali sesi (`Buka Kembali Sesi`) jika diperlukan presensi susulan bagi mahasiswa. Serta dapat menyunting materi/ruang (`Edit Sesi`) atau menghapus sesi (`Hapus Sesi`).

---

## 2. Fitur Utama (Sprint 1)

### A. Sudut Pandang Praktikan
- **Jadwal & Detail Sesi Praktikum**: Daftar sesi lengkap dengan modul, nama praktikum, kelas, ruang laboratorium, waktu, dan status sesi (`Dibuka`, `Belum Dibuka`, `Ditutup`).
- **Filter Status & Filter Cerdas Kelas Saya**: Filter sesi berdasarkan status (`Semua`, `Dibuka`, `Belum Dibuka`, `Ditutup`) serta chip khusus **`Kelas Saya (Kelas A/B)`** untuk memfilter sesi yang relevan dengan kelas mahasiswa.
- **Metrik Jadwal Overview**: Ringkasan jumlah sesi total, sesi dibuka, sesi sudah dihadiri, dan sesi belum dibuka.
- **Pencatatan Presensi Mandiri dengan Kode Sesi (4 Digit)**: Form pengisian kehadiran saat sesi berstatus `Dibuka` yang mewajibkan input 4 digit kode sesi yang dibagikan oleh asisten di ruang lab, kolom catatan opsional, dan checkbox integritas kehadiran.
- **Validasi Kesesuaian Kelas**: Menolak presensi jika kelas mahasiswa tidak sesuai dengan kelas sesi praktikum (misal mahasiswa Kelas B dilarang presensi di sesi Kelas A) dengan pesan umpan balik informatif.
- **Validasi Anti-Duplikasi Presensi**: Praktikan tidak dapat melakukan presensi dua kali pada sesi yang sama. Status tombol langsung terkunci menjadi `Presensi Telah Lengkap` / `Sudah Presensi`.
- **Riwayat Kehadiran Pribadi**: Daftar riwayat kehadiran lengkap dengan timestamp presensi dan statistik kehadiran pribadi.

### B. Sudut Pandang Asisten Laboratorium
- **Manajemen Sesi Real-Time**: Buka sesi (`Belum Dibuka` → `Dibuka`) dan tutup sesi (`Dibuka` → `Ditutup`) dengan perubahan status instan pada seluruh antarmuka.
- **Kode Sesi Presensi Aktif (4 Digit)**: Saat sesi dibuka, asisten mendapatkan kartu khusus kode 4 digit (misal: `2401`) untuk dibagikan secara lisan/visual kepada praktikan di laboratorium. Kode juga tersemat pada kartu sesi.
- **Buka Kembali Sesi Praktikum**: Sesi yang telah ditutup dapat dibuka kembali oleh asisten untuk memberikan kesempatan presensi susulan.
- **CRUD Sesi Praktikum**:
  - **Tambah Sesi Baru**: Asisten dapat menjadwalkan sesi modul baru lengkap dengan form modal dan auto-generate kode sesi 4 digit.
  - **Edit Informasi Sesi**: Asisten dapat memperbarui materi modul, ruang lab, jam, dan tanggal pelaksanaan.
  - **Hapus Sesi**: Asisten dapat menghapus sesi dengan dialog konfirmasi aman.
- **Progress Bar Tingkat Kehadiran**: Bar visual ketercapaian presensi kelas secara real-time.
- **Dialog Modal Konfirmasi**: Setiap aksi pembukaan, penutupan, buka kembali, atau penghapusan sesi diamankan dengan `ConfirmationModal` untuk mencegah kesalahan penekanan.
- **Roster Lengkap Kelas (Hadir vs Belum Hadir)**: Menampilkan seluruh mahasiswa terdaftar pada kelas sesi tersebut, membedakan siapa yang sudah presensi (disertai jam kehadiran) dan siapa yang belum hadir, dilengkapi filter tab.
- **Rekapitulasi Kehadiran Sesi**: Halaman rekapitulasi kelas per sesi dengan indikator persentase kehadiran, jumlah mahasiswa hadir, dan daftar rincian nama mahasiswa.

### C. Komponen Universal & Aksesibilitas
- **`RoleHeader` Seragam**:
  - Identitas institusi & laboratorium: **Pengembangan Platform Khusus (PPK) · Departemen Informatika, Universitas Diponegoro**.
  - Badge peran aktif (`MAHASISWA` atau `ASISTEN LAB`), nama pengguna, dan NIM/kelas.
  - Tombol **`Ganti Akun`** yang memunculkan modal popup terpusat untuk beralih akun atau keluar ke portal utama tanpa perlu reload aplikasi.
- **Desain Responsif Web & Mobile**:
  - Pada layar lebar (Web Browser), konten dibatasi proporsional (`maxWidth: 960`) dan navigasi tab bar dipusatkan secara proporsional (*floating centered nav*).
  - Pada layar ponsel (Android/iOS), layout full-width responsif dengan safe-area insets dan touch targets terstandarisasi.

---

## 3. Desain Sistem (E-Stock Inspired)

Antarmuka aplikasi dibangun mengacu pada referensi dashboard modern *E-Stock Management* (`e-stock.hancreativemedia.com`), menghindari tampilan kaku, kosong, atau *slop*:

| Token | Nilai Hex | Penggunaan |
|---|---|---|
| **Terracotta Primary** | `#EA580C` | Aksen utama portal mahasiswa, tombol aksi primer, active tab |
| **Warm Peach / Tint** | `#FFF7ED` | Latar belakang badge & highlight kartu praktikan |
| **Academic Teal** | `#0D9488` | Aksen portal asisten laboratorium, badge pengampu, link asisten |
| **Teal Tint** | `#F0FDFA` | Latar kartu asisten & border aksen sejuk |
| **Slate Background** | `#F8FAFC` | Latar kanvas aplikasi |
| **Text Primary** | `#0F172A` | Teks judul kontras tinggi (WCAG AAA) |
| **Text Secondary** | `#334155` | Teks informasi utama |
| **Text Muted** | `#64748B` | Label waktu, subtitle, placeholder |
| **Border Neutral** | `#E2E8F0` | Pembatas kartu, form input, dan garis divider |

---

## 4. Struktur Proyek

```
PPK-Post-UTS/
├── DESIGN.md                     # Spesifikasi lengkap sistem desain LabPortal
├── SRS.md                        # Software Requirements Specification (Sprint 1)
├── README.md                     # Dokumentasi proyek & panduan instalasi
├── app.json                      # Konfigurasi Expo
├── package.json                  # Dependensi proyek (clean Expo Go)
├── tsconfig.json                 # Konfigurasi TypeScript
├── src/
│   ├── app/                      # Expo Router (File-based routing)
│   │   ├── _layout.tsx           # Root layout dengan safe-area & context provider
│   │   ├── index.tsx             # Halaman portal landing & pemilihan identitas
│   │   ├── asisten/
│   │   │   ├── _layout.tsx       # Tab navigator asisten dengan RoleHeader
│   │   │   ├── jadwal.tsx        # Pengelolaan sesi, tambah sesi & metrik asisten
│   │   │   ├── rekap.tsx         # Rekapitulasi kehadiran kelas per sesi
│   │   │   └── detail-sesi/
│   │   │       └── [id].tsx      # Detail kontrol sesi, edit, buka kembali & roster mahasiswa
│   │   └── praktikan/
│   │       ├── _layout.tsx       # Tab navigator praktikan dengan RoleHeader
│   │       ├── jadwal.tsx        # Jadwal praktikum & status sesi
│   │       ├── riwayat.tsx       # Riwayat kehadiran & statistik pribadi
│   │       └── detail-sesi/
│   │           └── [id].tsx      # Form presensi mandiri praktikan
│   ├── components/               # Komponen UI modular
│   │   ├── confirmation-modal.tsx# Modal konfirmasi aksi & feedback
│   │   ├── empty-state.tsx       # State kosong terstruktur
│   │   ├── role-header.tsx       # Universal header dengan navigasi & popup ganti akun
│   │   ├── sesi-card.tsx         # Kartu sesi seragam untuk asisten & praktikan
│   │   └── status-badge.tsx      # Badge status sesi & kehadiran
│   ├── context/
│   │   └── praktikum-context.tsx # State management aplikasi (sesi, CRUD, presensi, pengguna)
│   ├── data/
│   │   └── dummy.ts              # Data dummy mahasiswa, asisten, sesi, dan presensi (NIM UNDIP)
│   └── types/
│       └── praktikum.ts          # Definisi antarmuka TypeScript
```

---

## 5. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau lebih baru.
- **npm** atau **bun**.
- Aplikasi **Expo Go** pada ponsel Android/iOS (opsional jika menguji di Web).

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Aplikasi
```bash
npx expo start
```

Setelah server Expo aktif:
- **Web Browser**: Tekan tombol `w` di terminal atau buka `http://localhost:8081` di browser.
- **Android (Expo Go)**: Buka aplikasi Expo Go di HP Android, lalu pindai QR code yang tampil di terminal.
- **iOS (Expo Go)**: Buka aplikasi Kamera di iPhone, pindai QR code, dan buka di Expo Go.

---

## 6. Pengujian & Verifikasi Kualitas

Aplikasi ini bebas dari kesalahan kompilasi dan mengikuti standar kualitas kode yang ketat:

```bash
# Pemeriksaan tipe data TypeScript
npx tsc --noEmit

# Linting kode
npx expo lint

# Diagnostik kompatibilitas dependensi Expo
npx expo-doctor
```

---

## 7. Informasi Pengguna Dummy untuk Pengujian

Aplikasi menyediakan data dummy siap pakai untuk simulasi alur:

### Akun Asisten:
- **Kak Dzaki M.** (Pengampu Laboratorium Komputasi)
- **Kak Akmal R.** (Pengampu Laboratorium Komputasi)

### Akun Praktikan (Informatika UNDIP):
- **Ahmad Dahlan** (NIM: `24060122130001` — Kelas A)
- **Budi Santoso** (NIM: `24060122130002` — Kelas A)
- **Citra Dewi** (NIM: `24060122130003` — Kelas A)
- **Dimas Prasetyo** (NIM: `24060122140004` — Kelas B)
- *Dan 6 mahasiswa lainnya di Kelas A & Kelas B.*

---

## 8. Panduan Skenario Evaluasi Alur Praktikum (Sprint 1)

Untuk mendemonstrasikan hasil akhir: **Asisten membuka sesi → Praktikan melakukan presensi → Asisten melihat rekap → Asisten menutup sesi (dan membuka kembali jika diperlukan)**, ikuti langkah simulasi berikut:

1. **Langkah 1 (Asisten Buka Sesi / Tambah Sesi)**:
   - Di halaman portal utama, pilih **Masuk sebagai Asisten Lab** lalu pilih akun **Kak Dzaki M.**.
   - Asisten dapat membuat sesi baru dengan menekan **+ Tambah Sesi**, atau memilih sesi yang ada berstatus `Belum Dibuka` (misalnya: *Praktikum PPK - Modul 3*).
   - Tekan tombol **Buka Sesi Praktikum** dan konfirmasi pada dialog modal.
   - Status sesi langsung berubah menjadi `Dibuka` (hijau).

2. **Langkah 2 (Praktikan Presensi)**:
   - Tekan tombol **`Ganti Akun`** di header kanan atas lalu pilih **Ganti Peran ke Portal Utama**.
   - Pilih **Masuk sebagai Praktikan** lalu pilih **Ahmad Dahlan** (Kelas A).
   - Buka sesi *Praktikum PPK - Modul 3* yang baru saja dibuka oleh asisten.
   - Isi form catatan kehadiran (opsional), centang persetujuan integritas, lalu tekan **Kirim Presensi Kehadiran**.
   - Konfirmasi modal; muncul notifikasi berhasil beserta catatan waktu kehadiran WIB.
   - Tombol otomatis terkunci menjadi `Sudah Presensi` untuk mencegah presensi ganda (anti-duplikasi).

3. **Langkah 3 (Asisten Melihat Rekap & Roster)**:
   - Tekan tombol **`Ganti Akun`** di header dan kembali ke akun **Kak Dzaki M.**.
   - Buka sesi *Praktikum PPK - Modul 3* atau buka tab **Rekap Presensi**.
   - Terlihat nama **Ahmad Dahlan** kini tercatat **Hadir** lengkap dengan timestamp kehadirannya, serta persentase kehadiran kelas terbarui secara real-time.

4. **Langkah 4 (Asisten Menutup Sesi)**:
   - Di halaman detail sesi *Praktikum PPK - Modul 3*, tekan tombol **Tutup Sesi Praktikum**.
   - Konfirmasi dialog modal. Status sesi kini berubah menjadi `Ditutup` (merah).
   - Saat mahasiswa membuka sesi tersebut kembali, formulir presensi telah terkunci dengan keterangan *"Sesi Telah Ditutup"*.

5. **Langkah 5 (Buka Kembali & Edit Sesi)**:
   - Sebagai asisten, pada sesi yang telah ditutup, tekan tombol **Buka Kembali Sesi Praktikum** dan konfirmasi dialog modal. Status sesi kembali menjadi `Dibuka`.
   - Asisten juga dapat menekan **Edit Informasi Sesi** untuk memperbarui materi modul atau ruang laboratorium.


