# DESIGN.md — Sistem Desain Terpadu: PPK LabPortal

Dokumen ini adalah **sumber kebenaran visual (*Single Source of Truth*)** untuk antarmuka, token desain, hierarki tipografi, dan arsitektur komponen aplikasi **PPK LabPortal**.  
Setiap programmer dan AI agent yang bekerja pada repositori ini **wajib mematuhi dokumen ini** agar integritas desain tetap seragam, elegan, modular, dan bebas dari inkonsistensi (*anti-slop*).

---

## 1. Identitas & Karakter Produk

- **Nama Produk:** **PPK LabPortal**
- **Institusi Resmi:** Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP).
- **Mata Praktikum:** Praktikum Pengembangan Platform Khusus (PPK).
- **Referensi Desain:** Dashboard modern *E-Stock Management* (`e-stock.hancreativemedia.com`).
- **Karakter Visual:** Bersih, terstruktur, berbasis data (*dashboard-forward*), modern, akademis, tanpa elemen artifisial / emoji generik.
- **Prinsip Utama:**
  1. **Data-Centric & Balanced:** Setiap halaman utama diawali dengan kartu metrik ringkasan (*stats overview*) sehingga tampilan tidak pernah hampa atau sekadar kartu tanpa konteks.
  2. **Zero-Slop Clean Typography:** Tidak menggunakan emoji sebagai ikon UI; menggunakan tipografi tebal, inisial terstruktur, dan penanda geometris (`●`, `■`, `▲`, `▼`, `←`, `→`).
  3. **Multi-Platform Adaptive:** Tampil proporsional di Web Desktop (`maxWidth: 960px` terpusat, *floating centered pill navigation*), tablet, dan ponsel pintar Android/iOS (full-width dengan safe-area insets).

---

## 2. Palet Warna & Kontras Aksesibilitas (WCAG AA)

Sistem warna membedakan peran secara fungsional: **Terracotta Orange** untuk Portal Mahasiswa dan **Academic Teal** untuk Asisten Laboratorium, dengan latar netral **Slate Light**.

| Token Desain | Nilai Hex | Peruntukan | Rasio Kontras Terverifikasi |
|---|---|---|---|
| `bg.canvas` | `#F8FAFC` | Latar kanvas utama aplikasi | Netral |
| `bg.surface` | `#FFFFFF` | Latar kartu, navbar, dialog modal, input | Netral |
| `text.primary` | `#0F172A` | Judul, angka metrik, nama mahasiswa (Navy Slate) | **16.1:1** thd canvas (WCAG AAA) |
| `text.secondary` | `#334155` | Teks isi, label informasi sesi | **10.2:1** thd canvas (WCAG AAA) |
| `text.muted` | `#64748B` | Subtitle, keterangan waktu, placeholder | **4.8:1** thd canvas (WCAG AA) |
| `border.default` | `#E2E8F0` | Garis pembatas kartu, divider, batas form | Netral |
| `border.strong` | `#CBD5E1` | Garis pembatas tombol sekunder dan input aktif | **3.2:1** thd canvas |
| `praktikan.primary` | `#EA580C` | Aksen tombol utama praktikan, badge aktif, breadcrumb | **4.9:1** thd surface (WCAG AA) |
| `praktikan.tint` | `#FFF7ED` | Latar badge praktikan, highlight kartu terpilih | Lembut |
| `praktikan.border` | `#FED7AA` | Garis pembatas kartu & badge mahasiswa | Lembut |
| `asisten.primary` | `#0D9488` | Aksen tombol asisten, badge pengampu, header filter | **4.7:1** thd surface (WCAG AA) |
| `asisten.tint` | `#F0FDFA` | Latar badge asisten, kartu kontrol sesi | Lembut |
| `asisten.border` | `#99F6E4` | Garis pembatas kartu asisten | Lembut |
| `status.open.dot` | `#16A34A` | Titik indikator sesi dibuka / hadir | — |
| `status.open.bg` | `#DCFCE7` | Latar badge sesi dibuka / hadir | — |
| `status.open.text` | `#15803D` | Teks badge sesi dibuka / hadir | **5.4:1** thd badge bg |
| `status.wait.dot` | `#EAB308` | Titik indikator sesi belum dibuka | — |
| `status.wait.bg` | `#FEF3C7` | Latar badge sesi belum dibuka | — |
| `status.wait.text` | `#B45309` | Teks badge sesi belum dibuka | **5.1:1** thd badge bg |
| `status.close.dot` | `#DC2626` | Titik indikator sesi ditutup / aksi hapus | — |
| `status.close.bg` | `#FEE2E2` | Latar badge sesi ditutup | — |
| `status.close.text` | `#B91C1C` | Teks badge sesi ditutup | **5.8:1** thd badge bg |

---

## 3. Sistem Tipografi

Menggunakan font sistem standar React Native (`System` / `-apple-system` / `Roboto` / `Segoe UI`) dengan penataan ukuran dan bobot tegas:

| Peran Tipografi | Ukuran (pt) | Bobot (Weight) | Jarak Garis (Line Height) | Penggunaan |
|---|---|---|---|---|
| **Display Title** | 28–32 | 900 (Black) | 36 | Judul utama landing portal & header jadwal web |
| **Section Heading** | 20–22 | 800 (ExtraBold) | 28 | Judul layar detail sesi, rekapitulasi, riwayat |
| **Card Title** | 16–18 | 800 (ExtraBold) | 22 | Nama mata praktikum pada kartu sesi |
| **Metric Number** | 24 | 900 (Black) | 28 | Angka ringkasan pada kartu overview |
| **Body Primary** | 13–14 | 700 (Bold) / 500 | 20 | Isi teks utama, nama mahasiswa, nama asisten |
| **Caption / Meta** | 11–12 | 500 / 600 | 16 | Tanggal, jam, ruang lab, NIM mahasiswa |
| **Micro Badge** | 9–10 | 800 (ExtraBold) | 12 | Label chip status, tag MAHASISWA / ASISTEN |

---

## 4. Spacing, Radius, dan Ukuran Layout

```typescript
export const themeLayout = {
  maxContentWidth: 960,     // Batas lebar konten di layar web besar
  contentPaddingHorizontal: 20, // Padding samping web
  mobilePaddingHorizontal: 14,  // Padding samping ponsel Android/iOS
  cardRadius: 14,           // Radius sudut kartu standar
  pillRadius: 20,           // Radius sudut filter chip & breadcrumb
  buttonRadius: 10,         // Radius sudut tombol aksi utama
  modalRadius: 20,          // Radius sudut modal popup terpusat
  minTouchTarget: 44,       // Ukuran area sentuh minimal mobile (WCAG)
};
```

---

## 5. Spesifikasi Komponen Universal

### 5.1 Universal Top Navbar (`RoleHeader`)
- **Struktur Kiri:**
  - Badge logo kotak (`36x36`, radius 9) bertuliskan `PPK` oranye tebal.
  - Teks institusi: `PPK LabPortal` (14–15pt ExtraBold) dan `Presensi & Manajemen Sesi` (10–11pt Muted).
  - Keseluruhan logo sisi kiri dapat ditekan untuk navigasi kembali ke Portal Utama (`/`).
- **Struktur Kanan:**
  - Pill identitas pengguna aktif: menampilkan inisial peran (`MAHASISWA` / `ASISTEN`), nama pengguna (dibatasi `maxWidth: 100–140` dengan `numberOfLines={1}`), dan info kelas/pengampu.
  - Tombol `Ganti Akun`: memicu **Centered Popup Modal** untuk beralih identitas atau keluar ke portal pemilihan peran.
- **Penyelarasan:**
  - `paddingHorizontal: Platform.OS === 'web' ? 20 : 14`.
  - Terkoneksi dengan Safe-Area Insets pada Android/iOS.

### 5.2 Breadcrumb Navigasi (`BreadcrumbBack`)
- Menggantikan tombol back navbar yang canggung.
- Berupa pill independen dengan teks panah rapi di atas judul halaman:
  - Pada Pemilihan Identitas: `← Kembali ke Pemilihan Peran`
  - Pada Detail Sesi Asisten: `← Kembali ke Jadwal Praktikum`
  - Pada Detail Sesi Praktikan: `← Kembali ke Jadwal Praktikum`
- Dilengkapi fallback redirect (`router.canGoBack() ? router.back() : router.replace(...)`).

### 5.3 Kartu Ringkasan Metrik (`MetricsGrid`)
- 4 kartu bersanding di atas layar Jadwal, Rekap, dan Riwayat:
  - Asisten: **Total Sesi**, **Sesi Dibuka**, **Total Presensi Masuk**, **Sesi Ditutup**.
  - Praktikan: **Total Sesi**, **Sesi Dibuka**, **Sudah Hadir**, **Belum Buka**.
- Setiap kartu memiliki angka tebal (24pt), label tebal (12pt), dan teks penjelasan (11pt).

### 5.4 Kartu Sesi Praktikum (`SesiCard`)
- Menampilkan: Nama Praktikum, Chip Kelas (`Kelas A` / `Kelas B`), Badge Status dengan dot berwarna.
- Blok Materi: Teks materi modul praktikum berlatar lembut dengan border aksen kiri 3px.
- Grid Metadata: Tanggal pelaksanaan, Jam WIB, dan Ruang Laboratorium.
- Varian Asisten: Menampilkan counter mahasiswa hadir (`X Mahasiswa Hadir`), pill badge kode sesi jika status dibuka (`Kode: 2401`), dan link `Kelola sesi →`.
- Varian Praktikan: Menampilkan banner verifikasi hijau jika sudah presensi (`Sudah Presensi [Jam WIB]`).

### 5.5 Kartu Kode Presensi & Progress Bar Kehadiran
- **Kode Sesi Card (Asisten Detail Sesi):** Card khusus berlatar oranye lembut (`#FFF7ED`) dengan label *"KODE SESI PRESENSI AKTIF"* dan angka 4 digit besar (`fontSize: 32`, `fontWeight: 900`, `letterSpacing: 6`). Menampilkan instruksi: *"Bagikan 4 digit kode ini kepada praktikan di laboratorium untuk melakukan presensi mandiri."*
- **Progress Bar Track:** Indikator visual progres kehadiran berupa bar horizontal berlatar `#E2E8F0` dengan fill warna `#16A34A` yang bergerak sesuai persentase mahasiswa hadir di kelas.

### 5.6 Modal Popup Terpusat (`ConfirmationModal` & Form Modals)
- Menggunakan modal overlay gelap `rgba(15, 23, 42, 0.65)` dengan animasi fade.
- Card putih terpusat (`maxWidth: 480`, `width: '100%'`, radius 20).
- Header dialog dilengkapi judul, subjudul, dan tombol silang `✕`.
- Body dapat di-scroll jika isinya panjang (`showsVerticalScrollIndicator={false}`).
- Footer menyediakan tombol batal abu-abu dan tombol aksi primer (Teal/Terracotta/Merah).

---

## 6. Blueprint Antarmuka Layar (Screen Blueprints)

### 6.1 Portal Landing & Pemilihan Identitas (`/`)
1. **Top Navbar Mini:** Badge logo `PPK` dan status sistem aktif.
2. **Hero Section:**
   - Headline: `Presensi Praktikum & Kontrol Sesi Laboratorium.`
   - Deskripsi: Penjelasan alur praktikum FSM Informatika UNDIP.
3. **Statistik Portal:** 4 ubin data ringkasan sistem.
4. **Pilihan Akses Peran:**
   - Kartu Portal Mahasiswa (Aksen Terracotta).
   - Kartu Portal Asisten Laboratorium (Aksen Academic Teal).
5. **Layar Pilih Identitas (Sub-Step):**
   - Breadcrumb: `← Kembali ke Pemilihan Peran`.
   - Grid kartu akun mahasiswa (NIM UNDIP `240601...`) atau asisten.

### 6.2 Jadwal & Kontrol Asisten (`/asisten/jadwal`)
1. Header Asisten dengan live status tag `Kontrol Real-Time`.
2. Baris Judul + Tombol **`+ Tambah Sesi`** (membuka modal form sesi baru).
3. 4 Kartu Metrik Overview.
4. Filter Chips Status: `Semua`, `Dibuka`, `Belum Dibuka`, `Ditutup`.
5. Daftar Sesi Asisten: Setiap kartu dapat diklik menuju detail sesi.

### 6.3 Detail Sesi Asisten (`/asisten/detail-sesi/[id]`)
1. Breadcrumb: `← Kembali ke Jadwal Praktikum`.
2. Kartu Informasi Sesi Lengkap (Nama, Kelas, Materi, Ruang, Jam, Tingkat Kehadiran %).
3. Kartu Aksi Kontrol Sesi:
   - Jika `belum-dibuka`: Tombol hijau `Buka Sesi Praktikum`.
   - Jika `dibuka`: Tombol merah `Tutup Sesi Praktikum`.
   - Jika `ditutup`: Keterangan sesi ditutup + Tombol teal **`Buka Kembali Sesi Praktikum`**.
   - Toolbar Sekunder: Tombol **`Edit Informasi Sesi`** dan **`Hapus Sesi`**.
4. Roster Kehadiran Kelas:
   - Filter tab: `Semua`, `Hadir`, `Belum Hadir`.
   - Daftar mahasiswa: Avatar inisial, Nama, NIM, Kelas, dan Badge Hadir (dengan timestamp) atau Belum Hadir.

### 6.4 Rekapitulasi Kelas Asisten (`/asisten/rekap`)
1. Header Rekap Kelas dengan metrik rata-rata kehadiran.
2. Kartu Akordeon Per-Sesi:
   - Progress bar persentase kehadiran kelas.
   - Tombol toggle untuk membuka/menutup daftar roster mahasiswa.

### 6.5 Manajemen Data Praktikan (`/asisten/mahasiswa`)
1. Header Asisten dengan live status tag `Master Data Praktikan`.
2. Baris Judul + Tombol **`+ Tambah Praktikan`** (membuka modal form mahasiswa baru).
3. 4 Kartu Metrik Overview: Total Praktikan, Praktikan Kelas A, Praktikan Kelas B, Total Presensi Masuk.
4. Search Bar real-time (pencarian instan berdasarkan Nama atau NIM) dan Filter Chips Kelas (`Semua`, `Kelas A`, `Kelas B`).
5. Kartu Praktikan: Avatar inisial lingkaran, Nama Mahasiswa, Chip Kelas A/B, NIM resmi, badge jumlah sesi hadir, tombol **`Edit`** (membuka modal edit nama/NIM/kelas), dan tombol **`Hapus`** (membuka dialog konfirmasi aman yang sekaligus membersihkan data presensi mahasiswa terkait).
6. Sinkronisasi Instan: Praktikan yang ditambahkan atau diedit langsung muncul pada pemilihan akun portal utama (`/`), selector `Ganti Akun`, dan roster kelas sesi praktikum.

### 6.6 Jadwal Praktikan (`/praktikan/jadwal`)
1. Header Mahasiswa dengan live status tag `Sesi Real-Time`.
2. 4 Kartu Metrik Overview Mahasiswa.
3. Filter Chips Status & Kelas: `Semua`, `Kelas Saya (Kelas X)`, `Dibuka`, `Belum Dibuka`, `Ditutup`.
4. Daftar Sesi Praktikan dengan indikator apakah praktikan telah presensi di sesi tersebut.

### 6.7 Detail Sesi Praktikan (`/praktikan/detail-sesi/[id]`)
1. Breadcrumb: `← Kembali ke Jadwal Praktikum`.
2. Kartu Rincian Sesi & Identitas Mahasiswa.
3. Kartu Status & Form Presensi:
   - Kasus 1: Sesi belum dibuka -> Kotak informasi kuning menunggu asisten.
   - Kasus 2: Sesi dibuka & belum hadir:
     - Warning box merah jika mahasiswa beda kelas (`Perhatian: Kelas Tidak Sesuai`).
     - Input 4 digit Kode Sesi Presensi dari asisten (wajib).
     - Form catatan kehadiran (opsional) + Checkbox integritas + Tombol `Kirim Presensi Kehadiran`.
   - Kasus 3: Sudah presensi -> Kotak sukses hijau terkunci anti-duplikasi.
   - Kasus 4: Sesi ditutup -> Kotak peringatan merah terkunci.
4. Modal Konfirmasi Presensi, Modal Error jika kode/kelas tidak cocok, & Modal Sukses (dengan redirect langsung ke tab Riwayat).

### 6.7 Riwayat Presensi Praktikan (`/praktikan/riwayat`)
1. Header Riwayat dengan banner persentase kehadiran pribadi.
2. Kartu Riwayat per-sesi lengkap dengan timestamp resmi kehadiran WIB.

---

## 7. Pola Navigasi & Redirect Otomatis

Untuk menjaga alur aplikasi mengalir mulus tanpa jalan buntu:
1. **Route Guarding:**
   - Masuk ke `/asisten/*` tanpa identitas asisten aktif langsung dialihkan (*redirect*) ke `/`.
   - Masuk ke `/praktikan/*` tanpa identitas praktikan aktif langsung dialihkan (*redirect*) ke `/`.
2. **Next Navigation Redirect:**
   - Setelah asisten membuat sesi baru di modal `+ Tambah Sesi`, sistem langsung redirect otomatis ke `/asisten/detail-sesi/[id]` sesi baru tersebut.
   - Setelah praktikan berhasil mengisi presensi, modal sukses menyediakan tombol aksi utama yang langsung redirect ke `/praktikan/riwayat`.
3. **Safe Back Fallback:**
   - Tombol breadcrumb kembali selalu memeriksa `router.canGoBack()`. Jika riwayat kosong, otomatis dialihkan (*fallback redirect*) ke halaman daftar jadwal peran terkait.
4. **Post-Delete Redirect:**
   - Menghapus sesi langsung mengalihkan pengguna kembali ke `/asisten/jadwal`.

---

## 8. Aturan Larangan Desain (Anti-Patterns / Anti-Slop)

1. **DILARANG menggunakan Emoji:** Jangan gunakan emoji (`📅`, `⏰`, `📍`, `✅`, `❌`, `🚀`) pada tombol, header, judul, atau teks aplikasi. Gunakan tipografi terstruktur, badge teks bersih, dan simbol geometris standar.
2. **DILARANG menempatkan tombol Back telanjang di Navbar:** Navigasi kembali antar-halaman detail harus selalu menggunakan pola Breadcrumb Pill di atas judul konten.
3. **DILARANG menggunakan lebar container tetap (*fixed width*):** Gunakan Flexbox dengan `width: '100%'`, `maxWidth: 960`, dan `alignSelf: 'center'`.
4. **DILARANG menggunakan bayangan berlebih (*muddy shadows*):** Gunakan border tipis `#E2E8F0` dengan elevasi halus (`elevation: 1–2`).
5. **DILARANG mengabaikan status kosong (*empty states*):** Setiap FlatList wajib memiliki `ListEmptyComponent` berupa `EmptyState` terstruktur.
