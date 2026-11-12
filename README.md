# PPK LabPortal — Sistem Presensi, Manajemen Sesi & Moderasi Izin Praktikum

> **Praktikum Pengembangan Platform Khusus (PPK)**  
> **Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)**  
> Dibangun dengan **React Native**, **Expo SDK 57**, dan **Expo Router**. Mendukung penuh **Android (Expo Go & Build)**, **iOS**, dan **Web Browser**.

---

## 1. Peta Dokumentasi Proyek

Untuk mempermudah pemahaman arsitektur dan kolaborasi pengembang, dokumentasi proyek dibagi secara modular:

| Berkas | Fokus Utama | Tautan |
|---|---|:---:|
| **`DESIGN.md`** | **Single Source of Truth Desain:** Token warna resmi (Terracotta Orange `#EA580C`, Academic Teal `#0D9488`), standar responsif desktop `maxWidth: 960px`, tipografi, dan aturan mutlak *anti-slop* (tanpa emoji generik). | [Baca DESIGN.md](./DESIGN.md) |
| **`SRS.md`** | **Spesifikasi Kebutuhan Sprint 1:** Antarmuka, tata letak Flexbox, navigasi Expo Router, simulasi alur asisten & praktikan, serta state runtime in-memory. | [Baca SRS.md](./SRS.md) |
| **`SRS2.md`** | **Spesifikasi Kebutuhan Sprint 2:** Integrasi Firebase Authentication multi-metode, Cloud Firestore real-time, modul pengajuan izin, klasifikasi API Model AI, dan pembagian tugas 2 programmer. | [Baca SRS2.md](./SRS2.md) |
| **`firestore.rules`**| **Aturan Keamanan Database:** Role-Based Access Control (RBAC) resmi Cloud Firestore yang melindungi koleksi `/users`, `/sessions`, `/attendances`, dan `/leave_requests`. | [Baca firestore.rules](./firestore.rules) |

---

## 2. Ikhtisar Proyek

**PPK LabPortal** adalah aplikasi operasional laboratorium praktikum modern yang mengintegrasikan pencatatan kehadiran presensi mandiri, manajemen jadwal sesi, dan moderasi izin ketidakhadiran berbantuan kecerdasan buatan (*Artificial Intelligence*).

Aplikasi dirancang secara adaptif dari dua perspektif peran pengguna:
1. **Praktikan (Mahasiswa Informatika):** Memantau jadwal praktikum, memeriksa detail sesi dan materi modul, presensi mandiri saat sesi dibuka menggunakan kode sesi 4 digit (dengan proteksi kelas dan anti-duplikasi), mengajukan izin jika berhalangan hadir, serta melihat rekap riwayat kehadiran.
2. **Asisten Laboratorium:** Menjadwalkan sesi modul baru (CRUD Sesi), membuka dan menutup sesi presensi secara real-time, memantau kehadiran mahasiswa melalui roster kelas dan indikator ketercapaian, mengelola master data pengguna (CRUD Praktikan & Asisten), serta meninjau rekomendasi AI dan mengambil keputusan persetujuan izin ketidakhadiran.

---

## 3. Fitur Utama Aplikasi

### A. Fitur Operasional Praktikum (Sprint 1 — Selesai & Teruji)
* **Jadwal & Detail Sesi Praktikum:** Daftar jadwal lengkap dengan nama praktikum, materi modul, kelas, ruang laboratorium, waktu, dan status sesi (`Dibuka`, `Belum Dibuka`, `Ditutup`).
* **Filter Status & Filter Cerdas Kelas Saya:** Filter sesi berdasarkan status serta chip pintar `Kelas Saya (Kelas A/B)` untuk memfilter sesi yang sesuai dengan kelas terdaftar mahasiswa.
* **Metrik Ringkasan (Stats Overview):** Kartu ringkasan interaktif di awal setiap dashboard agar tampilan informatif dan tidak hampa.
* **Presensi Mandiri dengan Kode 4 Digit:** Formulir presensi yang hanya aktif saat sesi `Dibuka`, mewajibkan input 4 digit kode sesi dari asisten, catatan opsional, dan checkbox integritas kehadiran.
* **Validasi Kesesuaian Kelas:** Menolak presensi dengan banner peringatan jika kelas mahasiswa berbeda dengan kelas sesi praktikum (misal mahasiswa Kelas B dilarang presensi di sesi Kelas A).
* **Validasi Anti-Duplikasi Presensi:** Praktikan tidak dapat presensi dua kali pada sesi yang sama. Tombol otomatis terkunci menjadi `Presensi Telah Lengkap` dengan banner status hijau.
* **Roster Kehadiran Kelas (Hadir vs Belum Hadir):** Menampilkan seluruh mahasiswa terdaftar pada kelas tersebut, membedakan siapa yang sudah presensi (beserta jam kehadiran resmi) dan siapa yang belum hadir.
* **Master Data Pengguna (CRUD Praktikan & Asisten):** Asisten dapat menambah, mengedit, dan menghapus data mahasiswa maupun akun sesama asisten laboratorium melalui tab switcher navigasi `Pengguna`.
* **Universal RoleHeader:** Navbar universal responsif dengan tombol popup `Ganti Akun` untuk beralih profil praktikan atau asisten secara instan.

### B. Fondasi Data Dinamis & AI (Sprint 2 — Siap Dikerjakan)
* **Multi-Metode Autentikasi:** Mendukung pendaftaran/login via **Email & Password** serta **Sign-In with Google Account**.
* **Cloud Firestore Real-Time:** Penyimpanan data persisten dan sinkronisasi instan via `onSnapshot` untuk koleksi `/users`, `/sessions`, `/attendances`, dan `/leave_requests`.
* **Keamanan Database Ter-deploy:** File `firestore.rules` menerapkan pembatasan hak akses berbasis peran (RBAC) dan telah aktif di server Google Cloud Firestore.
* **Pengajuan Izin Ketidakhadiran:** Praktikan dapat mengajukan permohonan izin dengan alasan tertulis dan tautan dokumen bukti.
* **Integrasi API Model AI Pengajar:** Alasan izin dikirim ke API Model AI untuk diklasifikasikan ke dalam 4 kategori (`Sakit`, `Akademik`, `Keluarga`, `Lainnya`) dengan skor keyakinan (*confidence score*) sebagai pendukung keputusan non-binding bagi asisten.
* **Resilience & Fallback AI:** Sistem otomatis beralih ke *NLP Heuristic Engine* lokal jika server AI dosen offline atau mengalami timeout (maksimal 5 detik), menjamin aplikasi tidak pernah macet saat pengujian.
* **Panel Moderasi Asisten:** Dashboard khusus asisten untuk meninjau pengajuan izin, memeriksa rekomendasi AI, dan menetapkan keputusan (*Setujui* atau *Tolak*).

---

## 4. Struktur Proyek

```
PPK-Post-UTS/
├── DESIGN.md                     # Sumber kebenaran sistem desain resmi (E-Stock Inspired)
├── SRS.md                        # Spesifikasi kebutuhan Sprint 1
├── SRS2.md                       # Spesifikasi kebutuhan Sprint 2 (Firebase & AI)
├── README.md                     # Dokumentasi utama proyek
├── .env.example                  # Template variabel lingkungan untuk tim
├── .firebaserc                   # Konfigurasi project ID Firebase CLI
├── firebase.json                 # Konfigurasi rilis layanan Firebase
├── firestore.rules               # Aturan keamanan database Cloud Firestore (RBAC)
├── firestore.indexes.json        # Pengaturan indeks komposit Firestore
├── package.json                  # Dependensi proyek (Expo SDK 57 & Firebase SDK)
├── tsconfig.json                 # Konfigurasi TypeScript strict
├── src/
│   ├── app/                      # Expo Router (File-based routing)
│   │   ├── _layout.tsx           # Root layout dengan safe-area, web title & provider
│   │   ├── index.tsx             # Halaman portal landing & pemilihan identitas
│   │   ├── asisten/
│   │   │   ├── _layout.tsx       # Tab navigator asisten dengan RoleHeader
│   │   │   ├── jadwal.tsx        # Pengelolaan sesi praktikum & metrik asisten
│   │   │   ├── mahasiswa.tsx     # Master Data Pengguna (CRUD Praktikan & Asisten)
│   │   │   ├── rekap.tsx         # Rekapitulasi kehadiran kelas per sesi
│   │   │   └── detail-sesi/
│   │   │       └── [id].tsx      # Kontrol sesi (buka/tutup/buka kembali), kode 4 digit & roster
│   │   └── praktikan/
│   │       ├── _layout.tsx       # Tab navigator praktikan dengan RoleHeader
│   │       ├── jadwal.tsx        # Jadwal praktikum & status sesi
│   │       ├── riwayat.tsx       # Riwayat kehadiran & persentase keaktifan pribadi
│   │       └── detail-sesi/
│   │           └── [id].tsx      # Formulir presensi mandiri dengan verifikasi kode & kelas
│   ├── components/               # Komponen UI modular (E-Stock Inspired, Anti-Slop)
│   │   ├── confirmation-modal.tsx# Dialog modal konfirmasi aksi & feedback
│   │   ├── empty-state.tsx       # Tampilan terstruktur saat data kosong
│   │   ├── role-header.tsx       # Universal header dengan switch user modal
│   │   ├── sesi-card.tsx         # Kartu jadwal sesi seragam
│   │   └── status-badge.tsx      # Badge status sesi & kehadiran
│   ├── context/
│   │   └── praktikum-context.tsx # State runtime terpusat (sesi, CRUD, presensi, pengguna)
│   ├── data/
│   │   └── dummy.ts              # Data dummy realistis Informatika FSM UNDIP (NIM 240601...)
│   ├── lib/
│   │   └── firebase.ts           # Inisialisasi Firebase App, Auth, dan Firestore Client
│   └── types/
│       └── praktikum.ts          # Kontrak antarmuka TypeScript
```

---

## 5. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau lebih baru.
- **npm** (atau bun).
- Perangkat pengujian: **Web Browser** modern, atau ponsel fisik dengan aplikasi **Expo Go** (Android / iOS).

### 1. Kloning & Pengaturan Dependensi
```bash
# Pastikan berada di direktori proyek
npm install
```

### 2. Pengaturan Variabel Lingkungan (.env)
Salin berkas template `.env.example` menjadi `.env` lokal:
```bash
cp .env.example .env
```
Isi konfigurasi Firebase dan endpoint AI sesuai proyek Anda:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=praktikum-ppk-labportal.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=praktikum-ppk-labportal
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=praktikum-ppk-labportal.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=451443064627
EXPO_PUBLIC_FIREBASE_APP_ID=1:451443064627:web:...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PVPB052XEP

EXPO_PUBLIC_AI_API_URL=https://api.labif.undip.ac.id/v1/classify-reason
```

### 3. Menjalankan Aplikasi (Expo Dev Server)
```bash
npx expo start
```
* **Web Browser:** Tekan tombol `w` di terminal atau buka `http://localhost:8081` di browser.
* **Android (Expo Go):** Buka aplikasi Expo Go, pindai QR code yang tampil di terminal.
* **iOS (Expo Go):** Buka kamera bawaan iPhone, pindai QR code, dan buka via Expo Go.

---

## 6. Pemeriksaan Kualitas & Standar Kode

Seluruh basis kode diverifikasi secara rutin dan wajib mempertahankan standar kualitas:

```bash
# 1. Pemeriksaan tipe data statis TypeScript (Harus 0 error)
npx tsc --noEmit

# 2. Pemeriksaan linter Expo / ESLint (Harus 0 warning/error)
npx expo lint

# 3. Diagnostik kompatibilitas dependensi Expo SDK
npx expo-doctor
```

---

## 7. Protokol Kolaborasi Git (Sprint 2)

Pengerjaan fitur Sprint 2 dibagi menjadi dua cabang (*branch*) independen dengan format `feature/`:

* **Branch `feature/auth-firestore-presensi` (Programmer 1):**
  * Bertanggung jawab atas: Layar Login & Register, modul `AuthContext`, CRUD Sesi Cloud Firestore, dan pencatatan presensi real-time.
* **Branch `feature/izin-ai-moderation` (Programmer 2):**
  * Bertanggung jawab atas: Formulir pengajuan izin praktikan, modul `AIService` penghubung API AI model, kartu analisis AI `AICategoryBadge`, dan panel moderasi asisten laboratorium.

> [!IMPORTANT]
> **Aturan Git:** Seluruh pengembangan fitur dilakukan di branch masing-masing dan diverifikasi secara lokal sebelum digabungkan (*merge*) ke branch `main`.

---

## 8. Panduan Skenario Pengujian (Demonstrasi Alur)

### Skenario 1: Alur Presensi Terintegrasi Real-Time
1. **Asisten Membuka Sesi:** Masuk sebagai Asisten Lab $\rightarrow$ buka tab **Jadwal** $\rightarrow$ pilih sesi berstatus `Belum Dibuka` $\rightarrow$ klik **Buka Sesi Praktikum** (status berubah menjadi `Dibuka`, kode numerik 4 digit aktif).
2. **Praktikan Melakukan Presensi:** Beralih ke peran Praktikan $\rightarrow$ buka tab **Jadwal** $\rightarrow$ pilih sesi tersebut $\rightarrow$ masukkan 4 digit kode sesi $\rightarrow$ klik **Kirim Presensi Hadir** (status berubah menjadi `Sudah Presensi`, waktu kehadiran resmi tercatat).
3. **Asisten Memantau Rekap:** Kembali ke peran Asisten $\rightarrow$ buka detail sesi $\rightarrow$ nama praktikan langsung tercatat **Hadir** lengkap dengan timestamp jam kehadiran secara real-time.
4. **Asisten Menutup Sesi:** Asisten menekan tombol **Tutup Sesi Praktikum** (status berubah menjadi `Ditutup`, formulir presensi mahasiswa terkunci).

### Skenario 2: Alur Pengajuan Izin Berbantuan AI
1. **Praktikan Mengajukan Izin:** Praktikan membuka formulir pengajuan izin $\rightarrow$ memilih sesi praktikum $\rightarrow$ mengisi alasan ketidakhadiran (misal: sakit demam).
2. **AI Mengklasifikasikan Alasan:** Sistem mengirim teks ke API model AI $\rightarrow$ model AI merespons dengan kategori `Sakit` dan confidence `94%` $\rightarrow$ data tersimpan di koleksi `/leave_requests` berstatus `menunggu`.
3. **Asisten Melakukan Moderasi:** Asisten membuka panel moderasi $\rightarrow$ melihat pengajuan izin beserta kartu rekomendasi AI $\rightarrow$ asisten menekan **Setujui Izin**.
4. **Praktikan Menerima Hasil:** Di layar pemantauan praktikan, status pengajuan langsung terbarui secara real-time menjadi **Izin Disetujui**.
