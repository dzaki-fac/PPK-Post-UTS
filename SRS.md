# SRS — Software Requirements Specification (Sprint 1)

**Aplikasi:** PPK LabPortal — Presensi & Manajemen Sesi Praktikum  
**Institusi:** Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)  
**Mata Praktikum:** Praktikum Pengembangan Platform Khusus (PPK)  
**Platform Target:** Android (Expo Go & Production Build), iOS, dan Web Browser modern.  
**Teknologi Utama:** React Native, Expo SDK 57, Expo Router, React Context State Management.

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini menetapkan spesifikasi kebutuhan perangkat lunak (*Software Requirements Specification*) untuk **PPK LabPortal** pada **Sprint 1: Antarmuka dan Alur Praktikum**. Dokumen ini menjadi acuan mutlak bagi seluruh tim pengembang agar pengembangan fitur, antarmuka, dan navigasi tetap kohesif, tepat sasaran, dan konsisten tanpa konflik.

### 1.2 Ruang Lingkup
Aplikasi mendemonstrasikan kegiatan operasional laboratorium praktikum secara terpadu melalui dua sudut pandang peran:
1. **Praktikan (Mahasiswa Informatika):** Melihat jadwal praktikum, memeriksa rincian sesi dan materi, melakukan presensi kehadiran mandiri saat sesi dibuka dengan verifikasi integritas, serta memantau catatan riwayat kehadiran pribadi.
2. **Asisten Laboratorium:** Mengelola sesi praktikum (menambah sesi baru, membuka sesi saat praktikum dimulai, menyunting materi/ruang, memantau kehadiran mahasiswa secara real-time, menutup sesi, membuka kembali sesi untuk presensi susulan, dan menghapus sesi jika dibatalkan).

Data aplikasi pada Sprint 1 bersifat *in-memory runtime state* menggunakan data dummy lokal yang tersinkronisasi antar peran secara instan melalui React Context.

---

## 2. Model Data & Kontrak Entitas

```typescript
// Entitas Mahasiswa / Praktikan
export type Praktikan = {
  id: string;
  nama: string;
  nim: string;       // Format resmi Informatika UNDIP (14 digit: '240601...')
  kelas: string;     // 'A' | 'B'
};

// Entitas Asisten Laboratorium
export type Asisten = {
  id: string;
  nama: string;      // mis. 'Kak Dzaki M.'
};

// Status Siklus Hidup Sesi
export type SesiStatus = 'belum-dibuka' | 'dibuka' | 'ditutup';

// Entitas Sesi Praktikum
export type Sesi = {
  id: string;
  praktikum: string; // mis. 'Praktikum PPK'
  kelas: string;     // 'Kelas A' | 'Kelas B'
  tanggal: string;   // mis. '22 Okt 2026'
  waktuMulai: string;// mis. '07.30'
  waktuSelesai: string; // mis. '09.30'
  status: SesiStatus;
  ruang?: string;    // mis. 'Lab Komputasi 1'
  materi?: string;   // mis. 'Modul 2: Komponen Interaktif & State Management'
  kodeSesi?: string; // 4 digit kode numerik verifikasi presensi (mis. '2401')
};

// Entitas Pencatatan Kehadiran
export type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuKehadiran: string; // Format waktu lokal WIB: 'DD MMM YYYY, HH:mm WIB'
};

// Entitas Riwayat Gabungan (untuk Tampilan Praktikan)
export type RiwayatItem = Presensi & {
  sesi?: Sesi;
};
```

---

## 3. Kebutuhan Fungsional (Functional Requirements)

### FR-01 — Pemilihan Peran & Identitas Mandiri
- **FR-01.1:** Pengguna memulai dari halaman portal utama (`/`) untuk memilih peran (*Mahasiswa/Praktikan* atau *Asisten Laboratorium*).
- **FR-01.2:** Setelah peran dipilih, pengguna memilih akun identitas dari daftar akun dummy terstruktur (menampilkan nama, NIM/pengampu, dan kelas).
- **FR-01.3:** Header universal (`RoleHeader`) menampilkan identitas pengguna aktif dan menyediakan tombol **`Ganti Akun`** yang memunculkan modal popup terpusat untuk beralih akun atau keluar ke portal utama tanpa perlu reload halaman.

### FR-02 — Jadwal Praktikum & Visualisasi Status
- **FR-02.1:** Pengguna dapat melihat daftar seluruh jadwal sesi praktikum yang tersedia.
- **FR-02.2:** Jadwal dilengkapi filter chips interaktif berdasarkan status (`Semua`, `Dibuka`, `Belum Dibuka`, `Ditutup`) dan filter cerdas praktikan **`Kelas Saya (Kelas A/B)`** untuk memfilter sesi sesuai kelas terdaftar.
- **FR-02.3:** Setiap kartu sesi menampilkan nama praktikum, kelas, materi modul, ruang lab, jam pelaksanaan, pill kode sesi (khusus asisten saat sesi dibuka), dan badge status visual (`StatusBadge`).

### FR-03 — Kartu Ringkasan Metrik (Stats Overview)
- **FR-03.1:** Layar jadwal asisten menampilkan 4 kartu metrik: Total Sesi, Sesi Dibuka, Total Presensi Masuk, dan Sesi Ditutup.
- **FR-03.2:** Layar jadwal praktikan menampilkan 4 kartu metrik: Total Sesi, Sesi Dibuka, Sudah Hadir, dan Belum Buka.

### FR-04 — Tambah Sesi Praktikum Baru (Asisten)
- **FR-04.1:** Asisten dapat menjadwalkan sesi baru dengan menekan tombol **`+ Tambah Sesi`** pada layar jadwal.
- **FR-04.2:** Form modal terpusat menerima masukan: Mata Praktikum, Materi Modul (wajib), Pilihan Kelas (`Kelas A` / `Kelas B`), Tanggal, Jam Mulai & Selesai, dan Ruang Lab. Sistem meng-generate kode sesi 4 digit otomatis.
- **FR-04.3:** Setelah sesi disimpan, sistem secara otomatis mengalihkan (*redirect*) asisten ke halaman detail sesi baru tersebut.

### FR-05 — Kontrol Pembukaan Sesi & Kode Akses (Asisten)
- **FR-05.1:** Asisten dapat membuka sesi yang berstatus `belum-dibuka`.
- **FR-05.2:** Aksi pembukaan sesi diamankan dengan dialog modal konfirmasi (`ConfirmationModal`).
- **FR-05.3:** Perubahan status menjadi `dibuka` langsung tersinkronisasi ke seluruh aplikasi secara real-time.
- **FR-05.4:** Saat sesi berstatus `dibuka`, antarmuka asisten menampilkan kartu **Kode Sesi Presensi Aktif (4 Digit)** untuk dibagikan secara lisan/visual kepada praktikan di laboratorium.

### FR-06 — Kontrol Penutupan Sesi (Asisten)
- **FR-06.1:** Asisten dapat menutup sesi praktikum yang sedang berstatus `dibuka`.
- **FR-06.2:** Aksi penutupan sesi diamankan dengan dialog modal konfirmasi bahaya (*danger variant*).
- **FR-06.3:** Status sesi berubah menjadi `ditutup`, dan formulir presensi mahasiswa pada sesi tersebut langsung terkunci.

### FR-07 — Buka Kembali Sesi Praktikum (Asisten)
- **FR-07.1:** Pada sesi yang telah `ditutup`, asisten memiliki opsi untuk menekan **`Buka Kembali Sesi Praktikum`**.
- **FR-07.2:** Setelah dikonfirmasi melalui modal, status sesi kembali menjadi `dibuka` sehingga mahasiswa dapat melakukan presensi susulan.

### FR-08 — Penyuntingan & Penghapusan Sesi (Asisten)
- **FR-08.1:** Asisten dapat menekan **`Edit Informasi Sesi`** untuk mengubah materi praktikum, ruang lab, jam, dan tanggal pelaksanaan melalui form modal popup.
- **FR-08.2:** Asisten dapat menekan **`Hapus Sesi`** untuk membatalkan dan menghapus sesi beserta riwayat presensinya dengan konfirmasi aman. Setelah dihapus, asisten langsung dialihkan kembali ke daftar jadwal.

### FR-09 — Pencatatan Presensi Mandiri (Praktikan)
- **FR-09.1:** Praktikan hanya dapat melakukan presensi pada sesi yang sedang berstatus `dibuka`.
- **FR-09.2:** Praktikan wajib memasukkan **4 Digit Kode Sesi Presensi** yang dibagikan oleh asisten lab yang memimpin sesi.
- **FR-09.3:** Formulir presensi dilengkapi kolom catatan kehadiran opsional dan checkbox persetujuan integritas kehadiran mandiri.
- **FR-09.4:** Penekanan tombol kirim presensi menampilkan modal ringkasan identitas, jadwal, dan kode sesi untuk konfirmasi akhir.
- **FR-09.5:** Waktu kehadiran (timestamp WIB) dicatat secara otomatis oleh sistem saat presensi diverifikasi dan berhasil dikirimkan.
- **FR-09.6:** Modal umpan balik berhasil memberikan opsi tombol aksi utama **`Lihat Riwayat Presensi`** yang langsung mengalihkan mahasiswa ke tab riwayat kehadiran.

### FR-10 — Validasi Anti-Duplikasi & Kesesuaian Kelas
- **FR-10.1:** Praktikan yang sama **dilarang keras melakukan presensi dua kali** pada sesi yang sama. Antarmuka otomatis menampilkan banner hijau *"Anda Sudah Presensi"* beserta waktu kehadiran, dan tombol presensi terkunci permanen.
- **FR-10.2:** Sistem **memvalidasi kesesuaian kelas** mahasiswa dengan kelas sesi praktikum (misal mahasiswa Kelas B dilarang presensi di sesi Kelas A). Antarmuka menampilkan banner peringatan merah dan menolak presensi jika kelas tidak cocok.
- **FR-10.3:** Sistem **memvalidasi kebenaran kode 4 digit**. Jika kode salah atau tidak lengkap 4 digit, presensi ditolak dengan pesan dialog kesalahan yang informatif.

### FR-11 — Roster Kehadiran Lengkap Kelas (Asisten)
- **FR-11.1:** Halaman detail sesi dan rekap asisten menampilkan **seluruh mahasiswa terdaftar pada kelas tersebut**.
- **FR-11.2:** Menampilkan pemisahan status jelas: mahasiswa **Hadir** (disertai jam presensi spesifik) dan mahasiswa **Belum Hadir**.
- **FR-11.3:** Dilengkapi filter tab roster: `Semua`, `Hadir`, dan `Belum Hadir`.

### FR-12 — Riwayat Kehadiran Pribadi (Praktikan)
- **FR-12.1:** Praktikan dapat melihat rekap seluruh sesi praktikum yang telah diikutinya pada tab Riwayat.
- **FR-12.2:** Menampilkan kartu riwayat per-sesi lengkap dengan waktu presensi resmi dan banner persentase keaktifan pribadi.

---

## 4. Kebutuhan Navigasi & Pola Pengalihan (Routing & Redirection)

Aplikasi menerapkan pola navigasi ketat untuk mencegah kebuntuan antarmuka (*dead-ends*):

| Jenis Navigasi | Skenario | Pola Pengalihan (Redirect) |
|---|---|---|
| **Route Guard** | Pengguna mengakses route `/asisten/*` tanpa role asisten | Otomatis dialihkan ke `/` menggunakan `<Redirect href="/" />` |
| **Route Guard** | Pengguna mengakses route `/praktikan/*` tanpa role praktikan | Otomatis dialihkan ke `/` menggunakan `<Redirect href="/" />` |
| **Next Action** | Asisten selesai membuat sesi baru di modal | Otomatis dialihkan ke `/asisten/detail-sesi/[id]` sesi baru |
| **Next Action** | Praktikan selesai melakukan presensi di modal sukses | Otomatis dialihkan ke `/praktikan/riwayat` |
| **Post-Action** | Asisten menghapus sesi | Otomatis dialihkan kembali ke `/asisten/jadwal` |
| **Safe Back** | Pengguna menekan breadcrumb `← Kembali ke Jadwal` | Memeriksa `router.canGoBack()`; jika kosong, fallback ke `/asisten/jadwal` atau `/praktikan/jadwal` |
| **Switch Role** | Pengguna menekan *Ganti Peran* pada popup modal akun | Reset state dan dialihkan ke portal utama `/` |

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

- **NFR-01 (Multi-Platform Responsiveness):** Menggunakan tata letak Flexbox murni tanpa dimensi kaku. Pada layar lebar web browser dibatasi kontainer `maxWidth: 960px` terpusat dan navigasi tab mengambang (*floating pill*). Pada layar mobile Android/iOS menerapkan layout elastis full-width dengan safe-area insets.
- **NFR-02 (Aksesibilitas & Standar Sentuh):** Seluruh elemen interaktif memiliki area sentuh $\ge 44$px (`minTouchTarget`) dan kontras warna memenuhi standar WCAG AA (rasio teks utama $\ge 4.5:1$).
- **NFR-03 (State Immediacy):** Setiap tindakan pengguna (buka sesi, presensi, edit, hapus) langsung memberikan umpan balik visual dan memperbarui status tampilan secara reaktif tanpa perlu memuat ulang (*refresh*) halaman.
- **NFR-04 (Anti-Slop Standard):** Nol penggunaan emoji artifisial pada ikon UI. Menggunakan tipografi terstruktur, badge teks bersih, dan simbol panah geometris terstandarisasi.
- **NFR-05 (Integritas Kode):** Validasi penuh TypeScript strict (`npx tsc --noEmit` 0 error) dan linter Expo (`npx expo lint` 0 warning/error).
- **NFR-06 (Kompatibilitas Native):** Kompatibel 100% dengan aplikasi **Expo Go di Android & iOS**, serta seluruh browser web modern tanpa modul native kustom yang memerlukan rebuild lokal.

---

## 6. Skenario Pengujian & Evaluasi Alur Praktikum

Untuk mendemonstrasikan pemenuhan seluruh kriteria Sprint 1, jalankan skenario berikut:

1. **Langkah 1: Masuk Sebagai Asisten & Buat Sesi Baru**
   - Di portal utama (`/`), pilih **Masuk sebagai Asisten Lab** → pilih akun **Kak Dzaki M.**.
   - Pada halaman jadwal, tekan tombol **`+ Tambah Sesi`**.
   - Masukkan materi modul (misal: *Modul 4: Integrasi Form & Modal*), pilih Kelas A, lalu tekan **Simpan & Buat Sesi**.
   - Sistem langsung melakukan redirect ke halaman detail sesi baru tersebut.
2. **Langkah 2: Asisten Membuka Sesi**
   - Pada halaman detail sesi, tekan tombol **Buka Sesi Praktikum** dan konfirmasi pada modal dialog.
   - Status sesi langsung berubah menjadi `Dibuka` (hijau).
3. **Langkah 3: Beralih ke Akun Praktikan & Melakukan Presensi**
   - Tekan tombol **`Ganti Akun`** di navbar atas → pilih **Ganti Peran ke Portal Utama**.
   - Pilih **Masuk sebagai Praktikan** → pilih **Ahmad Dahlan** (Kelas A).
   - Pada jadwal praktikan, buka sesi *Modul 4* yang sedang dibuka.
   - Masukkan catatan kehadiran, centang checkbox integritas, lalu tekan **Kirim Presensi Kehadiran**.
   - Konfirmasi modal ringkasan. Pada modal sukses, tekan **Lihat Riwayat Presensi**.
   - Sistem langsung melakukan redirect ke tab Riwayat dan menampilkan catatan kehadiran dengan timestamp resmi WIB.
4. **Langkah 4: Asisten Melihat Rekap & Roster Kelas**
   - Tekan **`Ganti Akun`** di header dan kembali ke akun **Kak Dzaki M.**.
   - Buka tab **Rekap Presensi** atau detail sesi *Modul 4*.
   - Terlihat nama **Ahmad Dahlan** berstatus **Hadir** lengkap dengan jam kehadirannya, sedangkan mahasiswa lain berstatus **Belum Hadir**.
5. **Langkah 5: Asisten Menutup & Membuka Kembali Sesi**
   - Di detail sesi, tekan **Tutup Sesi Praktikum** dan konfirmasi modal. Status berubah menjadi `Ditutup` (merah).
   - Tekan tombol **Buka Kembali Sesi Praktikum** dan konfirmasi modal. Status kembali menjadi `Dibuka`.
6. **Langkah 6: Validasi Anti-Duplikasi Presensi**
   - Kembali ke akun **Ahmad Dahlan** dan buka sesi tersebut.
   - Form terkunci dan menampilkan status *"Anda Sudah Presensi"* sehingga tidak dapat melakukan presensi ganda.
