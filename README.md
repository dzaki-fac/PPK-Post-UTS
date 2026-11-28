# LabPortal — Sistem Presensi Geofencing, Peta Lab, Sesi & Moderasi Izin Praktikum

> **Praktikum Pengembangan Platform Khusus (PPK)**  
> **Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)**  
> Dibangun dengan **React Native**, **Expo SDK 57**, dan **Expo Router**. Mendukung **Android (EAS Build APK / Development Build)**, **iOS**, dan **Web Browser**.

---

## 1. Peta Dokumentasi Proyek

Untuk mempermudah pemahaman arsitektur dan kolaborasi pengembang, dokumentasi proyek dibagi secara modular:

| Berkas | Fokus Utama | Tautan |
|---|---|:---:|
| **`DESIGN.md`** | **Single Source of Truth Desain:** Token warna resmi 3 peran (`#EA580C`, `#0D9488`, `#4F46E5`), navbar 2 baris responsif, ukuran seragam pill `← Kembali ...`, kontrol peta rapi, serta larangan emoji & titik bulat status dekoratif (*anti-slop*). | [Baca DESIGN.md](./DESIGN.md) |
| **`SRS.md`** | **Spesifikasi Kebutuhan Sprint 1:** Antarmuka, tata letak Flexbox, navigasi Expo Router, simulasi alur asisten & praktikan, serta state runtime in-memory. | [Baca SRS.md](./SRS.md) |
| **`SRS2.md`** | **Spesifikasi Kebutuhan Sprint 2:** Integrasi Firebase Authentication multi-metode, Cloud Firestore real-time, modul pengajuan izin, klasifikasi AI Model EDOM, dan pembagian tugas 2 programmer. | [Baca SRS2.md](./SRS2.md) |
| **`SRS3.md`** | **Spesifikasi Kebutuhan Sprint 3:** Validasi lokasi presensi (*geofencing*) & QR Code, pengelolaan koordinat lab, peta laboratorium interaktif + live tracking & rute, push notification berbasis peristiwa, serta ketahanan perangkat. | [Baca SRS3.md](./SRS3.md) |
| **`SRS4.md`** | **Spesifikasi Kebutuhan Sprint 4:** Pemisahan peran **Aslab** & **Asprak**, 3 alur *bulk/single insert* terpisah (lab, praktikan, asprak) + template & daftar tinjauan, pemindahan anggota, dashboard keberlangsungan lab, keterlambatan (*grace period*) & denda tetap, integrasi **Midtrans Sandbox** via backend tepercaya, serta notifikasi & riwayat pembayaran. | [Baca SRS4.md](./SRS4.md) |
| **`firestore.rules`** | **Aturan Keamanan Database:** Role-Based Access Control (RBAC) resmi Cloud Firestore yang melindungi koleksi `/users`, `/sessions`, `/attendances`, `/leave_requests`, `/labs`, `/notifications`, dan `/system_health`. | [Baca firestore.rules](./firestore.rules) |

---

## 2. Ikhtisar Proyek

**PPK LabPortal** adalah aplikasi operasional laboratorium praktikum modern yang mengintegrasikan pencatatan kehadiran presensi mandiri berbasis lokasi (*geofencing*), pemetaan aktivitas laboratorium secara real-time, manajemen jadwal sesi, notifikasi berbasis peristiwa (*push notification*), serta moderasi izin ketidakhadiran berbantuan kecerdasan buatan (*Artificial Intelligence*).

Aplikasi dirancang secara adaptif dari perspektif peran pengguna:
1. **Praktikan (Mahasiswa Informatika):** Memantau jadwal praktikum, melakukan presensi di halaman khusus dengan validasi radius lokasi laboratorium (kode 4 digit atau QR Code), melihat peta persebaran laboratorium dan aktivitas praktikum real-time beserta rute jalan kaki, menerima notifikasi saat sesi dibuka/diubah atau izin diputuskan, mengajukan izin jika berhalangan hadir, serta memeriksa rekap riwayat kehadiran dan tagihan/pembayaran denda keterlambatan *(Sprint 4)*.
2. **Asisten Praktikum / Asprak (d/h Asisten Laboratorium):** Menjalankan operasional sesi praktikum pada laboratorium yang menjadi tanggung jawabnya — membuka/menutup sesi real-time (termasuk kode 4 digit & QR sesi), memantau dan mengelola presensi roster kelas, serta meninjau rekomendasi AI dan mengambil keputusan persetujuan izin ketidakhadiran.
3. **Asisten Laboratorium / Aslab *(Sprint 4 — Terintegrasi)*:** Mengelola laboratorium per mata kuliah (lokasi, koordinat, radius, *grace period*, nominal denda), melakukan tiga alur *bulk/single insert* terpisah (lab, praktikan, asprak) beserta template unduhan, memindahkan praktikan/asprak antar laboratorium, menjadwalkan sesi, serta memantau dashboard keberlangsungan laboratorium dan riwayat keuangan denda.

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
* **Peta Laboratorium Hybrid & Aktivitas Real-Time (`src/app/praktikan/peta-lab.tsx`, `src/app/asisten/peta-lab.tsx`, `src/app/aslab/peta-lab.tsx`):** Menampilkan peta interaktif berbasis `<WebView>` (Android/iOS) & `<iframe>` (Web) melalui generator bersama `src/utils/leaflet-map-html.ts` — mencoba **Google Maps JS API** terlebih dahulu lalu otomatis *fallback* ke **Leaflet** multi-CDN & multi-tile (**OpenStreetMap → CARTO Voyager → Satelit Esri**) bila tidak ada billing / kuota Demo Key habis / dibatasi jaringan. Dilengkapi marker status tiap lab, lingkaran radius khusus lab terpilih, *live tracking* GPS pengguna (`Aktif` / `Mencari`), tombol kontrol ringkas `Lokasi Saya` & `Fokus Lab` di pojok kanan atas, estimasi rute jalan kaki (`src/services/route-service.ts`), dan sheet info praktikum *sedang berlangsung* & *berikutnya* (`src/services/lab-activity-service.ts`).
* **Push Notification Berbasis Peristiwa & Pusat Notifikasi (`src/app/notifikasi.tsx`):** Menggunakan Firebase Cloud Messaging (`@react-native-firebase/app`, `@react-native-firebase/messaging`) dan `expo-notifications` untuk mengirim notifikasi saat sesi dibuka/dimulai, jadwal diubah, atau izin disetujui/ditolak, sekaligus mencatat riwayat real-time di `/notifications`.
* **Ketahanan Izin & Kondisi Perangkat (`src/hooks/use-device-resilience.ts`, `src/components/device-status-banner.tsx`):** Penanganan terpadu saat izin lokasi/notifikasi ditolak, layanan GPS nonaktif, lokasi belum tersedia, atau perangkat offline (`@react-native-community/netinfo`), lengkap dengan tombol pintasan buka pengaturan perangkat.

### D. Manajemen Lab Aslab, Dashboard, Denda & Midtrans Sandbox (Sprint 4 — Spesifikasi `SRS4.md`)
* **Manajemen Laboratorium oleh Aslab (`feature/sprint4-aslab-lab-management`):** Peran baru `aslab`, tiga alur *bulk/single insert* terpisah (laboratorium per mata kuliah, praktikan ke lab, asprak ke lab) dengan template `.csv`/`.xlsx` dan daftar tinjauan scroll fleksibel (*accept/deny/edit/isi kosong*), pemindahan anggota antar lab tanpa memindahkan jadwal, serta pengaturan radius & batas keterlambatan (*grace period*).
* **Dashboard Lab & Sesi Asprak (`feature/sprint4-dashboard-asprak-session`):** Dashboard keberlangsungan laboratorium dengan filter Hari/Minggu/Bulan dari Firestore, pengelolaan jadwal oleh Aslab, portal Asprak terfokus pada lab yang diampu, pencatatan izin sebagai *excused absence* (bebas denda), dan finalisasi UI lintas peran.
* **Keterlambatan, Denda & Midtrans Sandbox (`feature/sprint4-midtrans-fines-payment`):** Perhitungan keterlambatan berbasis *grace period*, penerbitan satu tagihan nominal tetap per kejadian (`fines/{attendanceId}`), integrasi pembayaran **Midtrans Sandbox** melalui backend tepercaya + verifikasi webhook (tanpa menyimpan *secret key* di aplikasi), notifikasi tagihan/pembayaran, serta riwayat pembayaran persisten.

---

## 4. Struktur Proyek

```
PPK-Post-UTS/
├── DESIGN.md                         # Sumber kebenaran sistem desain resmi
├── SRS.md                            # Spesifikasi kebutuhan Sprint 1
├── SRS2.md                           # Spesifikasi kebutuhan Sprint 2 (Firebase, AI & Matriks Tim)
├── SRS3.md                           # Spesifikasi kebutuhan Sprint 3 (Geofencing, Maps, Push & Resilience)
├── SRS4.md                           # Spesifikasi kebutuhan Sprint 4 (Aslab, Dashboard, Denda & Midtrans)
├── README.md                         # Dokumentasi utama proyek
├── .env.example                      # Template variabel lingkungan (.env) untuk tim
├── .easignore                        # Berkas yang dikecualikan dari unggahan EAS Build
├── eas.json                          # Konfigurasi profil build EAS (preview APK dengan credentialsSource local)
├── app.json                          # Konfigurasi Expo (owner bedoprabo, package Praktikum.PPK_LabPortal, plugins)
├── app.config.ts                     # Konfigurasi dinamis Maps API Key & google-services.json
├── google-services.json              # Konfigurasi Firebase Android (lokal/git-ignored, wajib ada saat build)
├── credentials.json                  # Konfigurasi keystore lokal Android untuk EAS Build (git-ignored)
├── .firebaserc                       # Konfigurasi project ID Firebase CLI (praktikum-ppk-labportal)
├── firebase.json                     # Konfigurasi rilis layanan Firebase
├── firestore.rules                   # Aturan keamanan database Cloud Firestore (RBAC)
├── firestore.indexes.json            # Pengaturan indeks komposit Firestore
├── package.json                      # Dependensi proyek (Expo SDK 57, Firebase v13, Maps, Camera, FCM)
├── tsconfig.json                     # Konfigurasi TypeScript strict
├── ai/                               # On-Device AI Engine (Model EDOM Resmi)
│   ├── model-edom.json               # Bobot kamus sentimen & leksikon model EDOM
│   └── sentiment.js                  # Pure JavaScript inference engine (< 20ms, 100% offline)
├── functions/                        # Backend Tepercaya Express + Firebase Admin (Node 20 + TS)
│   ├── vercel.json                   # Konfigurasi deploy serverless Vercel
│   ├── package.json                  # Dependensi backend & skrip build/start
│   ├── README.md                     # Panduan setup env & uji manual keamanan webhook
│   └── src/
│       ├── config.ts                 # Inisialisasi Admin SDK & env Midtrans Sandbox
│       ├── index.ts                  # Server Express (/health, /api/attendances/*, /api/payments/*)
│       ├── lateness.ts               # Evaluasi keterlambatan server & penerbitan fines/{attendanceId}
│       ├── midtrans.ts               # Klien Snap API, Status API, & verifikasi SHA-512
│       ├── notify.ts                 # Dispatcher Expo Push API & log /notifications
│       ├── payments.ts               # Transaksi Snap, rekonsiliasi & penutupan pending kedaluwarsa
│       └── webhook.ts                # Handler POST webhook Midtrans + idempotensi payment_events
├── scripts/
│   └── seed-sprint4.ts               # Seed mata kuliah PPK, lab contoh, dan akun Aslab
└── src/
    ├── app/                          # Expo Router (File-based routing)
    │   ├── _layout.tsx               # Root layout dengan safe-area, web title & NotificationBootstrap
    │   ├── index.tsx                 # Halaman portal landing & redirect role guard
    │   ├── login.tsx                 # Layar Masuk (Email & Password + Native Google Sign-In)
    │   ├── register.tsx              # Layar Daftar Baru (Praktikan / Asprak Lab)
    │   ├── notifikasi.tsx            # Pusat Notifikasi in-app real-time (/notifications)
    │   ├── test-ai.tsx               # Layar uji coba klasifikasi AI EDOM
    │   ├── aslab/                    # Portal Asisten Laboratorium (Aksen Indigo #4F46E5)
    │   │   ├── _layout.tsx           # Tab navigator Aslab (5 tab utama + 5 rute tersembunyi)
    │   │   ├── dashboard.tsx         # Dashboard keberlangsungan lab, filter periode & keuangan
    │   │   ├── jadwal.tsx            # CRUD jadwal sesi lab dengan startAt & labId wajib
    │   │   ├── laboratorium.tsx      # Manajemen lab per mata kuliah (radius, grace period, denda)
    │   │   ├── anggota.tsx           # Daftar anggota per lab (Praktikan & Asprak)
    │   │   ├── impor-lab.tsx         # Bulk/single insert laboratorium + Generator Cepat & template
    │   │   ├── impor-praktikan.tsx   # Bulk/single insert praktikan ke lab + deteksi konflik NIM
    │   │   ├── impor-asprak.tsx      # Bulk/single insert asprak ke lab + template
    │   │   ├── pindah-anggota.tsx    # Pemindahan praktikan/asprak antar lab (tanpa pindah jadwal)
    │   │   ├── peta-lab.tsx          # Peta laboratorium interaktif aksen Indigo
    │   │   └── notifikasi.tsx        # Shortcut Pusat Notifikasi di portal Aslab
    │   ├── asisten/                  # Portal Asprak (legacy path, aksen Teal #0D9488)
    │   │   ├── _layout.tsx           # Tab navigator Asprak terfokus (lokasi-lab disembunyikan)
    │   │   ├── jadwal.tsx            # Sesi praktikum khusus lab yang diampu (buka/tutup real-time)
    │   │   ├── lokasi-lab.tsx        # Keterangan pemindahan konfigurasi lab ke Portal Aslab
    │   │   ├── peta-lab.tsx          # Peta laboratorium interaktif & aktivitas lab (Asprak)
    │   │   ├── moderasi-izin.tsx     # Panel moderasi izin (excused absence, bebas denda)
    │   │   ├── rekap.tsx             # Rekapitulasi kehadiran kelas & keterlambatan/izin
    │   │   ├── mahasiswa.tsx         # Kelas Saya (daftar anggota lab yang diampu, baca saja)
    │   │   └── detail-sesi/[id].tsx  # Buka/tutup sesi (startedAt), kode 4 digit, QR, roster & manual
    │   └── praktikan/
    │       ├── _layout.tsx           # Tab navigator praktikan (Jadwal, Presensi, Peta, Izin, Riwayat, Tagihan)
    │       ├── jadwal.tsx            # Jadwal praktikum lab/kelas saya & sinkronisasi real-time
    │       ├── presensi.tsx          # Halaman Presensi (Geofencing, QR/kode, evaluasi terlambat & blokir izin)
    │       ├── peta-lab.tsx          # Peta laboratorium interaktif, live tracking & rute (Praktikan)
    │       ├── pengajuan-izin.tsx    # Formulir izin praktikum dengan analisis AI on-device
    │       ├── riwayat.tsx           # Riwayat kehadiran (Hadir/Terlambat/Izin) & izin
    │       ├── tagihan.tsx           # Daftar tagihan denda keterlambatan & metrik nominal
    │       ├── tagihan/[id].tsx      # Rincian tagihan, riwayat percobaan & bayar via Midtrans Snap
    │       ├── pembayaran-hasil.tsx  # Pemantauan verifikasi status pembayaran real-time & Coba Lagi
    │       ├── riwayat-pembayaran.tsx# Riwayat transaksi Midtrans persisten (cache AsyncStorage)
    │       └── detail-sesi/[id].tsx  # Detail sesi, materi modul & status kehadiran
    ├── components/                   # Komponen UI modular (DESIGN.md, Anti-Slop)
    │   ├── ai-category-badge.tsx     # Badge rekomendasi AI (Kategori & Tingkat Keyakinan)
    │   ├── attendance-roster.tsx     # Roster presensi Hadir/Terlambat/Izin/Belum Hadir & entri manual
    │   ├── confirmation-modal.tsx    # Dialog modal konfirmasi aksi & feedback
    │   ├── dashboard/                # Kartu status lab & filter periode Hari/Minggu/Bulan
    │   ├── device-status-banner.tsx  # Banner kondisi perangkat (izin, GPS, notifikasi, jaringan)
    │   ├── empty-state.tsx           # Tampilan terstruktur saat data kosong
    │   ├── google-profile-modal.tsx  # Dialog kelengkapan profil pengguna baru Google Sign-In
    │   ├── import-review-list.tsx    # Daftar tinjauan impor interaktif per baris
    │   ├── lab-activity-sheet.tsx    # Panel detail aktivitas lab (sedang berlangsung & berikutnya)
    │   ├── lab-map-view.tsx          # Peta WebView Android/iOS (hybrid Google Maps JS + Leaflet & rute polyline)
    │   ├── lab-map-view.web.tsx      # Peta iframe Web (hybrid Google Maps JS + auto-fallback multi-tile Leaflet)
    │   ├── leave-card.tsx            # Kartu antrean izin dengan rekomendasi AI & aksi moderasi
    │   ├── location-status-card.tsx  # Kartu status pemeriksaan radius geofencing pengguna
    │   ├── metrics-grid.tsx          # Komponen kartu metrik ringkasan standar DESIGN.md
    │   ├── notification-bootstrap.tsx# Bootstrap listener push notification & FCM token sync
    │   ├── role-header.tsx           # Universal header 3 peran (PRAKTIKAN / ASPRAK / ASLAB)
    │   ├── sesi-card.tsx             # Kartu jadwal sesi seragam
    │   ├── session-qr-code.tsx       # Generator QR Code sesi praktikum
    │   ├── status-badge.tsx          # Badge status sesi, presensi, izin, denda & pembayaran
    │   └── tab-icons.tsx             # Komponen ikon vektor murni untuk bottom navigation bar
    ├── constants/
    │   ├── praktikum-config.ts       # Default radius (50m), grace (15m), denda (Rp 10.000), WIB
    │   └── theme.ts                  # Token tema 3 peran (termasuk Aslab Indigo #4F46E5)
    ├── context/
    │   ├── auth-context.tsx          # Manajemen sesi Firebase Auth, 3 peran & member linking
    │   └── praktikum-context.tsx     # State runtime fallback & cache sesi
    ├── data/                         # Data dummy & tipe referensi awal
    ├── hooks/
    │   ├── use-device-resilience.ts  # Hook deteksi status izin lokasi, GPS, notifikasi & koneksi
    │   ├── use-import-draft.ts       # Hook manajemen draf, validasi & aksi massal impor
    │   ├── use-notifications.ts      # Hook registrasi push token & routing notifikasi
    │   └── use-theme.ts              # Hook tema tampilan
    ├── lib/
    │   └── firebase.ts               # Inisialisasi Firebase App, Auth, Firestore & Google Client ID
    ├── services/
    │   ├── ai-service.ts             # Layanan klasifikasi AI On-Device EDOM (offline resilience)
    │   ├── attendance-admin-service.ts# Layanan entri presensi manual oleh Asprak
    │   ├── attendance-service.ts     # Layanan validasi keras, geofencing & evaluasi keterlambatan
    │   ├── course-service.ts         # Layanan mata kuliah (/courses)
    │   ├── dashboard-service.ts      # Agregasi real-time dashboard lab, kegiatan & keuangan
    │   ├── import-parser.ts          # Parser berkas .csv (papaparse) dan .xlsx (SheetJS)
    │   ├── import-template-service.ts# Generator & pengunduh template .csv / .xlsx per alur impor
    │   ├── lab-activity-service.ts   # Layanan pemetaan aktivitas lab real-time (/labs + /sessions)
    │   ├── lab-import-service.ts     # Validasi & penyimpanan batch impor laboratorium
    │   ├── lab-member-service.ts     # CRUD anggota lab, penautan login & pemindahan lab
    │   ├── lab-service.ts            # Layanan CRUD lokasi, radius, grace & denda lab (/labs)
    │   ├── leave-service.ts          # Layanan pengajuan & moderasi izin + catatan attendance 'izin'
    │   ├── location-service.ts       # Wrapper expo-location & kalkulasi jarak Haversine
    │   ├── member-import-service.ts  # Validasi & penyimpanan impor praktikan dan asprak terpisah
    │   ├── notification-service.ts   # Layanan registrasi token, dispatcher event & /notifications
    │   ├── payment-service.ts        # Klien API pembayaran Midtrans & listener /fines + /payments
    │   ├── rich-notification-service.ts      # Layanan tampilan notifikasi rich Android/iOS
    │   ├── rich-notification-service.web.ts  # Stub/fallback rich notification untuk Web
    │   ├── route-service.ts          # Layanan rute jalan kaki (Google Routes API + fallback)
    │   └── session-service.ts        # Layanan CRUD jadwal sesi & startedAt (WIB -> UTC)
    ├── types/
    │   └── praktikum.ts              # Kontrak antarmuka TypeScript terpadu Sprint 1-4
    └── utils/
        ├── format.ts                 # Format Rupiah (formatRupiah) & normalisasi teks
        ├── lateness.ts               # Evaluasi keterlambatan presensi murni (evaluateLateness)
        ├── leaflet-map-html.ts       # Generator HTML peta hybrid (Google Maps JS API -> multi-tile Leaflet)
        ├── qr-payload.ts             # Pembentuk & parser payload QR Code presensi sesi
        ├── role.ts                   # Normalisasi 3 peran (normalizeRole, getHomeRouteByRole)
        └── wib.ts                    # Parsing & pemformatan waktu WIB + rentang periode dashboard
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

# Google Maps JS API / Routes API (opsional set EXPO_PUBLIC_USE_GOOGLE_MAPS=false untuk langsung Leaflet)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# Backend Pembayaran & Evaluasi Keterlambatan (Express / Vercel)
# Jangan pernah menyimpan MIDTRANS_SERVER_KEY di sini
EXPO_PUBLIC_PAYMENT_API_URL=https://ppk-labportal-backend.vercel.app
```

Untuk menjalankan backend secara lokal (bila tidak memakai deployment Vercel), salin `functions/.env.example` menjadi `functions/.env` dan lengkapi `MIDTRANS_SERVER_KEY` (Sandbox) beserta kredensial Service Account Firebase Admin (lihat [functions/README.md](./functions/README.md)).

> [!IMPORTANT]
> **Berkas `google-services.json` Lokal (Wajib untuk Build Native Android):**  
> Karena file `google-services.json` diabaikan oleh `.gitignore`, unduh file resmi terbaru dari Firebase Console project `praktikum-ppk-labportal` (atau minta salinannya ke koordinator tim) dan letakkan di root folder proyek (`./google-services.json`). Pastikan file tersebut memiliki mapping `client_type: 1` (SHA-1 keystore Android) dan `client_type: 3` (Web Client ID).

### 3. Menjalankan Aplikasi di Mode Pengembangan (Expo Dev Server)
```bash
npx expo start
```
* **Web Browser:** Tekan tombol `w` di terminal atau buka `http://localhost:8081` di browser.
* **Android / iOS (Development Build):** Karena proyek menggunakan modul native (`react-native-webview`, `@react-native-firebase/*`, `@react-native-google-signin/google-signin`, `expo-location`, `expo-notifications`, `expo-camera`), gunakan **APK Preview** atau **Development Build** (`npx expo run:android` / `eas build`), bukan Expo Go standar.

### 4. Build Standalone Android APK (EAS Build)
Proyek ini terhubung dengan akun EAS `bedoprabo` (project ID `c322811a-1263-4056-9949-b704adbb016b`, slug `ppk-post-uts`) menggunakan keystore Android lokal terkonfigurasi di `credentials.json` (`credentialsSource: "local"` pada profil `preview`):
```bash
# Login ke akun Expo EAS
npx eas-cli@latest login

# Mulai proses cloud build APK Android (profil preview)
npx eas-cli@latest build -p android --profile preview
```

#### Tautan Build APK Terbaru (`bedoprabo` — Rilis Preview):
- **Build ID Sebelumnya (27 Nov 2026):** [expo.dev/@bedoprabo/ppk-post-uts/builds/8a6f27b5-6e08-4d37-8b4a-4aebee8b55b8](https://expo.dev/accounts/bedoprabo/projects/ppk-post-uts/builds/8a6f27b5-6e08-4d37-8b4a-4aebee8b55b8)
- **Tautan Unduhan APK Sebelumnya:** [Download LabPortal (WsBfzNrN... .apk)](https://expo.dev/artifacts/eas/WsBfzNrN2-6QYbgICUkDSD62xQ3YFthpyb2q4OThB0A.apk)

> [!TIP]
> **Registrasi SHA-1 Fingerprint untuk Google Sign-In:**  
> Pastikan SHA-1 keystore rilis terdaftar di **Firebase Console** -> **Project Settings** -> **Your Apps (Android `Praktikum.PPK_LabPortal`)** agar fitur Native Google Sign-In berjalan di APK Android tanpa error `DEVELOPER_ERROR`:
> - Keystore lokal `bedoprabo` (`bedoprabo-release.jks`, aktif): `5B:21:98:F1:EC:18:CE:C7:AE:2E:CC:54:A6:79:4B:93:0E:8B:5A:AE`
> - Keystore EAS `gregoriusseptiano` (sebelumnya): `48:EE:A2:2D:40:10:33:58:39:93:C1:43:5E:13:D8:82:D7:4A:3F:16`
> - Keystore tambahan terdaftar: `58:3A:22:E2:5F:01:A3:82:E1:87:F2:8F:FB:F4:62:24:91:0F:7D:B2` & `65:EB:20:28:17:68:EC:C5:AA:82:D5:34:56:71:22:8E:08:68:32:49`

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

# 4. Build backend Express + Firebase Admin (Node 20 + TypeScript)
npm --prefix functions run build
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
| 12 | **Proteksi Saling Kunci & Auto-Close Sesi 2 Jam** | Programmer 2 | **Selesai (100%)** | Sesi otomatis ditutup setelah jadwal selesai / 2 jam sejak `openedAt` (khusus sesi yang dibuka setelah jam jadwal selesai, diberi durasi 2 jam dari `openedAt` agar presensi susulan/uji coba tetap berjalan), serta pencegahan tumpang tindih izin & presensi. |

### B. Sprint 3 (Geofencing, Peta Lab Interaktif & Push Notification — Selesai & Terintegrasi di `main`)

| No | Modul / Fitur | Programmer Penanggung Jawab | Status Integrasi | Keterangan Hasil |
|---|---|:---:|:---:|---|
| 1 | **Halaman Presensi Khusus, QR & Hard-Validation Geofencing** | Programmer 1 | **Selesai (100%)** | Validasi jarak Haversine terhadap koordinat & radius `/labs` di `attendance-service.ts`, plus QR scanner (`expo-camera`). |
| 2 | **Manajemen Lokasi & Radius Laboratorium (`/labs`)** | Programmer 1 | **Selesai (100%)** | Asisten dapat mengatur koordinat & radius tiap laboratorium dan menautkan `labId` ke sesi. |
| 3 | **Peta Laboratorium Hybrid, Live Tracking & Rute** | Programmer 2 | **Selesai (100%)** | Peta hybrid WebView/iframe (`leaflet-map-html.ts`: Google Maps JS API → auto-fallback multi-tile Leaflet OSM/CARTO/Esri), marker aktivitas real-time (`/labs` + `/sessions`), 1 lingkaran radius lab terpilih, dan rute jalan kaki Google Routes API. |
| 4 | **Push Notification Berbasis Peristiwa (FCM/Expo)** | Programmer 3 | **Selesai (100%)** | Notifikasi real-time saat sesi dibuka/dimulai, jadwal berubah, dan izin diputuskan, plus Pusat Notifikasi `/notifications`. |
| 5 | **Ketahanan Izin, Kondisi Perangkat & Rules RBAC** | Programmer 3 | **Selesai (100%)** | Penanganan izin ditolak, GPS nonaktif, lokasi belum tersedia, mode offline (`NetInfo`), dan pembaruan `firestore.rules`. |

### C. Sprint 4 (Aslab, Dashboard Lab, Denda & Midtrans Sandbox — Selesai & Terintegrasi di `main`)

| No | Modul / Fitur | Programmer Penanggung Jawab | Branch Git | Status | Keterangan Hasil |
|---|---|:---:|---|:---:|---|
| 1 | **Peran Aslab, Manajemen Lab, 3 Alur Impor Terpisah & Pemindahan Anggota** | Programmer 1 | `feature/sprint4-aslab-lab-management` | **Selesai (100%)** | Stage 0 kontrak tipe/util/rules, CRUD lab (+radius, grace & denda), 3 alur bulk/single insert + template + review list, penautan saat login, dan pindah anggota tanpa pindah jadwal. |
| 2 | **Dashboard Keberlangsungan Lab, Jadwal Aslab, Portal Asprak & Finalisasi UI** | Programmer 2 | `feature/sprint4-dashboard-asprak-session` | **Selesai (100%)** | Dashboard filter Hari/Minggu/Bulan, jadwal Aslab (`startAt`), portal Asprak terfokus (`startedAt`), izin *excused absence*, roster presensi/manual, dan finalisasi `DESIGN.md`. |
| 3 | **Backend Tepercaya, Denda Keterlambatan, Midtrans Sandbox & Notifikasi Bayar** | Programmer 3 | `feature/sprint4-midtrans-fines-payment` | **Selesai (100%)** | Perhitungan telat *grace period*, 1 tagihan/kejadian (`fines/{attendanceId}`), Snap + verifikasi webhook SHA-512 + Status API di backend `functions/` (Vercel), UI tagihan/riwayat persisten, dan notifikasi pembayaran. |

---

## 8. Panduan Skenario Pengujian (Demonstrasi Alur)

### Skenario 1: Alur Presensi Terintegrasi Real-Time & Geofencing
1. **Aslab Mengatur Lokasi Lab & Asprak Membuka Sesi:** Masuk sebagai Aslab (`aslab.ppk@if.undip.ac.id`) bila perlu mengubah koordinat/radius lab di tab **Lab** atau menjadwalkan sesi di tab **Sesi** -> masuk sebagai Asprak -> buka tab **Sesi** -> pilih sesi berstatus `Belum Dibuka` pada lab yang sesuai -> klik **Buka Sesi Praktikum** (status berubah menjadi `Dibuka`, kode numerik 4 digit & QR aktif).
2. **Praktikan Melakukan Presensi Geofencing:** Beralih ke peran Praktikan yang terdaftar pada **lab yang sama** (terlihat pada badge `Lab Terdaftar` di tab Jadwal) -> buka tab **Presensi** -> pastikan kartu status lokasi menampilkan jarak di dalam radius laboratorium (`within_radius`) -> masukkan 4 digit kode sesi (atau pindai QR Code) -> klik **Kirim Presensi Hadir**. Jika di luar radius, presensi otomatis ditolak di `attendance-service.ts`.
3. **Asprak Memantau Rekap & Menutup Sesi:** Kembali ke peran Asprak -> buka detail sesi -> nama praktikan langsung tercatat **Hadir** (atau **Terlambat** beserta tagihan denda bila melewati *grace period*) lengkap dengan jam dan snapshot lokasi -> tekan **Tutup Sesi Praktikum** untuk mengunci sesi.

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

### Skenario 5: Alur Sprint 4 — Lab Aslab, Dashboard, Denda Keterlambatan & Pembayaran Midtrans Sandbox
1. **Setup Lab & Impor oleh Aslab:** Aslab login -> buka tab **Lab** atau **Impor Lab/Praktikan/Asprak** untuk mengelola lab (radius, *grace period*, nominal denda) dan memindahkan anggota antar lab tanpa mengubah jadwal.
2. **Sesi Asprak & Dashboard Aslab:** Aslab membuat sesi -> Asprak membuka sesi (`startedAt` tercatat sekali) dan memoderasi izin (*excused absence*, bebas denda) -> Aslab memantau status lab, jadwal, dan riwayat keuangan dengan filter Hari/Minggu/Bulan di **Dashboard**.
3. **Keterlambatan & Pembayaran Midtrans Sandbox:** Praktikan melakukan presensi setelah batas *grace period* -> status tercatat `Terlambat` dan tepat satu tagihan `fines/{attendanceId}` terbit -> praktikan membuka tab **Tagihan**, menekan **Bayar Sekarang**, dan menyelesaikan pembayaran lewat **Midtrans Sandbox Simulator** -> webhook backend memverifikasi status menjadi **Lunas** (sementara status presensi tetap `Terlambat`) dan transaksi tercatat permanen di **Riwayat Pembayaran**.
