# LabPortal — Sistem Presensi, Manajemen Sesi & Moderasi Izin Praktikum

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

### B. Fondasi Data Dinamis & AI (Sprint 2 — Selesai & Teruji Sepenuhnya)
* **Multi-Metode Autentikasi & Persistensi Sesi:** Mendukung pendaftaran/login via **Email & Password** serta **Native Google Sign-In** (Google Play Services di Android via `@react-native-google-signin/google-signin` & `signInWithPopup` di Web). Dilengkapi **persisten sesi instan `@react-native-async-storage/async-storage`** sehingga pengguna tidak ter-logout saat aplikasi ditutup/restart.
* **Role Guard & Navigasi Terproteksi:** Otomatis mengarahkan pengguna ke Portal Praktikan atau Portal Asisten berdasarkan `peran` di Firestore `/users/{uid}`, dilengkapi modal kelengkapan profil Google.
* **Header & Bottom Bar Responsif Single-Row:** Navbar atas (`RoleHeader`) presisi sejajar satu baris horizontal dengan informasi profil dan tombol keluar di sisi kanan atas, serta bottom navigation bar mobile dengan ikon vektor adaptif dan safe area insets.
* **Cloud Firestore Real-Time:** Penyimpanan data persisten dan sinkronisasi instan via `onSnapshot` untuk koleksi `/users`, `/sessions`, `/attendances`, dan `/leave_requests`.
* **Keamanan Database Ter-deploy:** File `firestore.rules` menerapkan pembatasan hak akses berbasis peran (RBAC) dan aktif di server Cloud Firestore.
* **Pengajuan Izin Ketidakhadiran:** Praktikan dapat mengajukan permohonan izin dengan alasan tertulis dan tautan dokumen bukti.
* **On-Device AI Classification (Model EDOM):** Alasan izin dianalisis secara lokal menggunakan mesin inferensi JavaScript model EDOM resmi (`ai/model-edom.json` & `ai/sentiment.js`) tanpa latensi jaringan untuk klasifikasi 4 kategori (`Sakit`, `Akademik`, `Keluarga`, `Lainnya`).
* **Panel Moderasi Asisten:** Dashboard khusus asisten untuk meninjau antrean izin real-time, memeriksa rekomendasi AI, dan menetapkan keputusan (*Setujui* atau *Tolak*).
* **Rekapitulasi Kehadiran Akurat:** Mahasiswa yang izinnya disetujui otomatis tercatat berstatus Izin (bukan Alpa) pada rekap kehadiran kelas asisten.

---

## 4. Struktur Proyek

```
PPK-Post-UTS/
├── DESIGN.md                     # Sumber kebenaran sistem desain resmi (E-Stock Inspired)
├── SRS.md                        # Spesifikasi kebutuhan Sprint 1
├── SRS2.md                       # Spesifikasi kebutuhan Sprint 2 (Firebase, AI & Programmer Matrix)
├── README.md                     # Dokumentasi utama proyek
├── .env.example                  # Template variabel lingkungan untuk tim
├── .easignore                    # Berkas yang dikecualikan dari unggahan EAS Build
├── eas.json                      # Konfigurasi profil build EAS (preview APK & production)
├── .firebaserc                   # Konfigurasi project ID Firebase CLI
├── firebase.json                 # Konfigurasi rilis layanan Firebase
├── firestore.rules               # Aturan keamanan database Cloud Firestore (RBAC)
├── firestore.indexes.json        # Pengaturan indeks komposit Firestore
├── package.json                  # Dependensi proyek (Expo SDK 57, Firebase SDK, Google Sign-In)
├── tsconfig.json                 # Konfigurasi TypeScript strict
├── ai/                           # On-Device AI Engine (Model EDOM Resmi)
│   ├── model-edom.json           # Bobot kamus sentimen & leksikon model EDOM
│   └── sentiment.js              # Pure JavaScript inference engine (< 20ms, 100% offline)
├── src/
│   ├── app/                      # Expo Router (File-based routing)
│   │   ├── _layout.tsx           # Root layout dengan safe-area, web title & provider
│   │   ├── index.tsx             # Halaman portal landing & redirect role guard
│   │   ├── login.tsx             # Layar Masuk (Email & Password + Native Google Sign-In)
│   │   ├── register.tsx          # Layar Daftar Baru (Peran Mahasiswa / Asisten Lab)
│   │   ├── asisten/
│   │   │   ├── _layout.tsx       # Tab navigator asisten dengan RoleHeader & vektor ikon
│   │   │   ├── jadwal.tsx        # Pengelolaan sesi praktikum & metrik asisten
│   │   │   ├── moderasi-izin.tsx # Panel moderasi persetujuan izin berbantuan rekomendasi AI
│   │   │   ├── mahasiswa.tsx     # Master Data Pengguna (CRUD Praktikan & Asisten)
│   │   │   ├── rekap.tsx         # Rekapitulasi kehadiran kelas per sesi & status izin
│   │   │   └── detail-sesi/
│   │   │       └── [id].tsx      # Kontrol sesi (buka/tutup/buka kembali), kode 4 digit & roster
│   │   └── praktikan/
│   │       ├── _layout.tsx       # Tab navigator praktikan dengan RoleHeader & vektor ikon
│   │       ├── jadwal.tsx        # Jadwal praktikum, filter kelas saya & status sesi
│   │       ├── pengajuan-izin.tsx# Formulir izin praktikum dengan analisis AI on-device
│   │       ├── riwayat.tsx       # Riwayat kehadiran & persentase keaktifan pribadi
│   │       └── detail-sesi/
│   │           └── [id].tsx      # Formulir presensi mandiri dengan verifikasi kode & kelas
│   ├── components/               # Komponen UI modular (E-Stock Inspired, Anti-Slop)
│   │   ├── ai-category-badge.tsx # Badge visual rekomendasi AI (Kategori & Tingkat Keyakinan)
│   │   ├── confirmation-modal.tsx# Dialog modal konfirmasi aksi & feedback
│   │   ├── empty-state.tsx       # Tampilan terstruktur saat data kosong
│   │   ├── google-profile-modal.tsx# Dialog kelengkapan profil pengguna baru Google Sign-In
│   │   ├── leave-card.tsx        # Kartu antrean izin dengan rekomendasi AI & aksi moderasi
│   │   ├── role-header.tsx       # Universal header dengan switch user modal
│   │   ├── sesi-card.tsx         # Kartu jadwal sesi seragam
│   │   ├── status-badge.tsx      # Badge status sesi & kehadiran
│   │   └── tab-icons.tsx         # Komponen ikon vektor murni untuk bottom navigation bar
│   ├── context/
│   │   ├── auth-context.tsx      # Manajemen sesi Firebase Auth & sinkronisasi profil user
│   │   └── praktikum-context.tsx # State runtime fallback & cache sesi
│   ├── data/
│   │   └── dummy.ts              # Data dummy realistis Informatika FSM UNDIP (NIM 240601...)
│   ├── lib/
│   │   └── firebase.ts           # Inisialisasi Firebase App, Auth, Firestore & Google Client ID
│   ├── services/
│   │   ├── ai-service.ts         # Layanan klasifikasi AI On-Device EDOM (offline resilience)
│   │   ├── leave-service.ts      # Layanan CRUD pengajuan izin Cloud Firestore
│   │   └── session-service.ts    # Layanan CRUD jadwal sesi Cloud Firestore
│   └── types/
│       └── praktikum.ts          # Kontrak antarmuka TypeScript terpadu
```

---

## 5. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau lebih baru.
- **npm** (atau bun).
- Perangkat pengujian: **Web Browser** modern, atau ponsel fisik Android / iOS.

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
Isi konfigurasi Firebase dan Google OAuth Client ID:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=praktikum-ppk-labportal.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=praktikum-ppk-labportal
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=praktikum-ppk-labportal.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=451443064627
EXPO_PUBLIC_FIREBASE_APP_ID=1:451443064627:web:...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PVPB052XEP

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=451443064627-5tgabgh2hienk8i6thm3tuh14qhs0dk6.apps.googleusercontent.com
```

### 3. Menjalankan Aplikasi di Mode Pengembangan (Expo Dev Server)
```bash
npx expo start
```
* **Web Browser:** Tekan tombol `w` di terminal atau buka `http://localhost:8081` di browser.
* **Android (Expo Go):** Buka aplikasi Expo Go, pindai QR code yang tampil di terminal.
* **iOS (Expo Go):** Buka kamera bawaan iPhone, pindai QR code, dan buka via Expo Go.

### 4. Build Standalone Android APK (EAS Build)
Aplikasi mendukung kompilasi mandiri ke berkas `.apk` siap pasang tanpa memerlukan Android Studio lokal:
```bash
# Login ke akun Expo EAS Anda
npx eas-cli login

# Mulai proses cloud build APK Android
npx eas-cli build -p android --profile preview
```

#### 📥 Tautan Unduhan Build APK Terbaru (Rilis Preview):
- **Halaman Pantau & Unduh Build EAS Terbaru:** [expo.dev/.../builds/93b2d677-1c20-461d-a98b-ce0e19303bc3](https://expo.dev/accounts/gregoriusseptiano/projects/PPK-Post-UTS/builds/93b2d677-1c20-461d-a98b-ce0e19303bc3)
- **Tautan Unduhan Langsung APK Terkini:** [Download LabPortal (I0anC8ZS... .apk)](https://expo.dev/artifacts/eas/I0anC8ZS-IzbEvtBjYREJZf5DKAYGIX3a-b7j72tMMA.apk)

> [!TIP]
> **Registrasi SHA-1 Fingerprint untuk Google Sign-In:**  
> Agar fitur Native Google Sign-In dapat berkomunikasi dengan Google Play Services di HP Android tanpa error `DEVELOPER_ERROR`, pastikan SHA-1 Keystore EAS berikut telah ditambahkan di **Firebase Console** $\rightarrow$ **Project Settings** $\rightarrow$ **Your Apps (Android)**:  
> `58:3A:22:E2:5F:01:A3:82:E1:87:F2:8F:FB:F4:62:24:91:0F:7D:B2`

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

## 7. Status Integrasi & Kolaborasi Git (Sprint 2)

Seluruh modul Sprint 2 telah selesai dikembangkan, diintegrasikan, dan diuji penuh di branch `main`:

| No | Modul / Fitur | Programmer Penanggung Jawab | Status Integrasi | Keterangan Hasil |
|---|---|:---:|:---:|---|
| 1 | **Autentikasi Multi-Metode** | Programmer 1 | **Selesai (100%)** | Email/Password & Native Google Sign-In aktif dengan role router guard. |
| 2 | **Master Sesi Firestore (CRUD)** | Programmer 1 | **Selesai (100%)** | Tambah, buka/tutup sesi real-time, generate 4 digit kode sesi unik. |
| 3 | **Presensi & Roster Real-Time** | Programmer 1 | **Selesai (100%)** | Validasi kelas, anti-duplikasi `${sessionId}_${studentId}`, live roster asisten. |
| 4 | **On-Device AI Engine (EDOM)** | Programmer 2 | **Selesai (100%)** | Klasifikasi sentimen & kategori alasan murni lokal (< 20ms, offline resilience). |
| 5 | **Formulir Pengajuan Izin** | Programmer 2 | **Selesai (100%)** | Terhubung live Firestore `/leave_requests` dengan metadata AI terlampir. |
| 6 | **Badge Rekomendasi AI** | Programmer 2 | **Selesai (100%)** | Tampilan label visual rapi sesuai token palet warna `DESIGN.md`. |
| 7 | **Panel Moderasi Izin Asisten** | Programmer 2 | **Selesai (100%)** | Review izin live dengan rekomendasi AI dan aksi Setujui / Tolak izin. |
| 8 | **Rekapitulasi Presensi & Izin** | Programmer 2 | **Selesai (100%)** | Mahasiswa izin berstatus disetujui tercatat resmi izin (bukan alpa). |
| 9 | **Bottom Bar Safe Area & Vektor** | Tim Gabungan | **Selesai (100%)** | Mengatasi missing icon `☒` & kompatibel dengan gesture navigation Android. |
| 10 | **Persistensi Sesi & Token AsyncStorage** | Tim Gabungan | **Selesai (100%)** | Token auth & profil user tersimpan permanen di perangkat, bebas re-login saat restart. |
| 11 | **Header Navbar Single-Row & Preservasi Izin** | Tim Gabungan | **Selesai (100%)** | Layout RoleHeader sejajar rapi satu baris horizontal & sinkronisasi izin lama-baru. |
| 12 | **Penyempurnaan Layout Android & Eliminasi LED Dots** | Tim Gabungan | **Selesai (100%)** | Menghilangkan seluruh dot warna/LED status, mencegah pemotongan teks nama header, dan card footer anti-clipping. |

---

## 8. Panduan Skenario Pengujian (Demonstrasi Alur)

### Skenario 1: Alur Presensi Terintegrasi Real-Time
1. **Asisten Membuka Sesi:** Masuk sebagai Asisten Lab $\rightarrow$ buka tab **Jadwal** $\rightarrow$ pilih sesi berstatus `Belum Dibuka` $\rightarrow$ klik **Buka Sesi Praktikum** (status berubah menjadi `Dibuka`, kode numerik 4 digit aktif).
2. **Praktikan Melakukan Presensi:** Beralih ke peran Praktikan $\rightarrow$ buka tab **Jadwal** $\rightarrow$ pilih sesi tersebut $\rightarrow$ masukkan 4 digit kode sesi $\rightarrow$ klik **Kirim Presensi Hadir** (status berubah menjadi `Sudah Presensi`, waktu kehadiran resmi tercatat).
3. **Asisten Memantau Rekap:** Kembali ke peran Asisten $\rightarrow$ buka detail sesi $\rightarrow$ nama praktikan langsung tercatat **Hadir** lengkap dengan timestamp jam kehadiran secara real-time.
4. **Asisten Menutup Sesi:** Asisten menekan tombol **Tutup Sesi Praktikum** (status berubah menjadi `Ditutup`, formulir presensi mahasiswa terkunci).

### Skenario 2: Alur Pengajuan Izin Berbantuan AI
1. **Praktikan Mengajukan Izin:** Praktikan membuka formulir pengajuan izin $\rightarrow$ memilih sesi praktikum $\rightarrow$ mengisi alasan ketidakhadiran (misal: sakit demam).
2. **AI Mengklasifikasikan Alasan:** Sistem mengeksekusi model sentimen EDOM lokal on-device $\rightarrow$ model AI merespons dengan kategori `Sakit` dan confidence `94%` $\rightarrow$ data tersimpan di koleksi `/leave_requests` berstatus `menunggu`.
3. **Asisten Melakukan Moderasi:** Asisten membuka panel moderasi $\rightarrow$ melihat pengajuan izin beserta kartu rekomendasi AI $\rightarrow$ asisten menekan **Setujui Izin**.
4. **Praktikan Menerima Hasil:** Di layar pemantauan praktikan, status pengajuan langsung terbarui secara real-time menjadi **Izin Disetujui**.

### Skenario 3: Pengujian Persistensi Sesi & Cold-Start
1. **Masuk ke Akun:** Buka aplikasi dan masuk menggunakan Email & Kata Sandi atau Google Sign-In.
2. **Tutup Paksa Aplikasi (*Kill App*):** Usap aplikasi keluar dari layar *Recent Apps* Android atau matikan proses aplikasi secara penuh.
3. **Buka Kembali Aplikasi:** Buka ikon PPK LabPortal $\rightarrow$ aplikasi langsung menampilkan halaman beranda portal sesuai peran Anda (Praktikan/Asisten) **tanpa dialihkan ke layar login**.
4. **Periksa Header Atas:** Perhatikan navbar atas, nama pengguna dan tombol **Keluar** berada rapi di pojok kanan atas, sejajar horizontal satu baris dengan logo dan judul *PPK LabPortal*.
