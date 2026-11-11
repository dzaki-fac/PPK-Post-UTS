# SRS — Aplikasi Pencatatan Kehadiran Praktikum

**Sprint 1: Antarmuka dan Alur Praktikum**  
**Teknologi:** React Native (Expo + Expo Router), data dummy lokal, React Context state management.  
**Platform Target:** Android (Expo Go & standalone), iOS, dan Web Browser.

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (Software Requirements Specification) untuk aplikasi pencatatan kehadiran laboratorium praktikum pada Sprint 1. Aplikasi mendemonstrasikan kegiatan operasional laboratorium terpadu dari dua sudut pandang pengguna: **Praktikan** dan **Asisten**.

### 1.2 Ruang Lingkup
- Membangun aplikasi React Native lintas platform yang mendemonstrasikan alur lengkap praktikum:
  1. Pemilihan peran & identitas pengguna mandiri.
  2. Asisten membuka sesi praktikum terjadwal.
  3. Praktikan melakukan presensi kehadiran saat sesi dibuka.
  4. Asisten memantau daftar kehadiran mahasiswa dan rekapitulasi kelas secara real-time.
  5. Asisten menutup sesi praktikum setelah kegiatan selesai.
- Menggunakan **data dummy lokal terstruktur** (`src/data/`). Perubahan data dikelola menggunakan React Context selama runtime aplikasi berjalan.
- Fokus utama: **antarmuka responsif, presisi perataan layout di Android/iOS/Web, interaksi jelas, serta bersih tanpa elemen artifisial / emoji slop**.

### 1.3 Definisi Istilah
| Istilah | Definisi |
|---|---|
| **Praktikan** | Mahasiswa peserta praktikum yang melihat jadwal dan melakukan presensi kehadiran. |
| **Asisten** | Pengelola laboratorium yang mengontrol sesi (buka/tutup sesi) dan memantau rekap kehadiran kelas. |
| **Sesi** | Pertemuan praktikum terjadwal dengan status: `Belum Dibuka`, `Dibuka`, atau `Ditutup`. |
| **Presensi** | Pencatatan bukti kehadiran praktikan saat sesi berstatus `Dibuka` dengan verifikasi integritas. |

---

## 2. Deskripsi Umum

### 2.1 Karakteristik Pengguna
| Peran | Kebutuhan Utama |
|---|---|
| **Praktikan** | Melihat jadwal praktikum, memeriksa detail sesi & materi, melakukan presensi saat sesi dibuka, melihat catatan riwayat kehadiran pribadi beserta statistik kehadiran. |
| **Asisten** | Melihat daftar jadwal sesi, membuka sesi saat praktikum dimulai, memantau kehadiran mahasiswa (hadir vs belum hadir), melihat statistik rekap kelas, dan menutup sesi praktikum. |

### 2.2 Pemilihan Peran dan Identitas
- Pengguna memilih peran di halaman portal utama (`/`): *Praktikan* atau *Asisten*.
- Pengguna kemudian memilih identitas dari daftar akun dummy (Nama, NIM/Peran, Kelas).
- Pengguna dapat beralih akun praktikan atau berganti peran ke beranda kapan saja melalui modal popup terpusat di header.

### 2.3 Batasan Teknis (Constraints)
- Semua data dummy disimpan terisolasi di `src/data/`.
- Tata letak menggunakan **Flexbox** murni dengan batasan lebar responsif (`maxWidth: 960, paddingHorizontal: 20`) yang sejajar presisi antara navigasi atas dan konten utama.
- Navigasi menggunakan **Expo Router** berbasis file-system.
- Kompatibel penuh dengan **Expo Go di Android & iOS**, serta browser Web modern tanpa dependensi native yang tidak didukung.
- Bebas dari penggunaan emoji slop pada ikon antarmuka; digantikan dengan tipografi terstruktur, badge teks bersih, dan indikator geometris.

---

## 3. Kebutuhan Fungsional

### FR-1 — Pemilihan Peran dan Identitas
- **FR-1.1**: Aplikasi menyediakan layar portal awal untuk memilih peran (*Praktikan* atau *Asisten*).
- **FR-1.2**: Setelah peran dipilih, pengguna memilih akun identitas dari daftar mahasiswa/asisten dummy.
- **FR-1.3**: Peran aktif dan nama pengguna ditampilkan di header antarmuka, dengan opsi untuk mengganti akun via popup modal terpusat atau kembali ke portal utama.

### FR-2 — Jadwal dan Detail Sesi
- **FR-2.1**: Pengguna dapat melihat daftar jadwal praktikum lengkap dengan filter status (*Semua*, *Dibuka*, *Belum Dibuka*, *Ditutup*).
- **FR-2.2**: Setiap sesi menampilkan informasi rinci: Nama Praktikum, Kelas, Tanggal, Jam Pelaksanaan, Ruang Laboratorium, Materi Modul, dan Status Sesi.
- **FR-2.3**: Status sesi ditampilkan menggunakan badge visual kontras tinggi (`StatusBadge`).

### FR-3 — Pengelolaan Sesi (Asisten)
- **FR-3.1**: Asisten dapat **membuka sesi** yang berstatus `Belum Dibuka` melalui dialog popup konfirmasi (`ConfirmationModal`).
- **FR-3.2**: Asisten dapat **menutup sesi** yang berstatus `Dibuka` melalui dialog popup konfirmasi (`ConfirmationModal`).
- **FR-3.3**: Perubahan status sesi langsung tercermin di seluruh layar (jadwal asisten, jadwal praktikan, dan detail sesi) secara reaktif.
- **FR-3.4**: Sesi yang telah ditutup tidak dapat dibuka kembali, dan tombol presensi praktikan otomatis terkunci.

### FR-4 — Pencatatan Presensi (Praktikan)
- **FR-4.1**: Praktikan hanya dapat melakukan presensi pada sesi yang berstatus `Dibuka`.
- **FR-4.2**: Aplikasi mencatat **waktu kehadiran** (jam, menit, detik WIB) saat presensi dikirimkan.
- **FR-4.3**: Aplikasi memberikan **umpan balik** berupa modal konfirmasi berhasil beserta informasi waktu tercatat.
- **FR-4.4 (Anti-Presensi Ganda)**: Praktikan yang sama **tidak dapat melakukan presensi lebih dari satu kali** pada sesi yang sama. Tombol otomatis berubah menjadi status *"Presensi Telah Lengkap"*.
- **FR-4.5 (Formulir Presensi)**: Presensi dilengkapi form masukan catatan kehadiran opsional dan checkbox pernyataan integritas kehadiran sebelum submit.

### FR-5 — Rekapitulasi Kehadiran
- **FR-5.1**: Asisten dapat melihat rekapitulasi kehadiran per sesi praktikum.
- **FR-5.2**: Praktikan dapat melihat riwayat presensi miliknya sendiri lengkap dengan tanggal, jam hadir, dan banner statistik kehadiran pribadi.
- **FR-5.3 (Roster Lengkap Kelas)**: Pada rekap sesi asisten, sistem menampilkan **seluruh mahasiswa pada kelas tersebut**, membedakan status **Hadir** (beserta jam kehadiran) dan **Belum Hadir**, dilengkapi filter status kehadiran (*Semua*, *Hadir*, *Belum Hadir*).

### FR-6 — Interaksi & Komponen Bersama
- **FR-6.1**: Penggunaan form untuk input catatan dan pilihan filter chip interaktif.
- **FR-6.2**: Penggunaan **`ConfirmationModal`** berupa centered popup dialog untuk konfirmasi aksi sensitif dan dialog informasi umpan balik.
- **FR-6.3**: Penggunaan **`EmptyState`** terstruktur saat data kosong atau filter tidak menemukan hasil.

---

## 4. Kebutuhan Non-Fungsional

| ID | Kebutuhan |
|---|---|
| **NFR-1** | **Responsivitas Web & Mobile**: Menggunakan Flexbox dengan `maxWidth: 960` terpusat dan `paddingHorizontal: 20` agar tampilan di browser web lebar dan layar ponsel memiliki garis batas kiri yang sejajar secara presisi. |
| **NFR-2** | **Safe Area Insets**: Semua header dan floating bar memperhitungkan insets perangkat mobile agar tidak terpotong punch-hole atau notch. |
| **NFR-3** | **Keterbacaan & Kontras**: Memenuhi standar kontras WCAG AA (teks `#0F172A` di atas `#FFFFFF`/`#F8FAFC`). |
| **NFR-4** | **Konsistensi Desain**: Seluruh kartu sesi, badge status, modal, dan tombol menggunakan token desain modern yang bersih dari emoji dan selaras antar halaman. |
| **NFR-5** | **Zero Warning / Zero Error**: Lolos uji linting (`npx expo lint`) dan typecheck TypeScript (`npx tsc --noEmit`). |
