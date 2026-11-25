# LabPortal — Sistem Presensi Geofencing, Peta Lab, Sesi & Moderasi Izin Praktikum

> **Praktikum Pengembangan Platform Khusus (PPK)**  
> **Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)**  
> Dibangun dengan **React Native**, **Expo SDK 57**, dan **Expo Router**. Mendukung **Android (EAS Build APK / Development Build)**, **iOS**, dan **Web Browser**.

---

## 1. Peta Dokumentasi Proyek

Untuk mempermudah pemahaman arsitektur dan kolaborasi pengembang, dokumentasi proyek dibagi secara modular:

| Berkas | Fokus Utama | Tautan |
|---|---|:---:|
| **`DESIGN.md`** | **Single Source of Truth Desain:** Token warna resmi (Terracotta Orange `#EA580C`, Academic Teal `#0D9488`), standar responsif desktop `maxWidth: 960px`, tipografi, dan aturan mutlak *anti-slop* (tanpa emoji generik). | [Baca DESIGN.md](./DESIGN.md) |
| **`SRS.md`** | **Spesifikasi Kebutuhan Sprint 1:** Antarmuka, tata letak Flexbox, navigasi Expo Router, simulasi alur asisten & praktikan, serta state runtime in-memory. | [Baca SRS.md](./SRS.md) |
| **`SRS2.md`** | **Spesifikasi Kebutuhan Sprint 2:** Integrasi Firebase Authentication multi-metode, Cloud Firestore real-time, modul pengajuan izin, klasifikasi AI Model EDOM, dan pembagian tugas 2 programmer. | [Baca SRS2.md](./SRS2.md) |
| **`SRS3.md`** | **Spesifikasi Kebutuhan Sprint 3:** Validasi lokasi presensi (*geofencing*) & QR Code, pengelolaan koordinat lab, peta laboratorium interaktif + live tracking & rute, push notification berbasis peristiwa, serta ketahanan perangkat. | [Baca SRS3.md](./SRS3.md) |
| **`firestore.rules`** | **Aturan Keamanan Database:** Role-Based Access Control (RBAC) resmi Cloud Firestore yang melindungi koleksi `/users`, `/sessions`, `/attendances`, `/leave_requests`, `/labs`, `/notifications`, dan `/system_health`. | [Baca firestore.rules](./firestore.rules) |

---

## 2. Ikhtisar Proyek

**PPK LabPortal** adalah aplikasi operasional laboratorium praktikum modern yang mengintegrasikan pencatatan kehadiran presensi mandiri berbasis lokasi (*geofencing*), pemetaan aktivitas laboratorium secara real-time, manajemen jadwal sesi, notifikasi berbasis peristiwa (*push notification*), serta moderasi izin ketidakhadiran berbantuan kecerdasan buatan (*Artificial Intelligence*).

Aplikasi dirancang secara adaptif dari dua perspektif peran pengguna:
1. **Praktikan (Mahasiswa Informatika):** Memantau jadwal praktikum, melakukan presensi di halaman khusus dengan validasi radius lokasi laboratorium (kode 4 digit atau QR Code), melihat peta persebaran laboratorium dan aktivitas praktikum real-time beserta rute jalan kaki, menerima notifikasi saat sesi dibuka/diubah atau izin diputuskan, mengajukan izin jika berhalangan hadir, serta memeriksa rekap riwayat kehadiran.
2. **Asisten Laboratorium:** Menjadwalkan sesi modul baru (CRUD Sesi), mengelola koordinat dan radius laboratorium (`/labs`), membuka dan menutup sesi presensi secara real-time (termasuk kode 4 digit & QR sesi), memantau aktivitas dan keterisian laboratorium di peta interaktif, memantau roster kehadiran kelas, mengelola master data pengguna (CRUD Praktikan & Asisten), serta meninjau rekomendasi AI dan mengambil keputusan persetujuan izin ketidakhadiran.

---

## 3. Fitur Utama Aplikasi

### A. Fitur Operasional Praktikum (Sprint 1 — Selesai & Teruji)
* **Jadwal & Detail Sesi Praktikum:** Daftar jadwal lengkap dengan nama praktikum, materi modul, kelas, ruang laboratorium, waktu, dan status sesi (`Dibuka`, `Belum Dibuka`, `Ditutup`).
* **Filter Status & Filter Cerdas Kelas Saya:** Filter sesi berdasarkan status serta chip pintar `Kelas Saya (Kelas A/B)` untuk memfilter sesi yang sesuai dengan kelas terdaftar mahasiswa.
* **Metrik Ringkasan (Stats Overview):** Kartu ringkasan interaktif di awal setiap dashboard agar tampilan informatif dan tidak hampa.
* **Validasi Kesesuaian Kelas & Anti-Duplikasi Presensi:** Menolak presensi jika kelas mahasiswa berbeda dengan kelas sesi praktikum dan mencegah presensi ganda pada sesi yang sama (`${sessionId}_${studentId}`).
* **Roster Kehadiran Kelas (Hadir vs Belum Hadir):** Menampilkan seluruh mahasiswa terdaftar pada kelas tersebut, membedakan siapa yang sudah presensi (beserta jam kehadiran resmi) dan siapa yang belum hadir.
* **Master Data Pengguna (CRUD Praktikan & Asisten):** Asisten dapat menambah, mengedit, dan menghapus data mahasiswa maupun akun sesama asisten laboratorium melalui tab navigasi `Pengguna`.
* **Universal RoleHeader:** Navbar universal responsif dengan informasi profil pengguna, pintasan Pusat Notifikasi, dan tombol keluar.

### B. Fondasi Data Dinamis & AI (Sprint 2 — Selesai & Teruji)
* **Multi-Metode Autentikasi & Persistensi Sesi:** Mendukung pendaftaran/login via **Email & Password** serta **Native Google Sign-In** (`@react-native-google-signin/google-signin` di Android & `signInWithPopup` di Web) dengan persistensi sesi `@react-native-async-storage/async-storage`.
* **Role Guard & Navigasi Terproteksi:** Otomatis mengarahkan pengguna ke Portal Praktikan atau Portal Asisten berdasarkan `peran` di Firestore `/users/{uid}`, dilengkapi modal kelengkapan profil Google.
* **Cloud Firestore Real-Time:** Penyimpanan data persisten dan sinkronisasi instan via `onSnapshot` untuk koleksi `/users`, `/sessions`, `/attendances`, dan `/leave_requests`.
* **Keamanan Database Ter-deploy:** File `firestore.rules` menerapkan pembatasan hak akses berbasis peran (RBAC) langsung di server Cloud Firestore.
* **Pengajuan Izin & On-Device AI (Model EDOM):** Alasan izin dianalisis secara lokal menggunakan mesin inferensi JavaScript model EDOM (`ai/model-edom.json` & `ai/sentiment.js`) tanpa latensi jaringan untuk klasifikasi kategori (`Sakit`, `Akademik`, `Keluarga`, `Lainnya`).
* **Panel Moderasi Asisten & Rekapitulasi Akurat:** Asisten meninjau antrean izin real-time beserta rekomendasi AI dan menetapkan keputusan (*Setujui* atau *Tolak*); izin disetujui otomatis tercatat berstatus Izin pada rekap kehadiran kelas.

### C. Device Capabilities, Geofencing, Maps & Push Notification (Sprint 3 — Selesai & Terintegrasi)
* **Halaman Presensi Khusus & Geofencing (`src/app/praktikan/presensi.tsx`):** Halaman presensi terpisah dengan pemeriksaan koordinat perangkat terhadap koordinat & radius laboratorium di `/labs` menggunakan jarak Haversine (`src/services/location-service.ts`), mendukung input kode 4 digit maupun pemindaian QR Code (`expo-camera`), serta *hard-validation* berlapis di `src/services/attendance-service.ts`.
* **Manajemen Lokasi & Radius Laboratorium (`src/app/asisten/lokasi-lab.tsx`):** Asisten dapat mengelola koordinat (`latitude`, `longitude`) dan batas radius (meter) seluruh ruang lab Informatika di Firestore `/labs` (`src/services/lab-service.ts`), termasuk fitur ambil lokasi saat ini dan keterhubungan `labId` pada sesi.
* **Peta Laboratorium Interaktif & Aktivitas Real-Time (`src/app/praktikan/peta-lab.tsx`, `src/app/asisten/peta-lab.tsx`):** Menampilkan peta `react-native-maps` berpusat di area laboratorium Informatika FSM UNDIP, marker status tiap lab, lingkaran radius lab terpilih, marker posisi pengguna *live tracking* (`watchPositionAsync`), estimasi rute jalan kaki via Google Routes API dengan fallback garis lurus (`src/services/route-service.ts`), sheet info praktikum yang *sedang berlangsung* & *berikutnya* (`src/services/lab-activity-service.ts`), serta fallback interaktif untuk Web (`lab-map-view.web.tsx`).
* **Push Notification Berbasis Peristiwa & Pusat Notifikasi (`src/app/notifikasi.tsx`):** Menggunakan Firebase Cloud Messaging (`@react-native-firebase/app`, `@react-native-firebase/messaging`) dan `expo-notifications` untuk mengirim notifikasi saat sesi dibuka/dimulai, jadwal diubah, atau izin disetujui/ditolak, sekaligus mencatat riwayat real-time di `/notifications`.
* **Ketahanan Izin & Kondisi Perangkat (`src/hooks/use-device-resilience.ts`, `src/components/device-status-banner.tsx`):** Penanganan terpadu saat izin lokasi/notifikasi ditolak, layanan GPS nonaktif, lokasi belum tersedia, atau perangkat offline (`@react-native-community/netinfo`), lengkap dengan tombol pintasan buka pengaturan perangkat.

---

## 4. Struktur Proyek

```
PPK-Post-UTS/
├── DESIGN.md                         # Sumber kebenaran sistem desain resmi
├── SRS.md                            # Spesifikasi kebutuhan Sprint 1
├── SRS2.md                           # Spesifikasi kebutuhan Sprint 2 (Firebase, AI & Matriks Tim)
├── SRS3.md                           # Spesifikasi kebutuhan Sprint 3 (Geofencing, Maps, Push & Resilience)
├── README.md                         # Dokumentasi utama proyek
├── .env.example                      # Template variabel lingkungan (.env) untuk tim
├── .easignore                        # Berkas yang dikecualikan dari unggahan EAS Build
├── eas.json                          # Konfigurasi profil build EAS (development, preview APK, production)
├── app.json                          # Konfigurasi Expo (owner sanftts-team, package, plugins native)
├── app.config.ts                     # Konfigurasi dinamis Maps API Key & google-services.json
├── google-services.json              # Konfigurasi Firebase Android (lokal/git-ignored, wajib ada saat build)
├── .firebaserc                       # Konfigurasi project ID Firebase CLI (praktikum-ppk-labportal)
├── firebase.json                     # Konfigurasi rilis layanan Firebase
├── firestore.rules                   # Aturan keamanan database Cloud Firestore (RBAC)
├── firestore.indexes.json            # Pengaturan indeks komposit Firestore
├── package.json                      # Dependensi proyek (Expo SDK 57, Firebase v13, Maps, Camera, FCM)
├── tsconfig.json                     # Konfigurasi TypeScript strict
├── ai/                               # On-Device AI Engine (Model EDOM Resmi)
│   ├── model-edom.json               # Bobot kamus sentimen & leksikon model EDOM
│   └── sentiment.js                  # Pure JavaScript inference engine (< 20ms, 100% offline)
└── src/
    ├── app/                          # Expo Router (File-based routing)
    │   ├── _layout.tsx               # Root layout dengan safe-area, web title & NotificationBootstrap
    │   ├── index.tsx                 # Halaman portal landing & redirect role guard
    │   ├── login.tsx                 # Layar Masuk (Email & Password + Native Google Sign-In)
    │   ├── register.tsx              # Layar Daftar Baru (Peran Mahasiswa / Asisten Lab)
    │   ├── notifikasi.tsx            # Pusat Notifikasi in-app real-time (/notifications)
    │   ├── test-ai.tsx               # Layar uji coba klasifikasi AI EDOM
    │   ├── asisten/
    │   │   ├── _layout.tsx           # Tab navigator asisten (Sesi, Lokasi, Peta Lab, Izin, Rekap, Pengguna)
    │   │   ├── jadwal.tsx            # Pengelolaan sesi praktikum & metrik asisten
    │   │   ├── lokasi-lab.tsx        # Manajemen lokasi koordinat & radius laboratorium (/labs)
    │   │   ├── peta-lab.tsx          # Peta laboratorium interaktif & aktivitas lab (Asisten)
    │   │   ├── moderasi-izin.tsx     # Panel moderasi izin berbantuan rekomendasi AI
    │   │   ├── rekap.tsx             # Rekapitulasi kehadiran kelas per sesi & status izin
    │   │   ├── mahasiswa.tsx         # Master Data Pengguna (CRUD Praktikan & Asisten)
    │   │   └── detail-sesi/[id].tsx  # Kontrol sesi (buka/tutup/buka kembali), kode 4 digit, QR & roster
    │   └── praktikan/
    │       ├── _layout.tsx           # Tab navigator praktikan (Jadwal, Presensi, Peta Lab, Izin, Riwayat)
    │       ├── jadwal.tsx            # Jadwal praktikum, filter kelas saya & status sesi
    │       ├── presensi.tsx          # Halaman Presensi Khusus (Geofencing + kode 4 digit / QR Code)
    │       ├── peta-lab.tsx          # Peta laboratorium interaktif, live user tracking & rute (Praktikan)
    │       ├── pengajuan-izin.tsx    # Formulir izin praktikum dengan analisis AI on-device
    │       ├── riwayat.tsx           # Riwayat kehadiran & persentase keaktifan pribadi
    │       └── detail-sesi/[id].tsx  # Detail sesi, materi modul & status kehadiran
    ├── components/                   # Komponen UI modular (DESIGN.md, Anti-Slop)
    │   ├── ai-category-badge.tsx     # Badge rekomendasi AI (Kategori & Tingkat Keyakinan)
    │   ├── confirmation-modal.tsx    # Dialog modal konfirmasi aksi & feedback
    │   ├── device-status-banner.tsx  # Banner kondisi perangkat (izin, GPS, notifikasi, jaringan)
    │   ├── empty-state.tsx           # Tampilan terstruktur saat data kosong
    │   ├── google-profile-modal.tsx  # Dialog kelengkapan profil pengguna baru Google Sign-In
    │   ├── lab-activity-sheet.tsx    # Panel detail aktivitas lab (sedang berlangsung & berikutnya)
    │   ├── lab-map-view.tsx          # Peta native Android/iOS (react-native-maps + rute polyline)
    │   ├── lab-map-view.web.tsx      # Fallback peta laboratorium interaktif untuk Web
    │   ├── leave-card.tsx            # Kartu antrean izin dengan rekomendasi AI & aksi moderasi
    │   ├── location-status-card.tsx  # Kartu status pemeriksaan radius geofencing pengguna
    │   ├── notification-bootstrap.tsx# Bootstrap listener push notification & FCM token sync
    │   ├── role-header.tsx           # Universal header dengan profil, tombol notifikasi & keluar
    │   ├── sesi-card.tsx             # Kartu jadwal sesi seragam
    │   ├── session-qr-code.tsx       # Generator QR Code sesi praktikum untuk asisten
    │   ├── status-badge.tsx          # Badge status sesi & kehadiran
    │   └── tab-icons.tsx             # Komponen ikon vektor murni untuk bottom navigation bar
    ├── context/
    │   ├── auth-context.tsx          # Manajemen sesi Firebase Auth & sinkronisasi profil user
    │   └── praktikum-context.tsx     # State runtime fallback & cache sesi
    ├── data/                         # Data dummy & tipe referensi awal
    ├── hooks/
    │   ├── use-device-resilience.ts  # Hook deteksi status izin lokasi, GPS, notifikasi & koneksi
    │   ├── use-notifications.ts      # Hook registrasi push token & listener respons notifikasi
    │   └── use-theme.ts              # Hook tema tampilan
    ├── lib/
    │   └── firebase.ts               # Inisialisasi Firebase App, Auth, Firestore & Google Client ID
    ├── services/
    │   ├── ai-service.ts             # Layanan klasifikasi AI On-Device EDOM (offline resilience)
    │   ├── attendance-service.ts     # Layanan validasi keras & pencatatan presensi geofencing
    │   ├── lab-activity-service.ts   # Layanan pemetaan aktivitas lab real-time (/labs + /sessions)
    │   ├── lab-service.ts            # Layanan CRUD lokasi laboratorium Cloud Firestore (/labs)
    │   ├── leave-service.ts          # Layanan CRUD pengajuan izin Cloud Firestore + trigger notif
    │   ├── location-service.ts       # Wrapper expo-location & kalkulasi jarak Haversine
    │   ├── notification-service.ts   # Layanan registrasi token, dispatcher event & /notifications
    │   ├── rich-notification-service.ts      # Layanan tampilan notifikasi rich Android/iOS
    │   ├── rich-notification-service.web.ts  # Stub/fallback rich notification untuk Web
    │   ├── route-service.ts          # Layanan rute jalan kaki (Google Routes API + fallback)
    │   └── session-service.ts        # Layanan CRUD jadwal sesi Cloud Firestore + trigger notif
    ├── types/
    │   └── praktikum.ts              # Kontrak antarmuka TypeScript terpadu
    └── utils/
        └── qr-payload.ts             # Pembentuk & parser payload QR Code presensi sesi
```

---

## 5. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau lebih baru (disarankan **Node 24.12.0** sesuai `eas.json`).
- **npm** (atau bun).
- Perangkat pengujian: ponsel fisik **Android** (untuk menguji APK / Development Build dengan GPS, Maps, Camera, Google Sign-In, & Push Notification) atau **Web Browser** modern (dengan fallback web untuk Maps).

### 1. Kloning & Pengaturan Dependensi
```bash
# Pastikan berada di direktori proyek
npm install
```

### 2. Pengaturan Variabel Lingkungan (`.env`) & `google-services.json`
Salin berkas template `.env.example` menjadi `.env` lokal:
```bash
cp .env.example .env
```
Seluruh konfigurasi `.env` asli dirahasiakan dan **tidak** disimpan di repository publik. Minta nilai asli dari koordinator tim lalu isi di `.env`:
```env
# Firebase Config
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789012-xxxx.apps.googleusercontent.com

# Google Maps SDK for Android & Routes API (react-native-maps)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

> [!IMPORTANT]
> **Berkas `google-services.json` Lokal (Wajib untuk Build Native Android):**  
> Karena file `google-services.json` diabaikan oleh `.gitignore`, unduh file resmi terbaru dari Firebase Console project `praktikum-ppk-labportal` (atau minta salinannya ke koordinator tim) dan letakkan di root folder proyek (`./google-services.json`). Pastikan file tersebut memiliki mapping `client_type: 1` (SHA-1 keystore Android) dan `client_type: 3` (Web Client ID).

### 3. Menjalankan Aplikasi di Mode Pengembangan (Expo Dev Server)
```bash
npx expo start
```
* **Web Browser:** Tekan tombol `w` di terminal atau buka `http://localhost:8081` di browser.
* **Android / iOS (Development Build):** Karena proyek menggunakan modul native (`react-native-maps`, `@react-native-firebase/*`, `@react-native-google-signin/google-signin`, `expo-location`, `expo-notifications`, `expo-camera`), gunakan **APK Preview** atau **Development Build** (`npx expo run:android` / `eas build`), bukan Expo Go standar.

### 4. Build Standalone Android APK (EAS Build)
Proyek ini terhubung dengan akun EAS `sanftts-team` (slug: `ppk-post-uts`) dan mendukung kompilasi cloud ke berkas `.apk` siap pasang tanpa memerlukan Android Studio lokal:
```bash
# Login ke akun Expo EAS tim
npx eas-cli login

# Mulai proses cloud build APK Android (profil preview)
npx eas-cli build -p android --profile preview
```

#### Tautan Build APK Terbaru (`sanftts-team` — Rilis Preview):
- **Halaman Pantau & Unduh Build EAS Terbaru:** [expo.dev/@sanftts-team/ppk-post-uts/builds/76b47c1d-1b80-46c3-90b6-7c93698159ab](https://expo.dev/accounts/sanftts-team/projects/ppk-post-uts/builds/76b47c1d-1b80-46c3-90b6-7c93698159ab)

> [!TIP]
> **Registrasi SHA-1 Fingerprint untuk Google Sign-In:**  
> Agar fitur Native Google Sign-In bekerja di APK Android tanpa error `DEVELOPER_ERROR`, kedua SHA-1 keystore berikut telah didaftarkan di **Firebase Console** -> **Project Settings** -> **Your Apps (Android `Praktikum.PPK_LabPortal`)**:
> - Keystore EAS `sanftts-team` (aktif): `65:EB:20:28:17:68:EC:C5:AA:82:D5:34:56:71:22:8E:08:68:32:49`
> - Keystore EAS lama (`gregoriusseptiano`): `58:3A:22:E2:5F:01:A3:82:E1:87:F2:8F:FB:F4:62:24:91:0F:7D:B2`

---

## 6. Pemeriksaan Kualitas & Standar Kode

Seluruh basis kode diverifikasi secara rutin dan wajib mempertahankan standar kualitas:

```bash
# 1. Pemeriksaan tipe data statis TypeScript (Harus 0 error)
npx tsc --noEmit

# 2. Pemeriksaan linter Expo / ESLint (Harus 0 error)
npx expo lint

# 3. Diagnostik kompatibilitas dependensi Expo SDK
npx expo-doctor
```

---

## 7. Status Integrasi & Kolaborasi Git

### A. Sprint 2 (Firebase, AI EDOM & Role Portal — Selesai & Terintegrasi)

| No | Modul / Fitur | Programmer Penanggung Jawab | Status Integrasi | Keterangan Hasil |
|---|---|:---:|:---:|---|
| 1 | **Autentikasi Multi-Metode** | Programmer 1 | **Selesai (100%)** | Email/Password & Native Google Sign-In aktif dengan role router guard. |
| 2 | **Master Sesi Firestore (CRUD)** | Programmer 1 | **Selesai (100%)** | Tambah, buka/tutup sesi real-time, generate 4 digit kode sesi unik. |
| 3 | **Presensi & Roster Real-Time** | Programmer 1 | **Selesai (100%)** | Validasi kelas, anti-duplikasi `${sessionId}_${studentId}`, live roster asisten. |
| 4 | **Persistensi Sesi & Token AsyncStorage** | Programmer 1 | **Selesai (100%)** | Token auth & profil user tersimpan permanen di perangkat, bebas re-login saat restart. |
| 5 | **Bottom Bar Safe Area & Vektor** | Programmer 1 | **Selesai (100%)** | Mengatasi missing icon & kompatibel dengan gesture navigation Android. |
| 6 | **Dukungan NIM Universal & Identitas Unik** | Programmer 1 | **Selesai (100%)** | NIM 14-digit divalidasi dan tersimpan untuk praktikan maupun asisten di Google Sign-In & Firestore. |
| 7 | **On-Device AI Engine (EDOM)** | Programmer 2 | **Selesai (100%)** | Klasifikasi sentimen & kategori alasan murni lokal (< 20ms, offline resilience). |
| 8 | **Formulir Pengajuan Izin & Layout Anti-Potong** | Programmer 2 | **Selesai (100%)** | Terhubung live Firestore `/leave_requests` dengan badge kuota sesi dan metadata AI terlampir rapi. |
| 9 | **Badge Rekomendasi AI** | Programmer 2 | **Selesai (100%)** | Tampilan label visual rapi sesuai token palet warna `DESIGN.md`. |
| 10 | **Panel Moderasi Izin Asisten** | Programmer 2 | **Selesai (100%)** | Review izin live dengan rekomendasi AI dan aksi Setujui / Tolak izin. |
| 11 | **Rekapitulasi Presensi & Izin** | Programmer 2 | **Selesai (100%)** | Mahasiswa izin berstatus disetujui tercatat resmi izin (bukan alpa). |
| 12 | **Proteksi Saling Kunci & Auto-Close Sesi 2 Jam** | Programmer 2 | **Selesai (100%)** | Sesi otomatis ditutup setelah 2 jam, serta isolasi dan pencegahan tumpang tindih izin & presensi. |

### B. Sprint 3 (Geofencing, Peta Lab Interaktif & Push Notification — Selesai & Terintegrasi di `main`)

| No | Modul / Fitur | Programmer Penanggung Jawab | Status Integrasi | Keterangan Hasil |
|---|---|:---:|:---:|---|
| 1 | **Halaman Presensi Khusus, QR & Hard-Validation Geofencing** | Programmer 1 | **Selesai (100%)** | Validasi jarak Haversine terhadap koordinat & radius `/labs` di `attendance-service.ts`, plus QR scanner (`expo-camera`). |
| 2 | **Manajemen Lokasi & Radius Laboratorium (`/labs`)** | Programmer 1 | **Selesai (100%)** | Asisten dapat mengatur koordinat & radius tiap laboratorium dan menautkan `labId` ke sesi. |
| 3 | **Peta Laboratorium Interaktif, Live Tracking & Rute** | Programmer 2 | **Selesai (100%)** | Peta `react-native-maps`, marker aktivitas real-time (`/labs` + `/sessions`), rute jalan kaki Google Routes API, & fallback web. |
| 4 | **Push Notification Berbasis Peristiwa (FCM/Expo)** | Programmer 3 | **Selesai (100%)** | Notifikasi real-time saat sesi dibuka/dimulai, jadwal berubah, dan izin diputuskan, plus Pusat Notifikasi `/notifications`. |
| 5 | **Ketahanan Izin, Kondisi Perangkat & Rules RBAC** | Programmer 3 | **Selesai (100%)** | Penanganan izin ditolak, GPS nonaktif, lokasi belum tersedia, mode offline (`NetInfo`), dan pembaruan `firestore.rules`. |

---

## 8. Panduan Skenario Pengujian (Demonstrasi Alur)

### Skenario 1: Alur Presensi Terintegrasi Real-Time & Geofencing
1. **Asisten Mengatur Lokasi & Membuka Sesi:** Masuk sebagai Asisten Lab -> buka tab **Lokasi** untuk memastikan koordinat & radius lab sesuai lokasi pengujian -> buka tab **Sesi** -> pilih sesi berstatus `Belum Dibuka` -> klik **Buka Sesi Praktikum** (status berubah menjadi `Dibuka`, kode numerik 4 digit & QR aktif).
2. **Praktikan Melakukan Presensi Geofencing:** Beralih ke peran Praktikan -> buka tab **Presensi** -> pastikan kartu status lokasi menampilkan jarak di dalam radius laboratorium (`within_radius`) -> masukkan 4 digit kode sesi (atau pindai QR Code) -> klik **Kirim Presensi Hadir**. Jika di luar radius, presensi otomatis ditolak di `attendance-service.ts`.
3. **Asisten Memantau Rekap & Menutup Sesi:** Kembali ke peran Asisten -> buka detail sesi -> nama praktikan langsung tercatat **Hadir** lengkap dengan jam dan snapshot lokasi -> tekan **Tutup Sesi Praktikum** untuk mengunci sesi.

### Skenario 2: Alur Pengajuan Izin Berbantuan AI
1. **Praktikan Mengajukan Izin:** Praktikan membuka tab **Izin** -> memilih sesi praktikum -> mengisi alasan ketidakhadiran (misal: sakit demam).
2. **AI Mengklasifikasikan Alasan:** Sistem mengeksekusi model sentimen EDOM lokal on-device -> model AI mengklasifikasikan kategori (`Sakit`) dan confidence score -> data tersimpan di koleksi `/leave_requests` berstatus `menunggu`.
3. **Asisten Melakukan Moderasi:** Asisten membuka tab **Izin** -> melihat pengajuan izin beserta kartu rekomendasi AI -> menekan **Setujui Izin** (atau **Tolak**).
4. **Praktikan Menerima Hasil & Notifikasi:** Status pengajuan langsung terbarui real-time menjadi **Izin Disetujui** dan notifikasi masuk ke Pusat Notifikasi praktikan.

### Skenario 3: Peta Laboratorium Interaktif & Rute Jalan Kaki
1. Buka tab **Peta Lab** di portal Praktikan maupun Asisten -> seluruh marker laboratorium Informatika tampil bersama posisi pengguna secara langsung (*live tracking*).
2. Ketuk salah satu marker laboratorium -> lingkaran radius dan panel `LabActivitySheet` menampilkan praktikum yang **Sedang Berlangsung** dan **Berikutnya** secara real-time, serta tombol rute jalan kaki menuju lab tersebut.

### Skenario 4: Pengujian Persistensi Sesi & Ketahanan Perangkat
1. **Cold-Start:** Masuk ke akun via Email/Password atau Google Sign-In, tutup paksa aplikasi (*Kill App*), lalu buka kembali -> aplikasi langsung masuk ke portal sesuai peran tanpa login ulang.
2. **Device Resilience:** Uji mematikan GPS, menolak izin lokasi/notifikasi, atau memutus koneksi internet -> `DeviceStatusBanner` dan `LocationStatusCard` menampilkan pesan status yang jelas serta tombol **Buka Pengaturan** tanpa menyebabkan aplikasi crash.
