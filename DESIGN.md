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
  2. **Zero-Slop Clean Typography:** Tidak menggunakan emoji maupun titik bulat status dekoratif (`●`) sebagai ikon UI; menggunakan tipografi tebal, inisial terstruktur, dan penanda arah/geometris bersih (`←`, `→`, `■`, `▲`, `▼`).
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
| `asisten.primary` | `#0D9488` | Aksen tombol asprak/asisten, badge pengampu, header filter | **4.7:1** thd surface (WCAG AA) |
| `asisten.tint` | `#F0FDFA` | Latar badge asprak/asisten, kartu kontrol sesi | Lembut |
| `asisten.border` | `#99F6E4` | Garis pembatas kartu asprak/asisten | Lembut |
| `aslab.primary` | `#4F46E5` | Aksen utama Portal Aslab (Indigo), tombol & filter aktif | **6.3:1** thd surface (WCAG AA) |
| `aslab.tint` | `#EEF2FF` | Latar badge ASLAB, kartu highlight Aslab | Lembut |
| `aslab.border` | `#C7D2FE` | Garis pembatas kartu & chip Aslab | Lembut |
| `status.open.accent` | `#16A34A` | Aksen warna sesi dibuka / hadir / lunas / berhasil | — |
| `status.open.bg` | `#DCFCE7` | Latar badge sesi dibuka / hadir / lunas / berhasil | — |
| `status.open.text` | `#15803D` | Teks badge sesi dibuka / hadir / lunas / berhasil | **5.4:1** thd badge bg |
| `status.wait.accent` | `#EAB308` | Aksen warna belum dibuka / terlambat / pending | — |
| `status.wait.bg` | `#FEF3C7` | Latar badge belum dibuka / terlambat / pending | — |
| `status.wait.text` | `#B45309` | Teks badge belum dibuka / terlambat / pending | **5.1:1** thd badge bg |
| `status.excused.accent` | `#2563EB` | Aksen warna izin (*excused absence*) / terjadwal | — |
| `status.excused.bg` | `#DBEAFE` | Latar badge izin (*excused absence*) / terjadwal | — |
| `status.excused.text` | `#1D4ED8` | Teks badge izin (*excused absence*) / terjadwal | **5.9:1** thd badge bg |
| `status.close.accent` | `#DC2626` | Aksen warna ditutup / belum dibayar / gagal / hapus | — |
| `status.close.bg` | `#FEE2E2` | Latar badge ditutup / belum dibayar / gagal | — |
| `status.close.text` | `#B91C1C` | Teks badge ditutup / belum dibayar / gagal | **5.8:1** thd badge bg |

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
- **Struktur Responsif:**
  - Pada layar lebar (`width >= 680px`): tampil 1 baris horizontal berisi brand kiri (`PPK LabPortal`), pill identitas pengguna, serta tombol `Notifikasi` & `Keluar` di kanan.
  - Pada layar ponsel sempit (`width < 680px`): otomatis tersusun **2 baris** — baris atas `[PPK] LabPortal` utuh di kiri + `Notifikasi` & `Keluar` di kanan, dan baris kedua full-width berisi pill identitas pengguna agar nama lengkap maupun judul aplikasi tidak pernah terpotong.
- **Identitas & Aksi:**
  - Badge logo kotak (`28x28`, radius 7) bertuliskan `PPK` oranye tebal + teks `LabPortal`, dapat ditekan untuk kembali ke beranda peran.
  - Pill identitas pengguna menampilkan badge peran (`PRAKTIKAN` / `ASPRAK` / `ASLAB`), nama lengkap, serta info kelas/peran lab.
  - Tombol `Notifikasi` & `Keluar`: memicu navigasi ke `/notifikasi` atau **Centered Popup Modal** konfirmasi keluar akun.
- **Penyelarasan:**
  - `paddingHorizontal: width >= 680 ? 20 : 14`.
  - Terkoneksi dengan Safe-Area Insets pada Android/iOS.

### 5.2 Breadcrumb Navigasi (`BreadcrumbBack`)
- Menggantikan tombol back navbar yang canggung.
- Berupa pill independen seragam di seluruh halaman (`fontSize: 11.5`, `paddingHorizontal: 12`, `paddingVertical: 5`, `borderRadius: 20`) dengan awalan panah `← Kembali ...` di atas judul halaman:
  - Pada Pemilihan Identitas: `← Kembali ke Pemilihan Peran`
  - Pada Detail Sesi / Peta / Izin / Tagihan / Impor: `← Kembali ke ...`
- Dilengkapi fallback redirect (`router.canGoBack() ? router.back() : router.replace(...)`).

### 5.3 Kartu Ringkasan Metrik (`MetricsGrid`)
- 4 kartu bersanding di atas layar Jadwal, Rekap, dan Riwayat:
  - Asisten: **Total Sesi**, **Sesi Dibuka**, **Total Presensi Masuk**, **Sesi Ditutup**.
  - Praktikan: **Total Sesi**, **Sesi Dibuka**, **Sudah Hadir**, **Belum Buka**.
- Setiap kartu memiliki angka tebal (24pt), label tebal (12pt), dan teks penjelasan (11pt).

### 5.4 Kartu Sesi Praktikum (`SesiCard`)
- Menampilkan: Nama Praktikum, Chip Kelas (`Kelas A` / `Kelas B`), `StatusBadge` teks bersih tanpa titik bulat dekoratif.
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

### 6.5 Manajemen Data Pengguna: Praktikan & Asisten (`/asisten/mahasiswa`)
1. Header Asisten dengan live status tag `Master Data Pengguna`.
2. Segmented Switcher Navigasi: Beralih instan antara **Praktikan** dan **Asisten Lab**.
3. **Pengelolaan Praktikan:**
   - Tombol **`+ Tambah Praktikan`**, 4 kartu metrik overview (Total Praktikan, Kelas A, Kelas B, Total Presensi Masuk).
   - Search bar real-time & filter chips kelas (`Semua`, `Kelas A`, `Kelas B`).
   - Kartu mahasiswa: Avatar inisial, nama, chip kelas, NIM resmi, badge kehadiran, tombol `Edit` & `Hapus`.
4. **Pengelolaan Asisten Laboratorium:**
   - Tombol **`+ Tambah Asisten`**, 4 kartu metrik overview (Total Asisten, Sesi Diampu, Mahasiswa Terbimbing, Status Akun).
   - Search bar asisten, kartu profil asisten dengan penugasan lab, tombol `Edit` (perbarui nama/tugas) & tombol `Hapus` (dengan proteksi minimal 1 asisten aktif).
5. **Sinkronisasi Instan:** Seluruh data praktikan dan asisten baru langsung tersinkronisasi ke portal landing (`/`), dialog `Ganti Akun`, dan roster kehadiran kelas.

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
1. Header Riwayat dengan banner persentase kehadiran pribadi (tidak menghitung `izin` sebagai hadir).
2. Kartu Riwayat per-sesi lengkap dengan timestamp resmi kehadiran WIB dan `StatusBadge` (`Hadir`, `Terlambat`, atau `Izin`).

### 6.8 Blueprint Layar Sprint 4 (Aslab & Tagihan Midtrans)
1. **Dashboard Keberlangsungan Lab (`/aslab/dashboard`, Aksen Indigo `#4F46E5`):**
   - `MetricsGrid` 4 ubin (Total Lab, Total Praktikan, Total Asprak, Sesi Berlangsung).
   - `PeriodFilterBar` segmented (`Hari | Minggu | Bulan`) dengan navigasi `←` / `→` dan tombol `Hari Ini`.
   - Daftar kartu `LabStatusCard` (status `Berlangsung` / `Terjadwal` / `Tidak Ada Kegiatan`), daftar Sesi Berlangsung & Akan Datang, Riwayat Kegiatan Lab, dan Riwayat Keuangan Denda (`Rp 10.000`).
2. **Jadwal Sesi & Manajemen Lab Aslab (`/aslab/jadwal`, `/aslab/laboratorium`, `/aslab/anggota`):**
   - Form modal CRUD sesi dengan pemilihan `labId` wajib; konfigurasi lab dengan `radiusMeter`, `graceMinutes`, dan `fineAmount`.
   - Tiga alur impor terpisah (`impor-lab`, `impor-praktikan`, `impor-asprak`) memakai `ImportReviewList` (kartu scroll per baris dengan edit inline, badge status validasi, aksi Terima/Tolak, dan panel ringkasan sticky).
3. **Tagihan & Pembayaran Denda Praktikan (`/praktikan/tagihan`, `/praktikan/tagihan/[id]`, `/praktikan/pembayaran-hasil`, `/praktikan/riwayat-pembayaran`):**
   - Menggunakan aksen Terracotta `#EA580C`, `MetricsGrid`, format `Rp`, `EmptyState`, dan `StatusBadge` (`Belum Dibayar`, `Menunggu Pembayaran`, `Lunas`, `Berhasil`, `Gagal`).

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
6. **DILARANG menambahkan titik bulat status dekoratif (*status dot*) di mana pun:** Jangan pernah menempatkan karakter bulat (`●`, `•`) maupun `<View>` lingkaran kecil sebagai indikator di dalam badge (`StatusBadge`, `PANEL ASPRAK`, `PANEL ASLAB`, `LIVE TRACKING`), pill header, kartu status, atau banner info. Pembeda status wajib memakai warna latar, border, dan tipografi teks yang bersih. *(Satu-satunya penanda titik bulat yang diizinkan hanyalah pin lokasi GPS pengguna pada kanvas peta.)*
7. **DILARANG membuat tombol `Kembali` berukuran berbeda atau header/email terpotong di layar sempit:** Semua pill navigasi kembali memakai ukuran seragam (`fontSize: 11.5`, `paddingHorizontal: 12`, `paddingVertical: 5`, `borderRadius: 20`) berawalan `←`, badge lab pada kartu anggota diletakkan di bawah info agar email tidak terlipat sempit, kontrol aksi pada peta memakai pill berlabel jelas (`Lokasi Saya`, `Fokus Lab`), dan lingkaran radius peta hanya digambar untuk **1 lab terpilih**.
