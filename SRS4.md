# SRS — Software Requirements Specification (Sprint 4)
## Manajemen Laboratorium oleh Aslab, Dashboard Keberlangsungan Lab, Pengelolaan Sesi Asprak, Denda Keterlambatan, dan Integrasi Pembayaran Midtrans

**Nama Aplikasi:** PPK LabPortal — Sistem Presensi, Pengelolaan Sesi, Manajemen Laboratorium & Pembayaran Denda Praktikum  
**Institusi:** Departemen Informatika, Fakultas Sains dan Matematika, Universitas Diponegoro (UNDIP)  
**Mata Kuliah / Praktikum:** Praktikum Pengembangan Platform Khusus (PPK)  
**Fokus Pengembangan:** Pemisahan peran **Aslab** (pengelola laboratorium) dan **Asprak** (pelaksana sesi), manajemen laboratorium berbasis mata kuliah dengan tiga alur *bulk / single insert* terpisah (laboratorium, praktikan, asprak) beserta template unduhan dan daftar tinjauan fleksibel, dashboard keberlangsungan laboratorium, perhitungan keterlambatan berbasis *grace period*, penerbitan denda nominal tetap (satu tagihan per kejadian), integrasi *payment gateway* **Midtrans Sandbox** melalui backend tepercaya (client–server–payment gateway), notifikasi pembayaran, serta finalisasi antarmuka seluruh peran.  
**Platform Target:** Android (Development Build & Production Build), iOS, dan Web Browser modern (dengan fallback terukur).  
**Strategi Kolaborasi:** Pembagian kerja paralel menjadi 3 sub-tim pengembang independen (**Programmer 1**, **Programmer 2**, dan **Programmer 3**) dengan branch Git terpisah berformat `feature/sprint4-*`.

---

## 1. Pendahuluan & Ringkasan Perubahan Arsitektur

### 1.1 Latar Belakang Masalah
Pada Sprint 3, PPK LabPortal telah memiliki presensi berbasis lokasi (*geofencing*), peta laboratorium interaktif, *push notification*, dan penanganan kondisi perangkat. Namun, dari sisi tata kelola praktikum yang sesungguhnya, masih terdapat celah utama:
1. **Peran Belum Dipisahkan:** Satu peran `asisten` memegang seluruh kewenangan sekaligus (konfigurasi laboratorium, distribusi praktikan, dan jalannya sesi), sehingga tidak ada pemisahan tanggung jawab antara pengelola laboratorium dan pelaksana sesi di kelas.
2. **Distribusi Praktikan & Asprak Masih Manual:** Belum ada pembuatan laboratorium secara massal per mata kuliah, belum ada impor data praktikan/asprak ke laboratorium tertentu (satuan maupun massal), belum ada template impor, dan belum ada mekanisme memindahkan praktikan atau asprak antar laboratorium.
3. **Konfigurasi Presensi Belum Per-Laboratorium:** Radius presensi masih sederhana dan belum ada batas toleransi keterlambatan (*grace period*) maupun nominal denda yang dapat diatur.
4. **Belum Ada Dashboard Pemantauan:** Tidak ada tampilan terpadu untuk memantau jumlah laboratorium/praktikan, status kegiatan tiap laboratorium, jadwal berlangsung/mendatang, riwayat kegiatan, dan riwayat keuangan dengan filter periode.
5. **Keterlambatan Belum Dihitung:** Semua presensi sah dianggap `hadir`. Belum ada pembedaan tepat waktu vs terlambat, dan status izin (*excused absence*) belum dibedakan secara tegas dari kehadiran.
6. **Belum Ada Denda & Pembayaran:** Tidak ada tagihan, tidak ada integrasi *payment gateway*, dan seluruh logika masih berjalan di sisi client sehingga tidak aman untuk urusan keuangan (status pembayaran tidak boleh ditentukan oleh client).
7. **Notifikasi & Riwayat Pembayaran Belum Ada:** Praktikan belum diberi tahu saat tagihan terbit atau pembayaran berhasil/gagal, dan belum ada halaman riwayat pembayaran yang persisten.

### 1.2 Tujuan Sprint 4
Sprint 4 menyempurnakan PPK LabPortal menjadi aplikasi **multi-peran, terkelola, dan berbasis transaksi** yang:
1. Menghadirkan peran baru **Aslab** yang berwenang mengelola laboratorium, distribusi praktikan, dan distribusi asprak sesuai mata kuliah yang menjadi tanggung jawabnya.
2. Menyediakan **tiga alur impor terpisah** (laboratorium, praktikan, asprak) masing-masing mendukung *single insert* dan *bulk insert*, dilengkapi **template file unduhan** dan **daftar tinjauan (*scroll view*) per baris** yang dapat diterima/ditolak, diperbarui, dan dilengkapi datanya oleh Aslab sebelum disimpan.
3. Menyediakan **pemindahan praktikan dan asprak** antar laboratorium tanpa memindahkan jadwal praktikum.
4. Menyediakan pengaturan **cakupan lokasi presensi (koordinat & radius)** dan **batas keterlambatan (*grace period*)** per laboratorium.
5. Menyediakan **dashboard keberlangsungan laboratorium** untuk Aslab dengan filter hari/minggu/bulan, bersumber dari data Firebase.
6. Memfokuskan **Asprak** pada pelaksanaan sesi (lihat kelas/jadwal/sesi, buka sesi, pantau & kelola presensi, tutup sesi) dengan sinkronisasi real-time ke aplikasi praktikan, tanpa kewenangan atas distribusi praktikan maupun konfigurasi laboratorium.
7. Menerapkan **perhitungan keterlambatan** (*grace period*), **denda nominal tetap**, **satu tagihan per kejadian**, serta **status izin (*excused absence*)** yang bebas denda dan tidak pernah berubah menjadi hadir.
8. Mengintegrasikan **Midtrans Sandbox** dengan alur *client → server → payment gateway*, verifikasi status melalui **webhook** yang valid, tanpa menyimpan *secret key* di aplikasi.
9. Mengintegrasikan **notifikasi** tagihan/pembayaran dan **riwayat pembayaran** yang persisten.
10. Memfinalisasi **antarmuka** agar modern, konsisten, dan 100% patuh `DESIGN.md` pada seluruh peran.

### 1.3 Definisi Peran & Matriks Kewenangan
Sprint 4 menetapkan tiga peran. Dokumen lama dengan `peran: 'asisten'` **dipetakan menjadi `asprak`** melalui fungsi `normalizeRole()` agar kompatibel mundur. Akun **Aslab** tidak dapat dibuat lewat pendaftaran mandiri; akun diberi peran melalui *seed script* / Firebase Console oleh pengelola sistem.

| Kewenangan | Aslab | Asprak | Praktikan |
|---|---|---|---|
| Kelola mata kuliah/laboratorium (nama, lokasi, koordinat, radius, grace period, nominal denda) | Ya (mata kuliah miliknya) | Tidak | Tidak |
| Bulk / single insert laboratorium, praktikan, asprak | Ya | Tidak | Tidak |
| Pindahkan praktikan & asprak antar laboratorium | Ya | Tidak | Tidak |
| Buat / ubah / hapus jadwal sesi | Ya | Tidak | Tidak |
| Dashboard keberlangsungan & riwayat keuangan | Ya | Tidak | Tidak |
| Lihat daftar kelas, jadwal, dan sesi | Seluruh lab pada mata kuliahnya | Hanya lab yang diampu | Hanya lab sendiri |
| Buka / tutup sesi | Tidak | Ya (lab yang diampu) | Tidak |
| Pantau & kelola presensi | Baca ringkasan (dashboard) | Ya (lab yang diampu) | Presensi diri sendiri |
| Setujui / tolak pengajuan izin | Tidak | Ya | Mengajukan |
| Lihat tagihan & bayar denda | Baca ringkasan keuangan | Tidak | Milik sendiri |

> [!NOTE]
> **Penamaan rute:** Untuk menghindari konflik merge dan rename massal, folder `src/app/asisten/*` **tetap dipakai sebagai Portal Asprak** (nama rute legacy). Portal Aslab menggunakan folder baru `src/app/aslab/*`. Seluruh teks UI menyebut peran sebagai **ASPRAK** dan **ASLAB**.

### 1.4 Kepatuhan Desain Mutlak (Mandatory Compliance to `DESIGN.md`)
Setiap pengembang (**Programmer 1, Programmer 2, dan Programmer 3**) maupun asisten AI (*AI coding agent* seperti Copilot, Claude, Gemini, ChatGPT) yang mengimplementasikan kode pada Sprint 4 **WAJIB MENGIKUTI DAN MEMATUHI PANDUAN RESMI DI `DESIGN.md`**.  
Tujuan aturan ini adalah mencegah rusaknya konsistensi antarmuka (*UI breakage / visual slop*):
1. **Identitas Warna Peran:**
   - **Portal Praktikan:** Dominan aksen **Terracotta Orange** (`#EA580C`, tint `#FFF7ED`, border `#FED7AA`).
   - **Portal Asprak:** Dominan aksen **Academic Teal** (`#0D9488`, tint `#F0FDFA`, border `#99F6E4`) — mewarisi identitas "Asisten" pada `DESIGN.md`.
   - **Portal Aslab (token baru Sprint 4):** Dominan aksen **Indigo** (`aslab.primary` `#4F46E5`, `aslab.tint` `#EEF2FF`, `aslab.border` `#C7D2FE`; kontras 6.3:1 terhadap putih, WCAG AA). Token ini **wajib ditambahkan ke `DESIGN.md`** oleh Programmer 2 pada tahap integrasi.
   - **Kanvas & Permukaan:** Canvas netral **Slate Light** (`#F8FAFC`), permukaan kartu `#FFFFFF`, border halus `#E2E8F0`.
   - **Warna Semantik Status:**
     - Hadir / Lunas / Sukses / Valid / Diterima: Hijau (`#16A34A`, latar `#DCFCE7`, teks `#15803D`).
     - Terlambat / Menunggu Pembayaran / Peringatan / Perlu Dilengkapi: Kuning/Amber (`#D97706`, latar `#FEF3C7`, teks `#B45309`).
     - Belum Dibayar / Gagal / Ditolak / Error / Di Luar Radius: Merah (`#DC2626`, latar `#FEE2E2`, teks `#B91C1C`).
     - Izin (*excused*) / Informasi / Sesi Berikutnya: Biru (`#2563EB`, latar `#DBEAFE`).
     - Belum Hadir / Netral: Abu Slate (`#64748B`, latar `#F1F5F9`).
2. **Aturan Anti-Slop (Zero Generic Emojis):**
   - **DILARANG KERAS** menggunakan icon emoji generik di dalam UI, tombol, chip status, kartu tagihan, banner, teks modal, isi notifikasi, maupun baris daftar impor.
   - Gunakan simbol geometris rapi (`●`, `■`, `←`, `→`, `▲`, `▼`), inisial bulat (*avatar circle*), ikon vektor/komponen terstandarisasi, atau teks semantik tegas.
3. **Standar Responsivitas & Flexbox:**
   - Seluruh layar baru (Dashboard Aslab, Laboratorium, Anggota, tiga layar Impor, Pindah Anggota, Tagihan, Detail Tagihan, Hasil Pembayaran, Riwayat Pembayaran) wajib memiliki pembatas lebar konten desktop: `maxWidth: 960px` terpusat (`alignSelf: 'center'`).
   - Padding adaptif: `paddingHorizontal: Platform.OS === 'web' ? 20 : 14`.
4. **Token Konsistensi Desain:**
   - Sudut melengkung seragam: `cardRadius: 14`, `buttonRadius: 10`, `pillRadius: 20`, `modalRadius: 20`.
   - Area sentuh minimal: `minHeight: 44`.
   - Setiap `FlatList` / daftar wajib memiliki `ListEmptyComponent` berupa `EmptyState` terstruktur (termasuk daftar impor, daftar tagihan, dan riwayat pembayaran).
   - Setiap halaman utama diawali kartu metrik ringkasan (`MetricsGrid`) sesuai prinsip *Data-Centric & Balanced*.
5. **Format Data Tampilan:**
   - Mata uang: `Rp 10.000` (`Intl.NumberFormat('id-ID')`), zona waktu tampilan **WIB** (`Asia/Jakarta`, UTC+7).

---

## 2. Arsitektur Sistem & Ekosistem Teknologi

```
+--------------------------------------------------------------------------------------------------+
|                                           CLIENT LAYER                                           |
|                             React Native + Expo SDK 57 (Expo Router)                             |
|                                                                                                  |
|  +----------------------------+  +----------------------------+  +----------------------------+  |
|  | PORTAL PRAKTIKAN           |  | PORTAL ASPRAK              |  | PORTAL ASLAB (ROLE BARU)   |  |
|  | /praktikan/*               |  | /asisten/* (legacy path)   |  | /aslab/*                   |  |
|  | - Jadwal & Presensi Geo    |  | - Sesi Lab Tanggung Jawab  |  | - Dashboard Lab (NEW)      |  |
|  | - Tagihan Denda (NEW)      |  | - Buka/Tutup Sesi (RT)     |  | - CRUD Lab & Jadwal (NEW)  |  |
|  | - Bayar via Midtrans (NEW) |  | - Pantau & Kelola Presensi |  | - 3x Bulk/Single Insert    |  |
|  | - Riwayat Pembayaran (NEW) |  | - Moderasi Izin (Excused)  |  | - Pindah Praktikan/Asprak  |  |
|  | - Pusat Notifikasi         |  | - Peta Lab & Notifikasi    |  | - Radius & Grace Period    |  |
|  +----------------------------+  +----------------------------+  +----------------------------+  |
|                                                                                                  |
|       +----------------------------------------------------------------------------------+       |
|       | APPLICATION STATE, SERVICES & HOOKS                                              |       |
|       | - AuthContext (3 peran + Member Linking saat login)                              |       |
|       | - LabService / ImportService / TransferService                                   |       |
|       | - DashboardService (onSnapshot + filter hari/minggu/bulan)                       |       |
|       | - AttendanceService (geofencing + checkedInAt server timestamp)                  |       |
|       | - PaymentService (callable createPayment + listener /fines & /payments)          |       |
|       +----------------------------------------------------------------------------------+       |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
                v                                 v                                 v

+-----------------------------+  +--------------------------------+  +-----------------------------+
| FIREBASE (DATA)             |  | CLOUD FUNCTIONS (SERVER)       |  | MIDTRANS SANDBOX            |
| 1. Firebase Auth            |  | - onAttendanceCreated          |  | - Snap API (buat transaksi) |
| 2. Cloud Firestore:         |  |   (hitung telat + denda)       |  | - Halaman bayar: VA/QRIS/   |
|    * /users /courses /labs  |  | - createPayment (callable)     |  |   e-wallet/kartu uji        |
|    * /lab_members (NEW)     |  | - midtransWebhook (HTTPS)      |  | - HTTP Notification         |
|    * /sessions /attendances |  | - notify (Expo Push + log)     |  |   (webhook + signature)     |
|    * /fines /payments (NEW) |  | - Secret: MIDTRANS_SERVER_KEY  |  | - Status API (rekonsiliasi) |
| 3. Security Rules RBAC      |  |   (tidak ada di aplikasi)      |  |                             |
+-----------------------------+  +--------------------------------+  +-----------------------------+
```

**Alur pembayaran (client → server → payment gateway):**
1. Praktikan menekan **Bayar Sekarang** → aplikasi memanggil *callable* `createPayment({ fineId })` (hanya mengirim ID tagihan, **bukan** nominal).
2. Backend memverifikasi identitas & kepemilikan tagihan, lalu membuat transaksi **Snap** ke Midtrans Sandbox memakai *server key* (hanya ada di backend) dan mengembalikan `redirectUrl`.
3. Aplikasi membuka `redirectUrl` (`expo-web-browser`); praktikan membayar pada halaman Midtrans.
4. Midtrans mengirim **HTTP Notification (webhook)** ke `midtransWebhook`; backend memverifikasi **signature**, mencocokkan nominal, merekonsiliasi lewat **Status API**, lalu memperbarui `/payments`, `/fines`, dan mengirim notifikasi.
5. Aplikasi hanya **membaca** status dari Firestore secara real-time. Respons/redirect di sisi client **tidak pernah** dipakai sebagai penentu status pembayaran.

### Paket Expo / Library Tambahan yang Direkomendasikan (Install via `npx expo install`)
- `expo-document-picker` — Memilih file impor (`.csv` / `.xlsx`) dari perangkat.
- `expo-file-system` & `expo-sharing` — Membuat dan membagikan/mengunduh file template impor pada Android/iOS (versi web memakai `Blob` + tautan unduh).
- `papaparse` (+ `@types/papaparse`) — Parsing CSV; `xlsx` (SheetJS) — Parsing & pembuatan template `.xlsx`. *(Install via `npm install` karena bukan paket Expo.)*
- `expo-web-browser` — Membuka halaman pembayaran Midtrans (Snap `redirectUrl`).
- `@react-native-async-storage/async-storage` — Cache lokal terakhir daftar tagihan & riwayat pembayaran agar tampil instan dan tetap terbaca saat offline.
- `firebase/functions` (bagian dari Firebase JS SDK) — Memanggil *callable function* `createPayment`.
- **Backend (`/functions`, Node.js 20 + TypeScript):** `firebase-functions` (2nd gen), `firebase-admin`. Pemanggilan HTTP ke Midtrans memakai `fetch` bawaan Node 20; verifikasi signature memakai modul `crypto` bawaan.

> [!NOTE]
> **Backend:** Sprint 4 memakai **Cloud Functions for Firebase (2nd gen)** pada region `asia-southeast2` karena otomatis tersambung ke Firestore & Auth serta menyediakan URL HTTPS publik untuk webhook. Cloud Functions membutuhkan project berplan **Blaze** (kuota gratis tetap berlaku). Jika kelompok tidak dapat memakai Blaze, alternatifnya adalah server Node.js/Express (mis. Render/Railway) dengan `firebase-admin` dengan kontrak endpoint yang sama (lihat 7.1) — keputusan harus disepakati sebelum Programmer 3 mulai.

> [!WARNING]
> `MIDTRANS_SERVER_KEY` **tidak boleh** muncul di kode React Native, `app.json`, variabel `EXPO_PUBLIC_*`, repositori Git, maupun log. Simpan hanya sebagai *secret* Firebase (`firebase functions:secrets:set MIDTRANS_SERVER_KEY`).

---

## 3. Skema Data Cloud Firestore (Single Source of Truth)

Sprint 4 mempertahankan seluruh koleksi Sprint 2–3 secara *backward-compatible*, memperluas `users`, `labs`, `sessions`, `attendances`, `notifications`, serta menambahkan koleksi `courses`, `lab_members`, `lab_transfers`, `import_batches`, `fines`, `payments`, dan `payment_events`.

> [!IMPORTANT]
> **Asumsi format Sprint 2–3:** `sessions.tanggal` berformat `YYYY-MM-DD`, `waktuMulai`/`waktuSelesai` berformat `HH:mm` (WIB), dan `sessions.status` bernilai `'belum-dibuka' | 'dibuka' | 'ditutup'`. Jika berbeda, sesuaikan helper `src/utils/wib.ts` (Stage 0) — jangan mengubah skema di tempat lain.

### 3.1 Pembaruan Koleksi `users` (`/users/{uid}`)
```typescript
export type UserRole = 'praktikan' | 'asprak' | 'aslab';
// Dokumen lama bernilai 'asisten' -> normalizeRole('asisten') === 'asprak'

export interface UserDocument {
  // ... seluruh field Sprint 2-3 tetap dipertahankan (termasuk expoPushToken, notificationsEnabled)

  peran: UserRole | 'asisten';  // 'asisten' = legacy, dibaca sebagai 'asprak'
  nim?: string;                 // praktikan: NIM; asprak/aslab: NIM/NIP bila ada
  labId?: string;               // PRAKTIKAN: laboratorium aktif (satu lab per mata kuliah)
  labIds?: string[];            // ASPRAK: daftar laboratorium yang diampu
  managedCourseIds?: string[];  // ASLAB: mata kuliah yang menjadi tanggung jawabnya
}
```

### 3.2 Koleksi Baru `courses` (`/courses/{courseId}`)
```typescript
export interface CourseDocument {
  id: string;            // mis. 'ppk-2026'
  kode: string;          // mis. 'PAIK6012'
  nama: string;          // mis. 'Praktikum Pengembangan Platform Khusus'
  semester?: string;     // mis. 'Gasal 2026/2027'
  aslabIds: string[];    // UID aslab penanggung jawab
  isActive: boolean;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

### 3.3 Pembaruan Koleksi `labs` (`/labs/{labId}`)
Memperluas `LabLocationDocument` Sprint 3 menjadi unit laboratorium per mata kuliah yang menyimpan **lokasi, radius presensi, toleransi keterlambatan, dan nominal denda**:
```typescript
export interface LabLocationDocument {
  // ... field Sprint 3 tetap: id, nama, kode, gedung, latitude, longitude,
  //     radiusMeter (15-500, default 50), deskripsi?, isActive, updatedBy, createdAt, updatedAt

  courseId: string;        // Relasi ke /courses/{courseId} (wajib untuk lab baru)
  courseNama: string;      // Denormalisasi nama mata kuliah
  kelas?: string;          // Label kelas (mis. 'A', 'B') — dipakai sebagai kompatibilitas Sprint 2-3
  kapasitas?: number;      // Kapasitas praktikan (opsional)
  graceMinutes: number;    // Toleransi keterlambatan dalam menit (0-120, default 15)
  fineAmount: number;      // Denda tetap per keterlambatan dalam Rupiah (bilangan bulat, 1000-1000000, default 10000)
}
```
Lab Sprint 3 yang belum memiliki field baru dibaca dengan nilai default (`graceMinutes = 15`, `fineAmount = 10000`).

### 3.4 Koleksi Baru `lab_members` (`/lab_members/{memberId}`)
Menyimpan keanggotaan praktikan/asprak pada laboratorium, **termasuk anggota yang belum pernah login** (di-*link* ke akun saat login pertama berdasarkan email):
```typescript
export interface LabMemberDocument {
  id: string;
  // ID deterministik (anti-duplikasi):
  //  - praktikan: `${courseId}_praktikan_${nim}`  -> satu praktikan hanya satu lab per mata kuliah
  //  - asprak   : `${labId}_asprak_${emailKey}`   -> satu asprak boleh mengampu beberapa lab
  courseId: string;
  labId: string;
  role: 'praktikan' | 'asprak';
  nim?: string;
  nama: string;
  email: string;
  emailLower: string;            // kunci penautan akun saat login
  uid?: string | null;           // terisi saat akun Auth berhasil ditautkan
  status: 'active' | 'removed';
  importBatchId?: string;        // penanda asal impor (audit)
  createdBy: string;             // UID aslab
  createdAt: string;
  updatedAt: string;
}
```
Saat anggota ditautkan/dipindahkan, field `users.labId` (praktikan) atau `users.labIds` (asprak) ikut diperbarui.

### 3.5 Koleksi Baru `lab_transfers` & `import_batches`
```typescript
export interface LabTransferDocument {   // /lab_transfers/{id}  (audit pemindahan, create-only)
  id: string;
  memberId: string;
  role: 'praktikan' | 'asprak';
  fromLabId: string;
  toLabId: string;
  courseId: string;
  movedBy: string;        // UID aslab
  reason?: string;
  createdAt: string;
}

export interface ImportBatchDocument {   // /import_batches/{id}  (audit impor, create-only)
  id: string;
  type: 'lab' | 'praktikan' | 'asprak';
  courseId: string;
  targetLabId?: string;
  fileName?: string;
  totalRows: number;
  acceptedRows: number;
  deniedRows: number;
  savedRows: number;
  failedRows: number;
  createdBy: string;
  createdAt: string;
}
```

### 3.6 Pembaruan Koleksi `sessions` (`/sessions/{sessionId}`)
```typescript
export interface SessionDocument {
  // ... seluruh field Sprint 2-3 tetap dipertahankan (id, praktikum, kelas, materi, tanggal,
  // waktuMulai, waktuSelesai, ruang, status, kodeSesi, createdBy, openedAt, closedAt,
  // createdAt, updatedAt, labId?, radiusOverride?, qrPayload?)

  courseId?: string;              // Relasi mata kuliah (wajib untuk sesi baru)
  labId: string;                  // Wajib untuk sesi baru Sprint 4
  startAt?: string;               // ISO 8601 UTC dari tanggal + waktuMulai (WIB); dihitung saat sesi disimpan
  startedAt?: string;             // ISO 8601: waktu PERTAMA kali sesi dibuka; diisi sekali, tidak pernah ditimpa (juga saat "Buka Kembali")
  graceMinutesOverride?: number;  // Opsional: toleransi khusus sesi ini (menimpa lab.graceMinutes)
}
```

### 3.7 Pembaruan Koleksi `attendances` (`/attendances/{attendanceId}`)
ID tetap `${sessionId}_${studentId}` (anti-duplikasi; satu catatan per praktikan per sesi, apa pun statusnya).
```typescript
export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin';
// 'hadir'     = hadir tepat waktu
// 'terlambat' = hadir setelah melewati grace period -> menerbitkan tepat satu tagihan denda
// 'izin'      = TIDAK HADIR DENGAN IZIN (excused absence) -> bebas denda, TIDAK PERNAH dihitung sebagai hadir
// Praktikan tanpa dokumen presensi = belum hadir / alpa (diturunkan, tidak disimpan)

export interface AttendanceDocument {
  // ... seluruh field Sprint 2-3 tetap dipertahankan

  attendanceStatus: AttendanceStatus;
  checkedInAt: unknown;                 // Firestore serverTimestamp() — waktu presensi otoritatif
  verifiedByLocation: boolean;          // true untuk presensi mandiri; false untuk izin/manual
  verificationMethod: 'code-location' | 'qr-location' | 'manual-asprak' | 'leave-approved';
  lateness?: {
    baselineAt: string;                 // max(sesi.startAt, sesi.startedAt)
    graceMinutes: number;               // toleransi yang berlaku saat itu (snapshot)
    deadlineAt: string;                 // baselineAt + graceMinutes
    minutesAfterStart: number;          // menit sejak baselineAt (>= 0)
    isLate: boolean;                    // checkedInAt > deadlineAt (tepat di deadline = tidak terlambat)
    evaluatedBy: 'client' | 'server';   // 'server' = hasil final oleh Cloud Function
  };
  fineId?: string;                      // Terisi bila status 'terlambat' (= attendanceId)
  excusedByLeaveId?: string;            // Terisi bila status 'izin'
  manualEntry?: { by: string; note: string; at: string }; // Presensi manual oleh asprak
}
```

### 3.8 Koleksi Baru `fines` (`/fines/{fineId}`) — Tagihan Denda
`fineId` **sama dengan** `attendanceId` (`${sessionId}_${studentId}`) sehingga **mustahil** ada lebih dari satu tagihan per kejadian keterlambatan. Dokumen hanya ditulis oleh backend (Admin SDK).
```typescript
export type FineStatus = 'unpaid' | 'pending' | 'paid';

export interface FineDocument {
  id: string;                 // = attendanceId
  invoiceNumber: string;      // deterministik: 'INV-YYYYMMDD-XXXXXXXX' (dari hash attendanceId)
  studentId: string;          // UID praktikan
  studentName: string;
  studentNim?: string;
  sessionId: string;
  attendanceId: string;
  labId: string;
  courseId: string;
  praktikum: string;          // Denormalisasi nama praktikum
  sessionDate: string;        // YYYY-MM-DD
  lateMinutes: number;        // = lateness.minutesAfterStart
  graceMinutes: number;       // snapshot toleransi
  amount: number;             // Rupiah (snapshot lab.fineAmount), tetap
  currency: 'IDR';
  status: FineStatus;         // 'paid' HANYA ditetapkan oleh webhook terverifikasi
  activePaymentId?: string;   // orderId percobaan pembayaran yang sedang pending
  paymentAttempts: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.9 Koleksi Baru `payments` & `payment_events`
```typescript
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentDocument {   // /payments/{orderId}  (ditulis backend saja)
  id: string;                 // = orderId Midtrans: `${invoiceNumber}-${attempt}` (maks. 50 karakter)
  fineId: string;
  invoiceNumber: string;
  attempt: number;
  studentId: string;
  sessionId: string;
  attendanceId: string;
  courseId: string;
  labId: string;
  praktikum: string;
  amount: number;
  status: PaymentStatus;      // hasil pemetaan dari transaction_status Midtrans
  midtransStatus?: string;    // nilai mentah: pending | settlement | capture | deny | cancel | expire | failure
  fraudStatus?: string;
  paymentType?: string;       // mis. 'bank_transfer', 'qris', 'gopay', 'credit_card'
  transactionId?: string;
  snapToken: string;
  redirectUrl: string;
  expiresAt: string;
  settledAt?: string;         // waktu transaksi berhasil (settlement_time)
  failureReason?: string;
  lastWebhookAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEventDocument {   // /payment_events/{eventId}  (log audit webhook, backend saja)
  id: string;                 // hash(order_id + transaction_status + status_code + transaction_time)
  orderId: string;
  signatureValid: boolean;
  transactionStatus?: string;
  statusCode?: string;
  grossAmount?: string;
  processed: boolean;
  receivedAt: string;
}
```
**Pemetaan status Midtrans → status aplikasi:**

| `transaction_status` Midtrans | `PaymentStatus` | Dampak pada `FineStatus` |
|---|---|---|
| `pending` | `pending` | `pending` |
| `settlement` | `success` | `paid` |
| `capture` (dengan `fraud_status = accept`) | `success` | `paid` |
| `capture` (dengan `fraud_status = challenge`) | `pending` | `pending` |
| `deny`, `cancel`, `expire`, `failure` | `failed` | kembali `unpaid` (dapat dibayar ulang dengan percobaan baru) |
| `refund`, `partial_refund` | diabaikan (dicatat di `payment_events`) | tidak berubah |

### 3.10 Pembaruan Koleksi `notifications`
```typescript
export type NotificationEventType =
  | 'session_opened'
  | 'schedule_updated'
  | 'leave_approved'
  | 'leave_rejected'
  | 'fine_created'             // Tagihan denda baru dibuat
  | 'payment_success'          // Pembayaran berhasil
  | 'payment_failed'           // Pembayaran gagal / kedaluwarsa / ditolak
  | 'payment_action_required'; // Pembayaran masih pending dan butuh penyelesaian lebih lanjut

// Field NotificationDocument Sprint 3 tetap; tambahkan:
//   relatedFineId?: string;
//   relatedPaymentId?: string;
```
Notifikasi tagihan/pembayaran **dibuat oleh backend** (Admin SDK), bukan oleh client.

### 3.11 Ringkasan Hak Akses Koleksi (Target `firestore.rules`)

| Koleksi | Read | Write |
|---|---|---|
| `users` | Pemilik; aslab (lingkup mata kuliahnya); asprak (anggota lab yang diampu) | Pemilik (kecuali `peran`, `labId`, `labIds`, `managedCourseIds`); aslab hanya `labId`, `labIds`, `kelas` |
| `courses` | Semua terautentikasi | Aslab pemilik mata kuliah |
| `labs` | Semua terautentikasi | Aslab pemilik mata kuliah |
| `lab_members` | Aslab mata kuliah; asprak lab diampu; praktikan hanya dokumen miliknya | Aslab; pengguna hanya boleh mengisi `uid` pada dokumen yang `emailLower`-nya sama dengan email loginnya |
| `lab_transfers`, `import_batches` | Aslab | Aslab (create saja) |
| `sessions` | Semua terautentikasi (query dibatasi `labId`) | Aslab (create/update/delete); asprak hanya `status`, `openedAt`, `closedAt`, `startedAt`, `kodeSesi` untuk lab yang diampu |
| `attendances` | Pemilik; asprak lab diampu; aslab mata kuliah | Praktikan: **create** `hadir`/`terlambat` milik sendiri; asprak: create `izin`/manual; **tidak ada update/delete dari client** |
| `fines`, `payments` | Praktikan pemilik; aslab mata kuliah | **Tidak ada** (hanya Admin SDK) |
| `payment_events` | Tidak ada | Tidak ada (hanya Admin SDK) |
| `notifications` | Pemilik (`targetUserId`) | Create oleh backend / event Sprint 3; pemilik hanya `isRead` |

---

## 4. Matriks Pembagian Tanggung Jawab Tim & Alur Kerja (3 Programmer)

Agar pengerjaan Sprint 4 oleh 3 programmer berjalan paralel, modular, dan terhindar dari konflik kode (*zero merge conflicts*), arsitektur dibagi menjadi 3 domain independen:

```mermaid
flowchart TD
    subgraph CoreFoundation ["Branch: main (Fondasi Pasca-Sprint 3)"]
        BASE["Fondasi Eksisting<br/>• AuthContext, Firebase SDK, /users /labs /sessions /attendances /leave_requests /notifications<br/>• Geofencing, Peta Lab, Push Notification (Sprint 3)<br/>• DESIGN.md (Token Warna, Responsivitas, Anti-Slop)"]
    end

    subgraph Stage0 ["Stage 0 — Kontrak (Programmer 1, merge pertama ke main)"]
        S0["• src/types/praktikum.ts (seluruh tipe Bab 3)<br/>• src/constants/praktikum-config.ts<br/>• src/utils/wib.ts & format.ts<br/>• firestore.rules (kerangka + penanda seksi)<br/>• src/app/aslab/_layout.tsx (stub rute)"]
    end

    subgraph P1Branch ["Branch: feature/sprint4-aslab-lab-management (Programmer 1)"]
        direction TB
        P1_ROLE["Peran & Akses Aslab<br/>• normalizeRole, AuthContext 3 peran<br/>• Guard /aslab/* & Member Linking saat login"]
        P1_LAB["Manajemen Laboratorium<br/>• src/services/lab-service.ts (+course)<br/>• src/app/aslab/laboratorium.tsx<br/>• Radius, Grace Period, Nominal Denda"]
        P1_IMP["3 Alur Impor Terpisah + Template<br/>• impor-lab / impor-praktikan / impor-asprak<br/>• ImportReviewList (accept/deny/edit/isi kosong)"]
        P1_MOVE["Anggota & Pemindahan<br/>• src/app/aslab/anggota.tsx<br/>• src/app/aslab/pindah-anggota.tsx"]
        P1_ROLE --> P1_LAB --> P1_IMP --> P1_MOVE
    end

    subgraph P2Branch ["Branch: feature/sprint4-dashboard-asprak-session (Programmer 2)"]
        direction TB
        P2_DASH["Dashboard Aslab<br/>• src/services/dashboard-service.ts<br/>• src/app/aslab/dashboard.tsx<br/>• Filter Hari/Minggu/Bulan"]
        P2_JADWAL["Jadwal Sesi oleh Aslab<br/>• src/app/aslab/jadwal.tsx (CRUD sesi + labId + startAt)"]
        P2_ASPRAK["Portal Asprak Terfokus<br/>• Scoping labIds, Buka/Tutup Sesi (startedAt)<br/>• Roster Presensi + Presensi Manual"]
        P2_IZIN["Izin = Excused Absence<br/>• src/services/leave-service.ts<br/>• attendanceStatus 'izin', bebas denda"]
        P2_UI["Finalisasi UI & DESIGN.md<br/>• RoleHeader 3 peran, Landing, Token Aslab"]
        P2_DASH --> P2_JADWAL --> P2_ASPRAK --> P2_IZIN --> P2_UI
    end

    subgraph P3Branch ["Branch: feature/sprint4-midtrans-fines-payment (Programmer 3)"]
        direction TB
        P3_BE["Backend Cloud Functions<br/>• /functions: onAttendanceCreated, createPayment, midtransWebhook<br/>• Secret MIDTRANS_SERVER_KEY"]
        P3_LATE["Keterlambatan & Denda<br/>• src/utils/lateness.ts, attendance-service.ts<br/>• Satu tagihan per kejadian (fines/{attendanceId})"]
        P3_UI["UI Tagihan & Pembayaran<br/>• tagihan, detail, hasil, riwayat-pembayaran<br/>• Cache AsyncStorage"]
        P3_NOTIF["Notifikasi Pembayaran & Rules<br/>• notify.ts (Expo Push + log)<br/>• Rules fines/payments"]
        P3_BE --> P3_LATE --> P3_UI --> P3_NOTIF
    end

    subgraph Integration ["Integrasi Akhir & Demonstrasi 3 Alur Utama (Sprint 4 Done)"]
        FLOW1["Alur 1: Setup Lab & Distribusi (Aslab)"]
        FLOW2["Alur 2: Sesi, Presensi, Izin & Dashboard"]
        FLOW3["Alur 3: Telat, Denda & Pembayaran Midtrans"]
    end

    BASE --> Stage0
    Stage0 --> P1Branch
    Stage0 --> P2Branch
    Stage0 --> P3Branch
    P1Branch -.->|Ekspor: lab_members, labs (grace/fine), role guard| P2Branch
    P2Branch -.->|Ekspor: sessions.startedAt, attendanceStatus 'izin'| P3Branch
    P3Branch -.->|Ekspor: /fines & /payments| P2Branch
    P1Branch --> Integration
    P2Branch --> Integration
    P3Branch --> Integration
```

### 4.1 Tabel Matriks Pembagian Tugas Lengkap

| No | Modul / Fitur | Programmer | Branch Git | Berkas yang Dimiliki / Diubah | Spesifikasi Logika Kunci | Kriteria Lolos (Definition of Done) |
|---|---|---|---|---|---|---|
| 0 | **Stage 0 — Kontrak Bersama** | **Programmer 1** | `feature/sprint4-aslab-lab-management` (merge pertama) | - `src/types/praktikum.ts`<br>- `src/constants/praktikum-config.ts`<br>- `src/utils/wib.ts`, `src/utils/format.ts`<br>- `firestore.rules` (kerangka)<br>- `src/app/aslab/_layout.tsx` (stub) | • Menyalin seluruh tipe Bab 3 apa adanya.<br>• Konstanta: `DEFAULT_RADIUS_METER=50`, `DEFAULT_GRACE_MINUTES=15`, `DEFAULT_FINE_AMOUNT=10000`, `TIMEZONE='Asia/Jakarta'`.<br>• Helper `parseWibDateTime`, `toWibDateString`, `formatRupiah`, `formatWib`.<br>• Rules diberi penanda seksi `// ===== P1 =====`, `// ===== P2 =====`, `// ===== P3 =====`. | `npx tsc --noEmit` lolos; P2 & P3 dapat langsung `git merge main` dan memakai tipe/helper. |
| 1 | **Peran Aslab, Akses & Member Linking** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/context/auth-context.tsx`<br>- `src/utils/role.ts`<br>- `src/app/aslab/_layout.tsx` | • `normalizeRole()` ('asisten' → 'asprak').<br>• Guard rute: `/aslab/*` hanya aslab, `/asisten/*` hanya asprak, `/praktikan/*` hanya praktikan.<br>• Redirect pasca-login sesuai peran.<br>• Saat login, tautkan `lab_members` ber-`emailLower` sama (set `uid`, isi `users.labId/labIds`). | Tiga peran masuk ke portal masing-masing; akses silang dialihkan; anggota hasil impor otomatis terhubung saat login pertama. |
| 2 | **Manajemen Laboratorium & Konfigurasi Presensi** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/services/lab-service.ts`<br>- `src/services/course-service.ts`<br>- `src/app/aslab/laboratorium.tsx` | • CRUD lab per mata kuliah: nama, kode, lokasi/gedung, lat/lng, `radiusMeter`, `graceMinutes`, `fineAmount`, kapasitas.<br>• Tombol "Gunakan Lokasi Saya Saat Ini" & validasi rentang.<br>• Seed mata kuliah PPK dan migrasi lab Sprint 3 ke `courseId`. | Aslab dapat mengatur lokasi, radius, grace period, dan nominal denda per lab; perubahan langsung dipakai validasi presensi & perhitungan telat. |
| 3 | **Engine Daftar Tinjauan Impor + Template Unduhan** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/components/import-review-list.tsx`<br>- `src/hooks/use-import-draft.ts`<br>- `src/services/import-template-service.ts`<br>- `src/services/import-parser.ts` | • Parser CSV/XLSX → baris draf.<br>• Tiap baris menjadi kartu *scroll view* dengan status validasi, tombol Terima/Tolak, edit inline, dan isi data kosong.<br>• Aksi massal (terima semua valid, tolak semua error, isi kolom kosong).<br>• Template `.csv` & `.xlsx` terunduh per jenis impor. | Berkas impor berubah menjadi daftar fleksibel; hanya baris diterima & valid yang disimpan; template dapat diunduh pada Android/iOS/Web. |
| 4 | **Impor Laboratorium per Mata Kuliah (Bulk/Single)** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/app/aslab/impor-lab.tsx`<br>- `src/services/lab-import-service.ts` | • Pilih satu mata kuliah → generator cepat N lab atau unggah file atau tambah satu baris.<br>• Validasi kode unik, koordinat, radius, grace, denda.<br>• Simpan dengan `writeBatch` per potongan. | Sejumlah lab dibuat sekaligus untuk satu mata kuliah; terpisah penuh dari impor praktikan/asprak. |
| 5 | **Impor Praktikan ke Laboratorium (Bulk/Single)** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/app/aslab/impor-praktikan.tsx`<br>- `src/services/member-import-service.ts` | • Pilih mata kuliah & lab tujuan (opsional kolom `kode_lab` per baris).<br>• Deteksi duplikat NIM (dalam file & pada mata kuliah yang sama).<br>• Tulis `lab_members` (+ tautkan ke `users` jika akun sudah ada). | Praktikan masuk ke lab tertentu secara single/bulk; satu praktikan tidak dapat berada di dua lab pada mata kuliah yang sama. |
| 6 | **Impor Asprak ke Laboratorium (Bulk/Single)** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/app/aslab/impor-asprak.tsx`<br>- `src/services/member-import-service.ts` | • Pilih mata kuliah & lab tujuan (opsional `kode_lab` per baris).<br>• Asprak boleh mengampu banyak lab.<br>• Perbarui `users.labIds` saat akun sudah terhubung. | Asprak terdistribusi ke lab melalui alur yang **terpisah** dari praktikan; asprak langsung melihat lab barunya. |
| 7 | **Daftar Anggota & Pemindahan Praktikan/Asprak** | **Programmer 1** | `feature/sprint4-aslab-lab-management` | - `src/app/aslab/anggota.tsx`<br>- `src/app/aslab/pindah-anggota.tsx`<br>- `src/services/lab-member-service.ts` | • Daftar anggota per lab (cari, filter, edit, hapus).<br>• Pindah satu/banyak anggota ke lab lain pada mata kuliah yang sama; jadwal sesi **tidak dipindahkan**.<br>• Catat `lab_transfers`; sinkronkan `users.labId/labIds`. | Pemindahan langsung memengaruhi sesi yang terlihat anggota; riwayat presensi lama tidak berubah. |
| 8 | **Dashboard Keberlangsungan Laboratorium** | **Programmer 2** | `feature/sprint4-dashboard-asprak-session` | - `src/services/dashboard-service.ts`<br>- `src/app/aslab/dashboard.tsx`<br>- `src/components/dashboard/*` | • Metrik: jumlah lab, praktikan, asprak, sesi berlangsung.<br>• Status per lab, lokasi & waktu, jadwal berlangsung/mendatang, riwayat kegiatan, riwayat keuangan.<br>• Filter hari / minggu / bulan (WIB) dengan navigasi periode. | Seluruh data dihitung dari Firestore real-time dan berubah sesuai filter. |
| 9 | **Jadwal Sesi oleh Aslab** | **Programmer 2** | `feature/sprint4-dashboard-asprak-session` | - `src/app/aslab/jadwal.tsx`<br>- `src/services/session-service.ts` | • CRUD sesi dengan `labId` wajib, hitung `startAt` (WIB → UTC).<br>• Mempertahankan trigger `notifyScheduleChanged` Sprint 3. | Aslab dapat membuat/mengubah/menghapus sesi; asprak tidak lagi memiliki kontrol ini. |
| 10 | **Portal Asprak Terfokus & Buka/Tutup Sesi** | **Programmer 2** | `feature/sprint4-dashboard-asprak-session` | - `src/app/asisten/jadwal.tsx`<br>- `src/app/asisten/detail-sesi/[id].tsx`<br>- `src/app/asisten/rekap.tsx`<br>- `src/app/asisten/mahasiswa.tsx` | • Query sesi hanya untuk `users.labIds`.<br>• Buka sesi mengisi `startedAt` **sekali**; tutup sesi; sinkron real-time.<br>• Hapus kontrol tambah/edit/hapus sesi & manajemen praktikan; halaman `mahasiswa` menjadi **Kelas Saya** (baca saja). | Asprak hanya melihat & mengelola lab yang diampu; praktikan menerima perubahan status secara real-time. |
| 11 | **Pemantauan Presensi & Izin (Excused Absence)** | **Programmer 2** | `feature/sprint4-dashboard-asprak-session` | - `src/services/attendance-admin-service.ts`<br>- `src/services/leave-service.ts`<br>- `src/components/attendance-roster.tsx` | • Roster berstatus Hadir / Terlambat / Izin / Belum Hadir.<br>• Presensi manual oleh asprak (catatan wajib).<br>• Persetujuan izin membuat catatan `izin` (bukan `hadir`), bebas denda; konflik dengan presensi yang sudah ada ditolak. | Izin tercatat sebagai tidak hadir dengan izin; tidak ada tagihan; tidak pernah berubah menjadi hadir. |
| 12 | **Finalisasi UI, Landing & DESIGN.md** | **Programmer 2** | `feature/sprint4-dashboard-asprak-session` | - `src/components/role-header.tsx`<br>- `src/app/index.tsx`<br>- `src/app/aslab/peta-lab.tsx`<br>- `DESIGN.md` | • RoleHeader & landing 3 peran, token Aslab Indigo, badge status baru.<br>• Tambah bagian layar baru ke `DESIGN.md`.<br>• Audit anti-emoji, empty state, responsivitas pada seluruh layar Sprint 4. | Seluruh layar konsisten & bebas emoji; `DESIGN.md` memuat token dan blueprint layar Sprint 4. |
| 13 | **Backend Cloud Functions & Keamanan Secret** | **Programmer 3** | `feature/sprint4-midtrans-fines-payment` | - `functions/*` (`index.ts`, `config.ts`, `midtrans.ts`, `notify.ts`)<br>- `firebase.json`, `.gitignore` | • Proyek Functions 2nd gen (Node 20, TS, region `asia-southeast2`).<br>• `MIDTRANS_SERVER_KEY` sebagai Firebase secret.<br>• Seluruh penulisan `fines`/`payments` hanya melalui Admin SDK. | Functions ter-*deploy*; secret tidak ada di repo maupun bundle aplikasi. |
| 14 | **Perhitungan Keterlambatan & Penerbitan Denda** | **Programmer 3** | `feature/sprint4-midtrans-fines-payment` | - `src/utils/lateness.ts`<br>- `src/services/attendance-service.ts`<br>- `src/app/praktikan/presensi.tsx`<br>- `functions/src/lateness.ts` | • Baseline = `max(startAt, startedAt)`; deadline = baseline + grace; telat bila `checkedInAt > deadline`.<br>• Trigger `onAttendanceCreated` menghitung ulang otoritatif dari waktu server, membuat `fines/{attendanceId}` (idempoten).<br>• `izin`/manual dilewati (tanpa denda). | Telat → tepat satu tagihan terhubung ke praktikan, sesi, dan presensi; tepat di batas grace dianggap tepat waktu. |
| 15 | **Integrasi Midtrans Sandbox (Snap + Webhook)** | **Programmer 3** | `feature/sprint4-midtrans-fines-payment` | - `functions/src/payments.ts`<br>- `functions/src/webhook.ts`<br>- `src/services/payment-service.ts` | • *Callable* `createPayment` → Snap → `redirectUrl`.<br>• `midtransWebhook` verifikasi signature, cek nominal, rekonsiliasi Status API, transisi status aman.<br>• Percobaan ulang = `orderId` baru. | Status pembayaran berubah **hanya** setelah webhook valid; webhook palsu ditolak. |
| 16 | **UI Tagihan, Pembayaran & Riwayat** | **Programmer 3** | `feature/sprint4-midtrans-fines-payment` | - `src/app/praktikan/tagihan.tsx`<br>- `src/app/praktikan/tagihan/[id].tsx`<br>- `src/app/praktikan/pembayaran-hasil.tsx`<br>- `src/app/praktikan/riwayat-pembayaran.tsx` | • Daftar & rincian tagihan, tombol bayar, halaman hasil (status dari Firestore), riwayat transaksi.<br>• Cache `AsyncStorage` agar riwayat tetap tersedia saat app dibuka ulang/offline. | Praktikan dapat melihat, membayar, dan menelusuri riwayat tanpa kehilangan data setelah app ditutup. |
| 17 | **Notifikasi Pembayaran & Security Rules** | **Programmer 3** | `feature/sprint4-midtrans-fines-payment` | - `functions/src/notify.ts`<br>- `src/app/notifikasi.tsx`<br>- `src/hooks/use-notifications.ts`<br>- `firestore.rules` (seksi P3) | • Event: `fine_created`, `payment_success`, `payment_failed`, `payment_action_required`.<br>• Tap notifikasi → `/praktikan/tagihan/[id]`.<br>• Rules `fines`, `payments`, `payment_events`, `attendances` (update/delete ditutup). | Tiga kejadian pembayaran memicu push & tercatat di Pusat Notifikasi; client tidak dapat menulis status pembayaran. |

### 4.2 Kontrak Antarmuka Dependensi (Interface Contract)
Untuk memastikan ketiga programmer dapat bekerja secara paralel tanpa saling menunggu:
1. **Kontrak Stage 0 (Disediakan Programmer 1, Dikonsumsi Semua):**
   - Programmer 1 **wajib** merge Stage 0 ke `main` lebih dulu (target ≤ 1 jam sejak kerja dimulai). Setelah itu Programmer 2 dan 3 menjalankan `git merge main`.
   - Tidak ada programmer lain yang boleh mengubah bentuk tipe pada `src/types/praktikum.ts`; usulan perubahan dibahas bersama lalu dikerjakan Programmer 1.
   - `src/utils/format.ts` menyediakan `formatRupiah(n: number): string`; `src/utils/wib.ts` menyediakan `parseWibDateTime(tanggal: string, jam: string): Date`, `toWibDateString(d: Date): string`, `formatWib(iso: string): string`.
2. **Kontrak Distribusi Anggota (Disediakan Programmer 1, Dikonsumsi Programmer 2):**
   - Sumber kebenaran keanggotaan: koleksi `lab_members`; sisi akun: `users.labId` (praktikan) dan `users.labIds` (asprak).
   - Praktikan melihat sesi dengan query `sessions where labId == user.labId`; asprak dengan `labId in user.labIds` (dipecah per 30 ID bila perlu).
   - Sesi Sprint 2–3 tanpa `labId` tetap dicocokkan lewat `kelas`/`ruang` (fallback) agar data lama tidak hilang.
3. **Kontrak Sesi & Presensi (Disediakan Programmer 2, Dikonsumsi Programmer 3):**
   - Saat sesi **pertama kali** dibuka, Programmer 2 mengisi `startedAt` (ISO) dan **tidak pernah menimpanya** (termasuk "Buka Kembali Sesi").
   - Presensi `izin` dibuat Programmer 2 dengan ID `${sessionId}_${studentId}`, `attendanceStatus: 'izin'`, `verificationMethod: 'leave-approved'`, `verifiedByLocation: false`. Cloud Function Programmer 3 **wajib melewati** dokumen berstatus `izin` dan presensi manual.
   - Presensi manual asprak memakai `verificationMethod: 'manual-asprak'` dan status `hadir`; tidak pernah menghasilkan tagihan.
4. **Kontrak Keuangan (Disediakan Programmer 3, Dikonsumsi Programmer 2):**
   - Koleksi `fines` dan `payments` memuat `courseId`, `labId`, `status`, `amount`, `createdAt`, `settledAt`/`paidAt` sehingga dashboard Aslab dapat memfilter per mata kuliah & periode tanpa join.
   - Programmer 2 hanya **membaca** koleksi ini.
5. **Kontrak Backend & Rules:**
   - Seluruh penulisan `fines`, `payments`, `payment_events`, serta notifikasi pembayaran **hanya** lewat Admin SDK (Functions).
   - `firestore.rules`: Programmer 1 membuat kerangka dengan fungsi bantu (`isAslab()`, `isAsprak()`, `isPraktikan()`, `managesCourse(courseId)`, `teachesLab(labId)`); tiap programmer hanya mengedit seksi miliknya.
   - Indeks komposit baru dicatat pada `firestore.indexes.json` oleh pemilik query masing-masing.
6. **Kontrak Navigasi Tab (`_layout.tsx`):**
   - Programmer 1 mendeklarasikan **seluruh rute Aslab** di `src/app/aslab/_layout.tsx` sejak Stage 0 (dashboard, jadwal, laboratorium, anggota, impor-*, pindah-anggota, peta-lab, notifikasi). Programmer lain hanya membuat berkas layarnya.
   - Entry tab baru Praktikan (Tagihan, Riwayat Pembayaran) ditambahkan Programmer 3 pada `src/app/praktikan/_layout.tsx` saat tahap integrasi.

---

## 5. Rincian Kebutuhan Fungsional — Programmer 1
### (Branch: `feature/sprint4-aslab-lab-management`)

### FR-P1-01 — Peran Aslab, Kontrol Akses & Penautan Anggota
- **FR-P1-01.1:** Menyediakan `src/utils/role.ts` dengan `normalizeRole(peran): UserRole` (`'asisten'` → `'asprak'`) dan memperbarui `AuthContext` agar mengenali tiga peran serta melakukan *redirect* pasca-login: `aslab` → `/aslab/dashboard`, `asprak` → `/asisten/jadwal`, `praktikan` → `/praktikan/jadwal`.
- **FR-P1-01.2:** Menerapkan *route guard*: pengguna yang membuka rute di luar perannya dialihkan ke portalnya sendiri (atau `/` bila belum masuk) dengan pesan informatif.
- **FR-P1-01.3:** Saat login, `AuthContext` mencari dokumen `lab_members` dengan `emailLower` sama dan `uid == null`, mengisi `uid`, serta menyinkronkan `users.labId` (praktikan) atau `users.labIds` (asprak). Kegagalan penautan tidak boleh menggagalkan login.
- **FR-P1-01.4:** Menyediakan *seed script* (`scripts/seed-sprint4.ts`) untuk mata kuliah PPK, lab contoh, dan contoh akun Aslab (`peran: 'aslab'`, `managedCourseIds`).

### FR-P1-02 — Manajemen Laboratorium & Konfigurasi Presensi
- **FR-P1-02.1:** Memperluas `src/services/lab-service.ts` (`subscribeLabsByCourse`, `createLab`, `updateLab`, `deleteLab`, `getLabById`) dan membuat `src/services/course-service.ts` (`subscribeManagedCourses`).
- **FR-P1-02.2:** Menyediakan halaman `src/app/aslab/laboratorium.tsx` (memindahkan fungsi `lokasi-lab.tsx` Sprint 3; rute lama diarahkan ke halaman baru) untuk menambah dan mengelola:
  - Nama, kode, gedung/lokasi, mata kuliah, kapasitas.
  - Koordinat `latitude`/`longitude` dengan tombol *"Gunakan Lokasi Saya Saat Ini"*.
  - **Cakupan lokasi presensi:** `radiusMeter` (15–500, default 50).
  - **Batas keterlambatan:** `graceMinutes` (0–120, default 15).
  - **Nominal denda tetap:** `fineAmount` (Rupiah bulat 1.000–1.000.000, default 10.000).
- **FR-P1-02.3:** Menyajikan `MetricsGrid` (Total Lab, Total Praktikan, Total Asprak, Lab Aktif), filter per mata kuliah, dan `EmptyState` bila belum ada lab.
- **FR-P1-02.4:** Lab tidak dapat dihapus bila masih memiliki anggota aktif atau sesi; tawarkan opsi nonaktifkan (`isActive: false`).

### FR-P1-03 — Engine Daftar Tinjauan Impor (Dipakai Tiga Alur Terpisah)
Komponen generik `ImportReviewList` + hook `useImportDraft` menjadi mesin tampilan; **namun setiap jenis impor memiliki layar, skema kolom, validasi, template, dan service sendiri** (tidak digabung).
- **FR-P1-03.1 (Sumber Data):** Setiap layar impor menerima baris dari tiga sumber: (a) unggah berkas `.csv`/`.xlsx`, (b) tombol **Tambah Satu Baris** (*single insert*), (c) khusus impor lab: **Generator Cepat**. Seluruh sumber menghasilkan format draf yang sama.
- **FR-P1-03.2 (Daftar Scroll Fleksibel):** Setiap baris data menjadi kartu pada `FlatList`/`ScrollView` dengan:
  - Nomor baris, ringkasan, dan badge status validasi: **Valid** (hijau), **Perlu Dilengkapi** (amber), **Error** (merah), **Duplikat/Konflik** (amber/merah).
  - **Edit inline** setiap field; sel wajib yang kosong disorot amber agar mudah dilengkapi.
  - Tombol **Terima** / **Tolak** per baris (keputusan: `accepted | denied | pending`); baris `Error` tidak dapat diterima sebelum diperbaiki.
  - Tombol **Hapus Baris** dan **Duplikasi Baris**.
- **FR-P1-03.3 (Aksi Massal):** Terima Semua Valid, Tolak Semua Error, **Isi Kolom Kosong untuk Semua Baris** (mis. satu nilai lab/radius/grace untuk semua baris yang kosong), serta filter daftar (Semua, Valid, Perlu Dilengkapi, Error, Ditolak).
- **FR-P1-03.4 (Ringkasan & Simpan):** Panel ringkasan tetap (sticky) menampilkan jumlah total/diterima/ditolak/bermasalah dan tombol **Simpan N Data**. Hanya baris `accepted` dan valid yang ditulis.
- **FR-P1-03.5 (Penulisan Aman):** Penulisan memakai `writeBatch` per potongan (maks. 200 baris/batch) dengan **ID deterministik** sehingga percobaan ulang aman (idempoten). Baris yang gagal tetap berada di daftar dengan pesan galat spesifik; hasil akhir dicatat pada `import_batches`.
- **FR-P1-03.6:** Seluruh keadaan (belum ada data, berkas tidak terbaca, kolom wajib tidak ditemukan, berkas kosong) ditangani dengan `EmptyState`/banner informatif tanpa crash.

### FR-P1-04 — Template File Unduhan
- **FR-P1-04.1:** Setiap layar impor menyediakan tombol **Unduh Template** (`.csv` dan `.xlsx`). Pada Android/iOS: file dibuat dengan `expo-file-system` lalu dibagikan via `expo-sharing`; pada Web: `Blob` + tautan unduh.
- **FR-P1-04.2:** Template berisi baris header sesuai skema, **1–2 baris contoh**, dan sheet/baris petunjuk. CSV memakai UTF-8 dengan BOM agar terbaca benar di Excel.
- **FR-P1-04.3:** Parser mengenali header secara *case-insensitive* dan toleran terhadap spasi/underscore; kolom opsional boleh dihapus.

**Skema kolom template (tiga template terpisah):**

| Template | Kolom Wajib | Kolom Opsional | Catatan Validasi |
|---|---|---|---|
| `template-impor-lab` | `nama_lab`, `kode_lab`, `gedung`, `latitude`, `longitude` | `radius_meter`, `grace_menit`, `nominal_denda`, `kapasitas`, `kelas` | `kode_lab` unik per mata kuliah; lat -90..90, lng -180..180; kosong → isi default (radius 50, grace 15, denda 10000) sebagai *Perlu Dilengkapi* |
| `template-impor-praktikan` | `nim`, `nama`, `email` | `kode_lab` | NIM numerik (8–20 digit); email valid; `kode_lab` kosong → memakai lab tujuan pada layar; NIM ganda dalam file → *Duplikat*; NIM sudah terdaftar di lab lain pada mata kuliah yang sama → *Konflik* (default ditolak, tersedia aksi **Pindahkan ke lab ini**) |
| `template-impor-asprak` | `nama`, `email` | `nim`, `kode_lab` | Email valid & unik per lab; asprak boleh terdaftar di beberapa lab |

Contoh isi `template-impor-praktikan.csv`:
```
nim,nama,email,kode_lab
24060124120001,Contoh Nama Praktikan,contoh@students.undip.ac.id,PPK-LAB-1
```

### FR-P1-05 — Impor Laboratorium Berdasarkan Satu Mata Kuliah (*Bulk / Single*)
- **FR-P1-05.1:** Layar `src/app/aslab/impor-lab.tsx` mewajibkan pemilihan **satu mata kuliah** (dari `managedCourseIds`) sebelum baris dapat diproses; seluruh lab hasil impor terikat ke mata kuliah tersebut.
- **FR-P1-05.2:** **Generator Cepat:** Aslab mengisi jumlah lab (N), awalan nama/kode (mis. `PPK Lab` / `PPK-LAB`), gedung, koordinat dasar, radius, grace, dan denda → sistem menghasilkan N baris draf bernomor otomatis untuk ditinjau pada daftar.
- **FR-P1-05.3:** Validasi: kode unik (dalam berkas & terhadap lab yang sudah ada pada mata kuliah), rentang koordinat/radius/grace/denda. Lab disimpan dengan ID deterministik berbasis `courseId` + `kode`.

### FR-P1-06 — Impor Praktikan ke Laboratorium Tertentu (*Bulk / Single*)
- **FR-P1-06.1:** Layar `src/app/aslab/impor-praktikan.tsx` memilih mata kuliah dan **lab tujuan**; kolom `kode_lab` pada berkas (bila ada) menimpa lab tujuan per baris.
- **FR-P1-06.2:** Menulis `lab_members` (`role: 'praktikan'`, ID `${courseId}_praktikan_${nim}`). Bila email sudah memiliki akun di `/users`, langsung tautkan `uid` dan perbarui `users.labId`.
- **FR-P1-06.3:** Aksi **Pindahkan ke lab ini** pada baris *Konflik* memakai alur yang sama dengan FR-P1-08 (tercatat pada `lab_transfers`).

### FR-P1-07 — Impor Asprak ke Laboratorium Tertentu (*Bulk / Single*)
- **FR-P1-07.1:** Layar `src/app/aslab/impor-asprak.tsx` **terpisah** dari impor praktikan, dengan template dan service sendiri.
- **FR-P1-07.2:** Menulis `lab_members` (`role: 'asprak'`, ID `${labId}_asprak_${emailKey}`) dan memperbarui `users.labIds` (menambah, tidak menimpa) bila akun sudah ada.
- **FR-P1-07.3:** Asprak yang sudah ada pada lab yang sama ditandai *Duplikat*; asprak yang sudah mengampu lab lain diperbolehkan (ditandai informasi, bukan error).

### FR-P1-08 — Daftar Anggota & Pemindahan Praktikan/Asprak
- **FR-P1-08.1:** Halaman `src/app/aslab/anggota.tsx` menampilkan anggota per lab dengan segmented switcher **Praktikan / Asprak**, pencarian real-time, filter lab, edit (nama, email), hapus (set `status: 'removed'` dan bersihkan `users.labId/labIds`), dan `MetricsGrid`.
- **FR-P1-08.2:** Halaman `src/app/aslab/pindah-anggota.tsx` memindahkan **satu atau banyak** praktikan/asprak ke laboratorium lain **pada mata kuliah yang sama** melalui modal konfirmasi terpusat. Praktikan: `labId` pada dokumen anggota yang sama diubah (tetap satu lab per mata kuliah). Asprak: lab asal dilepas dan lab tujuan ditambahkan.
- **FR-P1-08.3:** **Jadwal praktikum tidak dipindahkan.** Perpindahan hanya mengubah keanggotaan; sesi lama tetap pada lab lama, catatan presensi/tagihan historis tidak berubah, dan sesi mendatang mengikuti lab baru.
- **FR-P1-08.4:** Setiap pemindahan menulis `lab_transfers` dan menyinkronkan `users.labId`/`users.labIds`.

---

## 6. Rincian Kebutuhan Fungsional — Programmer 2
### (Branch: `feature/sprint4-dashboard-asprak-session`)

### FR-P2-01 — Dashboard Keberlangsungan Laboratorium (Aslab)
- **FR-P2-01.1:** Menyediakan `src/app/aslab/dashboard.tsx` dan `src/services/dashboard-service.ts` yang berlangganan (`onSnapshot`) data `labs`, `lab_members`, `sessions`, `attendances`, `fines`, dan `payments` untuk mata kuliah yang dikelola Aslab.
- **FR-P2-01.2:** **Kartu metrik** (`MetricsGrid`): Total Laboratorium, Total Praktikan, Total Asprak, Sesi Berlangsung.
- **FR-P2-01.3:** **Status kegiatan per laboratorium:** kartu per lab menampilkan badge **Berlangsung** (hijau), **Terjadwal** (biru), atau **Tidak Ada Kegiatan** (abu); lokasi/gedung; waktu pelaksanaan; jumlah praktikan & asprak; serta tingkat kehadiran sesi berjalan.
- **FR-P2-01.4:** **Jadwal berlangsung dan akan datang:** dua daftar — *Sedang Berlangsung* (status `dibuka`) dan *Akan Datang* (status `belum-dibuka`, `startAt` ≥ sekarang; jika kosong pada periode terpilih, tampilkan 5 jadwal terdekat).
- **FR-P2-01.5:** **Riwayat kegiatan laboratorium:** sesi berstatus `ditutup` pada periode terpilih dengan ringkasan hadir/terlambat/izin/belum hadir, jam buka–tutup, dan lab terkait.
- **FR-P2-01.6:** **Riwayat keuangan denda:** ringkasan *Tagihan Diterbitkan*, *Terbayar* (Rp), *Menunggu*, dan daftar transaksi `success` (nama praktikan, sesi, nominal, waktu transaksi) pada periode terpilih. Data **hanya dibaca** dari `fines`/`payments`.
- **FR-P2-01.7:** **Filter periode:** segmented **Hari | Minggu | Bulan** dengan navigasi `←` / `→` antar periode. Hari = tanggal WIB terpilih; Minggu = Senin–Minggu; Bulan = bulan kalender. Seluruh angka dan daftar berubah sesuai periode.
- **FR-P2-01.8:** Kinerja & ketahanan: kueri difilter `courseId in managedCourseIds` (dipecah per 30 ID) dan rentang `tanggal`; batasi hasil (mis. `limit(500)`); gunakan *skeleton*/indikator memuat; tampilkan `EmptyState` bila periode kosong.

### FR-P2-02 — Jadwal Sesi oleh Aslab
- **FR-P2-02.1:** Menyediakan `src/app/aslab/jadwal.tsx` (daftar + modal form tambah/edit + hapus) dengan pemilihan **lab (`labId`) wajib**; `courseId` diturunkan dari lab. Form dan kartu sesi memakai ulang komponen Sprint 2–3.
- **FR-P2-02.2:** Setiap simpan menghitung `startAt` (ISO UTC) dari `tanggal` + `waktuMulai` (WIB). Perubahan tanggal/jam/materi/lab tetap memicu `notifyScheduleChanged` (Sprint 3).
- **FR-P2-02.3:** Kewenangan membuat/mengubah/menghapus sesi **dipindahkan dari Asprak ke Aslab** (tombol **+ Tambah Sesi**, **Edit Informasi Sesi**, **Hapus Sesi** hanya tampil di portal Aslab). Penghapusan sesi mengarahkan kembali ke `/aslab/jadwal`.

### FR-P2-03 — Portal Asprak Terfokus & Pelaksanaan Sesi
- **FR-P2-03.1:** Daftar kelas, jadwal, dan sesi pada `src/app/asisten/jadwal.tsx` **hanya** memuat sesi dengan `labId` ∈ `users.labIds` (`MetricsGrid` mengikuti lingkup ini). Mengakses detail sesi lab lain dialihkan dengan pesan "Anda tidak mengampu laboratorium ini".
- **FR-P2-03.2:** **Buka sesi:** mengubah status ke `dibuka`, mengisi `openedAt`, membuat `kodeSesi`, serta **mengisi `startedAt` hanya bila belum ada** (tidak pernah menimpa, juga saat "Buka Kembali Sesi"). Tetap memicu `notifySessionOpened` (Sprint 3).
- **FR-P2-03.3:** **Tutup sesi:** mengubah status ke `ditutup` dan mengisi `closedAt`. Presensi mandiri praktikan ditolak setelah sesi ditutup (validasi service Sprint 3).
- **FR-P2-03.4:** **Sinkronisasi real-time:** perubahan status sesi langsung tampil di aplikasi praktikan tanpa muat ulang (`onSnapshot`); `firestore.rules` mengizinkan asprak hanya mengubah `status`, `openedAt`, `closedAt`, `startedAt`, `kodeSesi` pada lab yang diampu.
- **FR-P2-03.5:** Asprak **tidak** memiliki akses ke pembuatan/perubahan/penghapusan sesi, impor, pemindahan anggota, dan konfigurasi lab. Halaman `src/app/asisten/mahasiswa.tsx` diubah menjadi **Kelas Saya** (daftar anggota lab yang diampu, **baca saja**).

### FR-P2-04 — Pemantauan & Pengelolaan Presensi oleh Asprak
- **FR-P2-04.1:** Komponen `src/components/attendance-roster.tsx` menampilkan roster per sesi dengan badge: **Hadir** (hijau), **Terlambat** (amber, disertai menit keterlambatan), **Izin** (biru, "Tidak Hadir dengan Izin"), dan **Belum Hadir** (abu). Tab filter: Semua, Hadir, Terlambat, Izin, Belum Hadir.
- **FR-P2-04.2:** Tingkat kehadiran = `(hadir + terlambat) / jumlah praktikan aktif`; **izin ditampilkan terpisah** dan tidak dihitung sebagai hadir. Progress bar mengikuti `DESIGN.md` §5.5.
- **FR-P2-04.3:** **Presensi manual** (`src/services/attendance-admin-service.ts`): asprak dapat mencatat praktikan yang belum memiliki catatan sebagai `hadir` dengan catatan wajib (`manualEntry`), `verificationMethod: 'manual-asprak'`, `verifiedByLocation: false`. Presensi manual **tidak pernah menerbitkan denda**.
- **FR-P2-04.4:** Mengedit atau menghapus catatan presensi yang sudah ada (terutama yang sudah memiliki tagihan) **di luar cakupan Sprint 4**; client tidak memiliki hak update/delete pada `attendances`.

### FR-P2-05 — Persetujuan Izin = *Excused Absence* (Bebas Denda)
- **FR-P2-05.1:** Pada `src/services/leave-service.ts`, keputusan `disetujui` menulis (dalam satu transaksi) status pengajuan **dan** dokumen `attendances/${sessionId}_${studentId}` berstatus `izin` (`excusedByLeaveId`, `verificationMethod: 'leave-approved'`, `verifiedByLocation: false`). Keputusan `ditolak` tidak membuat catatan apa pun.
- **FR-P2-05.2:** Jika dokumen presensi untuk sesi tersebut **sudah ada** (hadir/terlambat), persetujuan izin ditolak dengan pesan jelas; keputusan izin **tidak boleh** mengubah catatan kehadiran menjadi `hadir` atau menghapus tagihan.
- **FR-P2-05.3:** Karena ID presensi deterministik, praktikan berstatus `izin` tidak dapat melakukan presensi mandiri pada sesi itu; halaman presensi menampilkan "Anda tercatat izin pada sesi ini" (koordinasi tampilan dengan Programmer 3 melalui status dokumen).
- **FR-P2-05.4:** Notifikasi `leave_approved`/`leave_rejected` Sprint 3 tetap berjalan dan **tidak menimbulkan** tagihan.

### FR-P2-06 — Finalisasi Antarmuka & Konsistensi Desain
- **FR-P2-06.1:** Memperbarui `RoleHeader` untuk tiga peran (pill identitas `PRAKTIKAN` / `ASPRAK` / `ASLAB` dengan warna masing-masing) dan landing `/` dengan kartu portal ketiga peran.
- **FR-P2-06.2:** Menyediakan `src/app/aslab/peta-lab.tsx` (memakai ulang komponen peta Sprint 3 dengan aksen Indigo) dan memastikan navigasi tab Aslab sesuai kontrak 4.2.
- **FR-P2-06.3:** Memperbarui `DESIGN.md`: token Aslab, badge status baru (Terlambat, Izin, Belum Dibayar, Menunggu Pembayaran, Lunas), blueprint layar Aslab/Tagihan, dan pola daftar tinjauan impor.
- **FR-P2-06.4 (Audit Akhir):** Menjalankan pencarian emoji pada seluruh `src`, memeriksa `maxWidth: 960`, `minHeight: 44`, `ListEmptyComponent` pada setiap daftar, dan keselarasan komponen (`MetricsGrid`, `EmptyState`, `BreadcrumbBack`) pada seluruh layar Sprint 4.

---

## 7. Rincian Kebutuhan Fungsional — Programmer 3
### (Branch: `feature/sprint4-midtrans-fines-payment`)

### FR-P3-01 — Backend Cloud Functions & Pengamanan Secret
- **FR-P3-01.1:** Membuat proyek `/functions` (Firebase Functions 2nd gen, Node 20, TypeScript, region `asia-southeast2`) dengan modul `index.ts`, `config.ts`, `lateness.ts`, `payments.ts`, `webhook.ts`, `midtrans.ts`, `notify.ts`.
- **FR-P3-01.2:** `MIDTRANS_SERVER_KEY` disimpan sebagai Firebase *secret* (`defineSecret`); konfigurasi non-rahasia (mis. `MIDTRANS_BASE_URL_SNAP = https://app.sandbox.midtrans.com`, `MIDTRANS_BASE_URL_API = https://api.sandbox.midtrans.com`) lewat parameter/`.env` yang tidak berisi rahasia. `.gitignore` mencakup `functions/.env*` dan `functions/.runtimeconfig.json`.
- **FR-P3-01.3:** Seluruh penulisan `fines`, `payments`, `payment_events`, dan notifikasi pembayaran memakai Admin SDK. Log backend **tidak boleh** memuat server key atau header `Authorization`.

### FR-P3-02 — Perhitungan Keterlambatan & Penerbitan Denda
- **FR-P3-02.1 (Aturan Keterlambatan):**
  - `baselineAt = max(session.startAt, session.startedAt ?? session.startAt)` — sesi dianggap benar-benar dimulai saat dijadwalkan atau saat pertama kali dibuka, mana yang lebih akhir (mencegah praktikan didenda akibat asprak membuka sesi terlambat).
  - `graceMinutes = session.graceMinutesOverride ?? lab.graceMinutes ?? 15`; `deadlineAt = baselineAt + graceMinutes`.
  - Presensi **sebelum atau tepat pada** `deadlineAt` → `hadir` (tepat waktu). Presensi **setelah** `deadlineAt` → `terlambat`.
- **FR-P3-02.2 (Client — `src/utils/lateness.ts` & `attendance-service.ts`):** Fungsi murni `evaluateLateness({ startAt, startedAt, graceMinutes, checkedInAt })` dipakai untuk menampilkan hasil sementara. `attendance-service.ts` menulis dokumen presensi dengan `checkedInAt: serverTimestamp()`, `attendanceStatus` sementara, dan `lateness.evaluatedBy: 'client'`. Halaman presensi menampilkan hasil ("Hadir Tepat Waktu" atau "Terlambat X menit — tagihan denda Rp … akan diterbitkan") dan status *"Memverifikasi"* hingga `evaluatedBy` bernilai `'server'`.
- **FR-P3-02.3 (Server — Trigger `onAttendanceCreated`):** Pada `attendances/{id}` dibuat:
  1. Lewati bila `attendanceStatus == 'izin'` atau `verificationMethod` ∈ {`manual-asprak`, `leave-approved`}.
  2. Muat sesi & lab; hitung ulang keterlambatan memakai **waktu server** (`createTime` dokumen), lalu perbarui `attendanceStatus`, `lateness` (`evaluatedBy: 'server'`) pada dokumen presensi.
  3. Jika `terlambat`: buat `fines/{attendanceId}` dengan operasi `create()` (jika sudah ada → `ALREADY_EXISTS` diabaikan) berisi identitas praktikan, `sessionId`, `attendanceId`, `labId`, `courseId`, nominal `lab.fineAmount` (snapshot), `invoiceNumber` deterministik, `status: 'unpaid'`; isi `attendances.fineId`.
  4. Kirim notifikasi `fine_created` **hanya** bila tagihan benar-benar baru dibuat (trigger bersifat *at-least-once*, harus idempoten).
- **FR-P3-02.4 (Jaminan Satu Tagihan):** ID tagihan = ID presensi = `${sessionId}_${studentId}`; presensi ganda sudah ditolak (Sprint 3) sehingga satu kejadian keterlambatan **tidak mungkin** menghasilkan lebih dari satu tagihan, walaupun trigger berjalan berulang.
- **FR-P3-02.5 (Pembayaran Tidak Mengubah Kehadiran):** Tidak ada kode pembayaran yang menulis ke `attendanceStatus`. Setelah lunas, presensi tetap `terlambat`; halaman rincian tagihan menampilkan catatan bahwa pembayaran tidak mengubah status kehadiran.
- **FR-P3-02.6 (Izin):** Praktikan berstatus `izin` tidak pernah memiliki tagihan keterlambatan.

### FR-P3-03 — Integrasi Midtrans Sandbox (Snap + Webhook)
- **FR-P3-03.1 (Callable `createPayment({ fineId })`):**
  1. Wajib terautentikasi; `fine.studentId == auth.uid`; `fine.status ∈ {'unpaid','pending'}`.
  2. Jika terdapat `payments` berstatus `pending` yang belum kedaluwarsa untuk tagihan tersebut → kembalikan `redirectUrl` yang sama (tidak membuat transaksi ganda).
  3. Selain itu buat percobaan baru: `attempt = paymentAttempts + 1`, `orderId = ${invoiceNumber}-${attempt}` (maks. 50 karakter, **tidak pernah dipakai ulang**).
  4. Panggil `POST {SNAP}/snap/v1/transactions` (Basic Auth `base64(serverKey + ':')`) dengan `transaction_details` (`order_id`, `gross_amount` = nominal dari **Firestore**, bukan dari client), `item_details` (nama dipotong ≤ 50 karakter), `customer_details`, `expiry` (mis. 24 jam), dan `callbacks.finish`.
  5. Simpan `payments/{orderId}` (`pending`, `snapToken`, `redirectUrl`, `expiresAt`) dan perbarui `fines` (`status: 'pending'`, `activePaymentId`, `paymentAttempts`) dalam satu transaksi; kembalikan `{ paymentId, redirectUrl }`.
  6. Galat dari Midtrans dikembalikan sebagai pesan generik tanpa membocorkan detail internal.
- **FR-P3-03.2 (Webhook `midtransWebhook`, HTTPS POST publik):**
  1. Validasi payload; hitung `sha512(order_id + status_code + gross_amount + SERVER_KEY)` dan bandingkan dengan `signature_key` memakai perbandingan *timing-safe*. Tidak cocok → balas `403`, catat di `payment_events` (`signatureValid: false`), **tanpa** mengubah data.
  2. Cari `payments/{order_id}`; cocokkan `gross_amount` dengan nominal tagihan; tidak cocok → tolak.
  3. **Rekonsiliasi:** panggil Status API `GET {API}/v2/{order_id}/status` dan gunakan hasilnya sebagai kebenaran akhir (bukan isi webhook mentah).
  4. Petakan status sesuai tabel pada 3.9 dan terapkan **transisi aman** dalam transaksi Firestore: `success` bersifat final; `pending` tidak boleh menimpa `success`/`failed`; notifikasi urutan terbalik diabaikan.
  5. Perbarui `payments` (`status`, `midtransStatus`, `paymentType`, `settledAt`, `lastWebhookAt`) dan `fines` (`paid` + `paidAt`, atau kembali `unpaid` bila gagal/kedaluwarsa dan tidak ada percobaan pending lain).
  6. Idempoten melalui `payment_events/{eventId}`; selalu balas `200` secepatnya untuk notifikasi valid (termasuk duplikat).
  7. URL webhook didaftarkan pada Midtrans Sandbox Dashboard sebagai *Payment Notification URL*.
- **FR-P3-03.3 (Rekonsiliasi Opsional):** Fungsi terjadwal `reconcilePendingPayments` (tiap 15 menit) memeriksa `payments` berstatus `pending` yang melewati `expiresAt` melalui Status API sebagai jaring pengaman bila webhook terlewat.
- **FR-P3-03.4 (Aturan Mutlak):** Status `paid`/`success` hanya boleh ditetapkan backend setelah verifikasi webhook; kode React Native tidak memiliki jalur untuk menulis status tersebut.

### FR-P3-04 — UI Tagihan, Pembayaran & Riwayat (Praktikan)
- **FR-P3-04.1 (`src/app/praktikan/tagihan.tsx`):** `MetricsGrid` (Total Tagihan, Belum Dibayar [Rp], Menunggu Pembayaran, Lunas [Rp]); filter chips *Semua, Belum Dibayar, Menunggu, Lunas*; kartu tagihan berisi praktikum, tanggal sesi, keterlambatan (menit), nominal (`Rp`), nomor invoice, badge status, dan tautan `Lihat Rincian →`; `EmptyState` bila tidak ada tagihan.
- **FR-P3-04.2 (`src/app/praktikan/tagihan/[id].tsx`):** Rincian nominal & sesi (praktikum, lab, jadwal mulai, toleransi, waktu presensi, menit terlambat), catatan "pembayaran tidak mengubah status kehadiran", daftar percobaan pembayaran beserta statusnya, serta tombol **Bayar Sekarang** (status `unpaid`/gagal) atau **Lanjutkan Pembayaran** (status `pending`). Tombol memanggil `createPayment` lalu membuka `redirectUrl` via `expo-web-browser` (Web: tab baru).
- **FR-P3-04.3 (`src/app/praktikan/pembayaran-hasil.tsx`):** Setelah browser ditutup atau aplikasi kembali aktif (`AppState` → `active`), halaman membaca status dari Firestore secara real-time dan menampilkan **Menunggu Verifikasi** (amber, `pending`), **Pembayaran Berhasil** (hijau, `success`), atau **Pembayaran Gagal** (merah, `failed`, dengan tombol **Coba Lagi**). Halaman **tidak boleh** menyimpulkan keberhasilan hanya dari penutupan browser/URL pengembalian.
- **FR-P3-04.4 (`src/app/praktikan/riwayat-pembayaran.tsx`):** Riwayat transaksi dari `payments` milik praktikan (urut terbaru) memuat informasi sesi, tanggal tagihan, nominal, waktu transaksi, metode (`paymentType`), dan status (`pending` / `success` / `failed`) dengan filter status.
- **FR-P3-04.5 (Persistensi):** Daftar tagihan & riwayat pembayaran bersumber dari Firestore (tersimpan permanen di server) dan **di-cache** ke `AsyncStorage` (kunci per-`uid`) agar langsung tampil serta tetap terbaca saat aplikasi ditutup dan dibuka kembali atau saat offline; cache diganti otomatis oleh data terbaru.

### FR-P3-05 — Notifikasi Pembayaran
- **FR-P3-05.1:** `functions/src/notify.ts` menyediakan `sendToUser(uid, payload)` yang menulis `/notifications` (`deliveryStatus`) dan mengirim push lewat Expo Push API ke `users.expoPushToken` (jika ada); kegagalan push menghasilkan `in_app_only`/`failed` dan **tidak** menggagalkan proses utama.
- **FR-P3-05.2:** Praktikan menerima notifikasi pada kejadian: **Tagihan denda baru dibuat** (`fine_created`), **Pembayaran berhasil** (`payment_success`), **Pembayaran gagal/kedaluwarsa** (`payment_failed`), dan **Pembayaran masih pending dan butuh penyelesaian** (`payment_action_required`, dikirim sekali saat transisi pertama ke `pending`). Judul/isi singkat, **tanpa emoji**, menyebut praktikum & nominal.
- **FR-P3-05.3:** Memperbarui `src/hooks/use-notifications.ts` dan `src/app/notifikasi.tsx`: ketukan notifikasi tagihan/pembayaran mengarahkan ke `/praktikan/tagihan/[id]`; Pusat Notifikasi mendukung tipe baru (badge tipe tanpa emoji).

### FR-P3-06 — Keamanan, Rules & Verifikasi
- **FR-P3-06.1:** Menambahkan pada seksi P3 `firestore.rules`: `fines`, `payments` (read oleh pemilik/aslab mata kuliah; **tulis ditutup**), `payment_events` (tertutup penuh), serta `attendances` (praktikan hanya `create` miliknya dengan status `hadir`/`terlambat` dan tanpa `fineId`; **update/delete ditutup** untuk client).
- **FR-P3-06.2:** Menjalankan pemeriksaan kebocoran secret: pencarian `MIDTRANS_SERVER_KEY`/`SB-Mid-server` pada seluruh repositori selain konfigurasi Firebase secret **harus kosong**; bundel aplikasi tidak memuat server key.
- **FR-P3-06.3:** Menyediakan uji manual terdokumentasi untuk: webhook dengan signature salah (ditolak), nominal tidak cocok (ditolak), webhook duplikat (idempoten), dan notifikasi urutan terbalik (tidak menurunkan status).

---

## 8. Skenario Pengujian Alur Terintegrasi (End-to-End Evaluation)

Aplikasi wajib mampu mendemonstrasikan **3 alur utama** secara mulus, real-time, dan konsisten:

### Skenario 1: Setup Laboratorium & Distribusi oleh Aslab
1. **Impor Lab:** Aslab membuka **Impor Laboratorium**, memilih mata kuliah PPK, membuat 3 lab lewat Generator Cepat (atau mengunduh template, mengisi, dan mengunggahnya). Pada daftar tinjauan, Aslab mengisi koordinat yang kosong, menolak satu baris, memperbaiki satu kode ganda, lalu menyimpan.
2. **Pengaturan Lab:** Aslab mengatur radius (`50 m`), grace period (`15 menit`), dan nominal denda (`Rp 10.000`) pada salah satu lab.
3. **Impor Praktikan (alur terpisah):** Aslab mengunduh template praktikan, mengunggah berkas berisi baris valid, baris dengan email salah, dan NIM ganda. Daftar tinjauan menandai masalahnya; Aslab memperbaiki, menolak sebagian, lalu menyimpan. *Single insert* satu praktikan lewat **Tambah Satu Baris** juga berhasil.
4. **Impor Asprak (alur terpisah):** Aslab melakukan hal serupa melalui layar Impor Asprak.
5. **Pemindahan:** Aslab memindahkan seorang praktikan dari Lab 1 ke Lab 2 (dan seorang asprak ke lab lain). Jadwal sesi **tidak berpindah**; praktikan kini melihat sesi Lab 2, riwayat Lab 1 tetap utuh.
6. **Login Pertama:** Praktikan hasil impor login → akun otomatis tertaut ke lab-nya; asprak melihat lab yang diampu.

### Skenario 2: Sesi, Presensi, Izin & Dashboard
1. Aslab membuat sesi (tertaut ke lab) dari **Jadwal Aslab**; praktikan lab terkait menerima notifikasi jadwal.
2. **Asprak** hanya melihat sesi lab yang diampu (sesi lab lain tidak tampil/ditolak), lalu **membuka sesi**; status berubah menjadi `Dibuka` pada aplikasi praktikan secara real-time dan `startedAt` terisi.
3. Seorang praktikan mengajukan izin dan **Asprak menyetujuinya** → roster menampilkan **Izin** (bukan Hadir), tidak ada tagihan; praktikan tersebut tidak dapat presensi mandiri pada sesi itu.
4. Asprak memantau roster real-time, mencatat presensi manual untuk praktikan yang bermasalah perangkat, lalu **menutup sesi**.
5. Aslab membuka **Dashboard**, memeriksa jumlah lab/praktikan, status tiap lab, jadwal berlangsung/mendatang, riwayat kegiatan, dan berganti filter **Hari → Minggu → Bulan** sehingga angka berubah sesuai periode.

### Skenario 3: Keterlambatan, Denda & Pembayaran Midtrans Sandbox
1. **Tepat Waktu vs Terlambat:** Praktikan A presensi tepat pada akhir grace period → `hadir` (tanpa tagihan). Praktikan B presensi setelah grace period → `terlambat`; dalam beberapa detik `attendanceStatus` final dari server dan **tepat satu** tagihan `fines/{sessionId_studentId}` terbit. Upaya presensi kedua ditolak; tidak ada tagihan ganda.
2. **Notifikasi Tagihan:** Praktikan B menerima notifikasi "tagihan denda baru" dan melihat tagihan di **Tagihan** (nominal, sesi, menit terlambat).
3. **Pembayaran Sandbox:** Praktikan B menekan **Bayar Sekarang** → aplikasi memanggil backend → membuka halaman Midtrans Sandbox → membayar (VA/QRIS via *Midtrans Sandbox Simulator* atau kartu uji). Halaman hasil awalnya **Menunggu Verifikasi**; setelah webhook valid berubah menjadi **Pembayaran Berhasil**, tagihan menjadi **Lunas**, notifikasi pembayaran berhasil muncul, dan **status kehadiran tetap `terlambat`**.
4. **Pembayaran Gagal/Kedaluwarsa:** Pada tagihan lain, transaksi dibiarkan kedaluwarsa atau ditolak → status `failed`, notifikasi gagal/butuh penyelesaian muncul, tagihan kembali `Belum Dibayar` dan dapat dibayar ulang dengan `orderId` baru.
5. **Keamanan:** Webhook dengan signature palsu atau nominal salah ditolak tanpa mengubah data; percobaan menulis langsung ke `fines`/`payments` dari client ditolak oleh Rules; pencarian server key pada bundel/repo kosong.
6. **Persistensi:** Aplikasi ditutup lalu dibuka kembali (atau offline) → **Riwayat Pembayaran** tetap menampilkan sesi, tanggal tagihan, nominal, waktu transaksi, dan status.
7. **Dashboard Keuangan:** Aslab melihat transaksi tersebut pada riwayat keuangan Dashboard sesuai filter periode.

---

## 9. Panduan Teknis, Protokol Kolaborasi Git & Prompt 3 Programmer

### 9.1 Ringkasan Branch Git Sprint 4
Tiga branch independen disiapkan dari titik `main` terbaru pasca-merge Sprint 3 (catat hash commit saat branch dibuat: `<isi-hash-commit>`):
1. **Programmer 1:** `feature/sprint4-aslab-lab-management`
2. **Programmer 2:** `feature/sprint4-dashboard-asprak-session`
3. **Programmer 3:** `feature/sprint4-midtrans-fines-payment`

> [!IMPORTANT]
> **Aturan Git:**
> - Setiap programmer bekerja eksklusif di branch masing-masing dan hanya mengubah berkas yang menjadi miliknya pada Tabel 4.1.
> - Gunakan `npx expo install <package>` untuk dependensi Expo (`expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-web-browser`, `@react-native-async-storage/async-storage`); gunakan `npm install` untuk `papaparse` dan `xlsx`.
> - Wajib lulus `npx tsc --noEmit` dan `npx expo lint` (serta `npm --prefix functions run build` untuk Programmer 3) sebelum commit atau merge ke `main`.
> - **Dilarang** meng-commit `.env`, kunci layanan, atau *server key* Midtrans.

### 9.2 Urutan Penggabungan (*Merge Protocol*)
1. **Tahap 0 (Kontrak):** Programmer 1 menyelesaikan **Stage 0** (tipe Bab 3, konstanta, util WIB/format, kerangka rules, stub layout Aslab) dan merge ke `main` lebih dulu. Programmer 2 & 3 segera `git merge main`.
2. **Tahap 1:** Programmer 1 menyelesaikan sisa branch (peran, lab, impor, pemindahan) dan merge ke `main` (menyediakan `lab_members`, `users.labId/labIds`, dan *route guard*).
3. **Tahap 2:** Programmer 2 dan Programmer 3 melakukan `git merge main`, menyelaraskan `_layout.tsx` dan seksi `firestore.rules`, lalu menguji integrasi: `startedAt` & status `izin` (P2) → trigger denda (P3); `fines`/`payments` (P3) → dashboard keuangan (P2).
4. **Tahap 3:** Merge `feature/sprint4-dashboard-asprak-session` lalu `feature/sprint4-midtrans-fines-payment` ke `main`, deploy Functions & Rules, lalu verifikasi 3 skenario demonstrasi utama (Bab 8).

---

### 9.3 Petunjuk Prompt Siap Pakai — Programmer 1
**Branch:** `feature/sprint4-aslab-lab-management`  
Salin prompt berikut untuk diberikan kepada Programmer 1 / AI Coding Agent:

````markdown
Halo AI Assistant, saya bertindak sebagai **Programmer 1 (Sprint 4)** pada proyek aplikasi mobile **PPK LabPortal** (React Native + Expo SDK 57, TypeScript, Expo Router, Firebase v13).
Saat ini saya bekerja di Git branch lokal: `feature/sprint4-aslab-lab-management`.
Rujuk spesifikasi lengkap di `SRS4.md` (khususnya Bab 3, 4, dan 5) dan patuhi aturan UI di `DESIGN.md`.

Tolong bantu saya mengimplementasikan **Peran Aslab, Manajemen Laboratorium, Tiga Alur Bulk/Single Insert Terpisah (Lab, Praktikan, Asprak) dengan Template Unduhan dan Daftar Tinjauan, serta Pemindahan Anggota**:

### 1. Stage 0 — Kerjakan DULU dan merge ke main lebih awal (dipakai Programmer 2 & 3):
1. `src/types/praktikum.ts`: salin PERSIS seluruh tipe pada Bab 3 SRS4 (`UserRole`, `UserDocument`, `CourseDocument`, `LabLocationDocument` yang diperluas, `LabMemberDocument`, `LabTransferDocument`, `ImportBatchDocument`, `SessionDocument`, `AttendanceDocument` + `AttendanceStatus`, `FineDocument`, `PaymentDocument`, `PaymentEventDocument`, `NotificationEventType`). Jangan mengubah nama/bentuk field.
2. `src/constants/praktikum-config.ts`: `DEFAULT_RADIUS_METER = 50`, `DEFAULT_GRACE_MINUTES = 15`, `DEFAULT_FINE_AMOUNT = 10000`, `TIMEZONE = 'Asia/Jakarta'`.
3. `src/utils/wib.ts` (`parseWibDateTime(tanggal, jam)`, `toWibDateString(date)`, `formatWib(iso)`) dan `src/utils/format.ts` (`formatRupiah(n)` memakai `Intl.NumberFormat('id-ID')`).
4. `firestore.rules`: buat kerangka dengan fungsi bantu `isAslab()`, `isAsprak()` (juga menerima `'asisten'`), `isPraktikan()`, `managesCourse(courseId)`, `teachesLab(labId)` dan penanda seksi `// ===== P1 =====`, `// ===== P2 =====`, `// ===== P3 =====` mengikuti tabel 3.11. Isi seksi P1 (`courses`, `labs`, `lab_members`, `lab_transfers`, `import_batches`, aturan `users`).
5. `src/app/aslab/_layout.tsx`: deklarasikan SEMUA rute Aslab (dashboard, jadwal, laboratorium, anggota, impor-lab, impor-praktikan, impor-asprak, pindah-anggota, peta-lab, notifikasi) dengan aksen Indigo (`#4F46E5`).

### 2. Peran & Akses:
1. `src/utils/role.ts`: `normalizeRole()` ('asisten' -> 'asprak'). Perbarui `AuthContext`: tiga peran, redirect pasca-login (aslab -> `/aslab/dashboard`, asprak -> `/asisten/jadwal`, praktikan -> `/praktikan/jadwal`), dan route guard untuk `/aslab/*`, `/asisten/*`, `/praktikan/*`.
2. Saat login, tautkan dokumen `lab_members` ber-`emailLower` sama dan `uid == null` (isi `uid`, sinkronkan `users.labId` / `users.labIds`). Kegagalan penautan tidak boleh menggagalkan login.
3. `scripts/seed-sprint4.ts`: seed mata kuliah PPK, lab contoh, dan akun Aslab contoh.

### 3. Manajemen Laboratorium:
1. `src/services/lab-service.ts` (perluas) dan `src/services/course-service.ts`.
2. `src/app/aslab/laboratorium.tsx` (pindahkan fungsi `lokasi-lab.tsx`; rute lama redirect): CRUD lab dengan nama, kode, gedung, mata kuliah, kapasitas, lat/lng (tombol "Gunakan Lokasi Saya Saat Ini"), `radiusMeter` (15-500), `graceMinutes` (0-120), `fineAmount` (1000-1000000, bilangan bulat). Sertakan `MetricsGrid`, filter mata kuliah, `EmptyState`, dan proteksi hapus bila lab masih punya anggota/sesi.

### 4. Tiga Alur Impor TERPISAH + Template + Daftar Tinjauan:
1. `src/components/import-review-list.tsx`, `src/hooks/use-import-draft.ts`, `src/services/import-parser.ts` (CSV via papaparse, XLSX via xlsx), `src/services/import-template-service.ts`.
2. Tiap baris menjadi kartu pada scroll view: badge validasi (Valid / Perlu Dilengkapi / Error / Duplikat-Konflik), edit inline, sorot sel wajib yang kosong, tombol Terima/Tolak per baris, Hapus/Duplikasi baris, aksi massal (Terima Semua Valid, Tolak Semua Error, Isi Kolom Kosong untuk Semua Baris), filter daftar, panel ringkasan sticky dengan tombol "Simpan N Data". Hanya baris diterima & valid yang ditulis, memakai `writeBatch` (maks. 200/batch) dengan ID deterministik; baris gagal tetap di daftar; catat ke `import_batches`.
3. Tiga layar BERBEDA (jangan digabung), masing-masing dengan template, validasi, dan service sendiri; mendukung unggah berkas dan "Tambah Satu Baris" (single insert):
   - `src/app/aslab/impor-lab.tsx` + `lab-import-service.ts`: pilih SATU mata kuliah; Generator Cepat N lab; kolom `nama_lab, kode_lab, gedung, latitude, longitude, radius_meter, grace_menit, nominal_denda, kapasitas, kelas`.
   - `src/app/aslab/impor-praktikan.tsx` + `member-import-service.ts`: pilih mata kuliah & lab tujuan; kolom `nim, nama, email, kode_lab(opsional)`; deteksi NIM ganda dan konflik (sudah di lab lain pada mata kuliah sama) dengan aksi "Pindahkan ke lab ini".
   - `src/app/aslab/impor-asprak.tsx`: kolom `nama, email, nim(opsional), kode_lab(opsional)`; asprak boleh mengampu banyak lab.
4. Template unduhan `.csv` (UTF-8 BOM) dan `.xlsx` per jenis impor berisi header, 1-2 baris contoh, dan petunjuk. Native: `expo-file-system` + `expo-sharing`; Web: Blob + tautan unduh.

### 5. Anggota & Pemindahan:
1. `src/app/aslab/anggota.tsx` (switcher Praktikan/Asprak, cari, filter lab, edit, hapus) dan `src/app/aslab/pindah-anggota.tsx` (pindah satu/banyak anggota ke lab lain pada mata kuliah yang sama via modal konfirmasi terpusat), `src/services/lab-member-service.ts`.
2. JANGAN memindahkan jadwal sesi; hanya keanggotaan. Catat `lab_transfers` dan sinkronkan `users.labId` / `users.labIds`.

### 6. Standar Kepatuhan Desain Mutlak (`DESIGN.md`):
- **Warna:** Aslab Indigo `#4F46E5` (tint `#EEF2FF`, border `#C7D2FE`), Canvas `#F8FAFC`, Kartu `#FFFFFF`, Border `#E2E8F0`. Valid hijau `#16A34A`, Perlu Dilengkapi amber `#D97706`, Error merah `#DC2626`.
- **Anti-Slop:** DILARANG KERAS menggunakan emoji di UI, baris impor, tombol, badge, maupun modal. Gunakan simbol geometris (`●`, `←`, `→`) dan teks tegas.
- **Layout:** Container desktop `maxWidth: 960`, `borderRadius: 14` (kartu), `borderRadius: 10` (tombol), `minHeight: 44`, setiap daftar punya `ListEmptyComponent`.

### 7. Verifikasi Wajib:
- Jalankan `npx tsc --noEmit` (0 error) dan `npx expo lint` (0 error).
- Uji template terunduh & terbaca ulang di Android/iOS/Web, impor 100+ baris, retry idempoten, dan penautan akun saat login pertama.
- Jangan push ke remote sebelum integrasi lokal selesai.
````

---

### 9.4 Petunjuk Prompt Siap Pakai — Programmer 2
**Branch:** `feature/sprint4-dashboard-asprak-session`  
Salin prompt berikut untuk diberikan kepada Programmer 2 / AI Coding Agent:

````markdown
Halo AI Assistant, saya bertindak sebagai **Programmer 2 (Sprint 4)** pada proyek aplikasi mobile **PPK LabPortal** (React Native + Expo SDK 57, TypeScript, Expo Router, Firebase v13).
Saat ini saya bekerja di Git branch lokal: `feature/sprint4-dashboard-asprak-session`.
Rujuk spesifikasi lengkap di `SRS4.md` (khususnya Bab 3, 4, dan 6) dan patuhi aturan UI di `DESIGN.md`.
Pastikan Stage 0 Programmer 1 sudah di-merge dari `main` (tipe, util WIB/format, kerangka rules, layout Aslab) sebelum mulai.

Tolong bantu saya mengimplementasikan **Dashboard Keberlangsungan Lab (Aslab), Jadwal Sesi oleh Aslab, Portal Asprak Terfokus, Presensi/Izin (Excused Absence), dan Finalisasi UI**:

### 1. Spesifikasi Teknis & Berkas yang Dikerjakan:
1. `src/services/dashboard-service.ts` & `src/app/aslab/dashboard.tsx` (+ `src/components/dashboard/*`):
   - Berlangganan `onSnapshot` ke `labs`, `lab_members`, `sessions`, `attendances`, `fines`, `payments` untuk `users.managedCourseIds` (kueri `in` dipecah per 30 ID, batasi hasil).
   - Tampilkan: `MetricsGrid` (Total Lab, Total Praktikan, Total Asprak, Sesi Berlangsung); status kegiatan tiap lab (Berlangsung/Terjadwal/Tidak Ada Kegiatan) dengan lokasi & waktu; daftar Sedang Berlangsung & Akan Datang; riwayat kegiatan (sesi `ditutup` + ringkasan hadir/terlambat/izin/belum hadir); riwayat keuangan denda (Diterbitkan, Terbayar, Menunggu, dan daftar transaksi `success`). Koleksi `fines`/`payments` hanya DIBACA (ditulis Programmer 3).
   - Filter segmented Hari | Minggu | Bulan (WIB; minggu Senin-Minggu) dengan navigasi `←` `→` antar periode. Sertakan skeleton memuat dan `EmptyState`.
2. `src/app/aslab/jadwal.tsx` & `src/services/session-service.ts`: CRUD sesi dengan `labId` wajib, `courseId` diturunkan dari lab, hitung `startAt` (WIB -> ISO UTC) dari `tanggal` + `waktuMulai`. Pertahankan `notifyScheduleChanged` (Sprint 3). Kontrol tambah/edit/hapus sesi HANYA di portal Aslab (hapus dari portal Asprak). Hapus sesi -> redirect `/aslab/jadwal`.
3. Portal Asprak (`src/app/asisten/jadwal.tsx`, `detail-sesi/[id].tsx`, `rekap.tsx`, `mahasiswa.tsx`):
   - Query sesi hanya `labId in users.labIds` (pecah per 30). Akses sesi lab lain -> redirect + pesan.
   - Buka sesi: `status: 'dibuka'`, `openedAt`, `kodeSesi`, dan isi `startedAt` HANYA bila belum ada (jangan pernah menimpa, termasuk "Buka Kembali Sesi"). Tutup sesi: `status: 'ditutup'`, `closedAt`. Pertahankan `notifySessionOpened`.
   - `mahasiswa.tsx` diubah menjadi "Kelas Saya" (anggota lab yang diampu, BACA SAJA). Asprak tidak boleh impor, pindah anggota, atau konfigurasi lab.
4. `src/components/attendance-roster.tsx` & `src/services/attendance-admin-service.ts`:
   - Roster dengan badge Hadir (hijau), Terlambat (amber + menit), Izin (biru, "Tidak Hadir dengan Izin"), Belum Hadir (abu); tab filter Semua/Hadir/Terlambat/Izin/Belum Hadir. Tingkat kehadiran = (hadir + terlambat) / praktikan aktif; izin dihitung terpisah.
   - Presensi manual oleh asprak untuk praktikan tanpa catatan: `attendanceStatus: 'hadir'`, `verificationMethod: 'manual-asprak'`, `verifiedByLocation: false`, `manualEntry` (catatan wajib). Edit/hapus presensi yang sudah ada TIDAK dibuat.
5. `src/services/leave-service.ts`: pada keputusan `disetujui`, dalam satu transaksi tulis status izin DAN dokumen `attendances/${sessionId}_${studentId}` berstatus `izin` (`excusedByLeaveId`, `verificationMethod: 'leave-approved'`, `verifiedByLocation: false`). Jika dokumen presensi sudah ada (hadir/terlambat) -> tolak persetujuan dengan pesan jelas. Izin TIDAK PERNAH menjadi `hadir`, TIDAK menerbitkan denda. `ditolak` tidak membuat catatan. Pertahankan notifikasi `leave_approved/leave_rejected`.
6. Finalisasi UI: perbarui `RoleHeader` (pill PRAKTIKAN/ASPRAK/ASLAB), landing `/` dengan kartu portal 3 peran, `src/app/aslab/peta-lab.tsx` (pakai ulang komponen peta Sprint 3), dan perbarui `DESIGN.md` (token Aslab Indigo, badge status Terlambat/Izin/Belum Dibayar/Menunggu Pembayaran/Lunas, blueprint layar Aslab & Tagihan, pola daftar tinjauan impor).
7. `firestore.rules`: lengkapi seksi `// ===== P2 =====` (`sessions`: aslab penuh; asprak hanya `status`, `openedAt`, `closedAt`, `startedAt`, `kodeSesi` pada lab yang diampu; `attendances`: asprak boleh create `izin`/manual untuk lab yang diampu).

### 2. Standar Kepatuhan Desain Mutlak (`DESIGN.md`):
- **Warna:** Praktikan `#EA580C`, Asprak `#0D9488`, Aslab `#4F46E5`, Canvas `#F8FAFC`, Kartu `#FFFFFF`, Border `#E2E8F0`. Hadir hijau, Terlambat amber `#D97706`, Izin/Info biru `#2563EB`, Error merah `#DC2626`.
- **Anti-Slop:** DILARANG KERAS menggunakan emoji di UI, badge, tombol, kartu, maupun modal. Gunakan `●`, `←`, `→`, inisial bulat, dan teks tegas.
- **Layout:** Container desktop `maxWidth: 960`, `borderRadius: 14` (kartu), `borderRadius: 10` (tombol), `minHeight: 44`, `ListEmptyComponent` di setiap daftar.

### 3. Verifikasi Wajib:
- Audit akhir: cari emoji pada seluruh `src`, periksa `maxWidth: 960`, `minHeight: 44`, dan empty state pada semua layar Sprint 4.
- Jalankan `npx tsc --noEmit` (0 error) dan `npx expo lint` (0 error).
- Uji sinkronisasi real-time buka/tutup sesi Asprak -> aplikasi Praktikan, serta perubahan angka dashboard antar filter.
- Jangan push ke remote sebelum integrasi lokal selesai.
````

---

### 9.5 Petunjuk Prompt Siap Pakai — Programmer 3
**Branch:** `feature/sprint4-midtrans-fines-payment`  
Salin prompt berikut untuk diberikan kepada Programmer 3 / AI Coding Agent:

````markdown
Halo AI Assistant, saya bertindak sebagai **Programmer 3 (Sprint 4)** pada proyek aplikasi mobile **PPK LabPortal** (React Native + Expo SDK 57, TypeScript, Expo Router, Firebase v13).
Saat ini saya bekerja di Git branch lokal: `feature/sprint4-midtrans-fines-payment`.
Rujuk spesifikasi lengkap di `SRS4.md` (khususnya Bab 3, 4, 7, dan 9.6) dan patuhi aturan UI di `DESIGN.md`.
Pastikan Stage 0 Programmer 1 sudah di-merge dari `main` (tipe, util WIB/format, kerangka rules) sebelum mulai.

Tolong bantu saya mengimplementasikan **Backend Cloud Functions, Perhitungan Keterlambatan & Denda, Integrasi Midtrans Sandbox (Snap + Webhook), UI Tagihan/Riwayat Pembayaran, serta Notifikasi Pembayaran**:

### 1. Spesifikasi Teknis & Berkas yang Dikerjakan:
1. Install: `npx expo install expo-web-browser @react-native-async-storage/async-storage`. Buat proyek `/functions` (Firebase Functions 2nd gen, Node 20, TypeScript, region `asia-southeast2`) dengan `firebase-functions` & `firebase-admin`. Gunakan `fetch` bawaan Node dan modul `crypto`.
2. `functions/src/config.ts`: `MIDTRANS_SERVER_KEY` via `defineSecret` (JANGAN di kode/`app.json`/`EXPO_PUBLIC_*`/repo/log). URL Snap `https://app.sandbox.midtrans.com`, API `https://api.sandbox.midtrans.com`. Perbarui `.gitignore` (`functions/.env*`, `functions/.runtimeconfig.json`).
3. Keterlambatan & denda:
   - `src/utils/lateness.ts`: `evaluateLateness({ startAt, startedAt, graceMinutes, checkedInAt })`. Aturan: `baselineAt = max(startAt, startedAt ?? startAt)`, `deadlineAt = baselineAt + graceMinutes` (grace = `session.graceMinutesOverride ?? lab.graceMinutes ?? 15`). Presensi sebelum atau TEPAT pada `deadlineAt` = `hadir`; setelahnya = `terlambat`.
   - `src/services/attendance-service.ts` & `src/app/praktikan/presensi.tsx`: pertahankan seluruh hard-validation Sprint 3; tulis `checkedInAt: serverTimestamp()`, `attendanceStatus` sementara, dan `lateness.evaluatedBy: 'client'`. Tampilkan hasil ("Hadir Tepat Waktu" / "Terlambat X menit — tagihan denda Rp ... akan diterbitkan") dan status "Memverifikasi" sampai `evaluatedBy == 'server'`. Jika dokumen presensi berstatus `izin`, tampilkan "Anda tercatat izin pada sesi ini".
   - `functions/src/lateness.ts` — trigger `onDocumentCreated('attendances/{id}')`: lewati `izin`/`manual-asprak`/`leave-approved`; hitung ulang memakai `createTime` dokumen (waktu server); update `attendanceStatus` & `lateness` (`evaluatedBy: 'server'`); bila terlambat buat `fines/{attendanceId}` dengan `create()` (abaikan ALREADY_EXISTS), `invoiceNumber` deterministik dari hash attendanceId, nominal snapshot `lab.fineAmount`, `status: 'unpaid'`; isi `attendances.fineId`; kirim `fine_created` HANYA bila tagihan benar-benar baru. Idempoten. Pembayaran TIDAK BOLEH menulis ke `attendanceStatus`.
4. Midtrans:
   - Callable `createPayment({ fineId })` (`functions/src/payments.ts`): wajib auth, `fine.studentId == auth.uid`, status `unpaid|pending`; bila ada payment `pending` yang belum kedaluwarsa, kembalikan `redirectUrl` yang sama; selain itu buat percobaan baru `orderId = ${invoiceNumber}-${attempt}` (maks. 50 karakter, tidak dipakai ulang). `POST /snap/v1/transactions` dengan Basic Auth `base64(serverKey + ':')`; `gross_amount` dari Firestore (bukan client); `item_details` nama <= 50 karakter; `expiry` 24 jam. Simpan `payments/{orderId}` + update `fines` (pending, `activePaymentId`, `paymentAttempts`) dalam satu transaksi. Balas `{ paymentId, redirectUrl }`; galat generik tanpa bocor detail.
   - HTTPS `midtransWebhook` (`functions/src/webhook.ts`): hanya POST; verifikasi `sha512(order_id + status_code + gross_amount + SERVER_KEY)` dengan perbandingan timing-safe (salah -> 403, catat `payment_events` `signatureValid:false`, tanpa ubah data); cocokkan `gross_amount`; rekonsiliasi via `GET /v2/{order_id}/status`; petakan status (settlement/capture+accept -> success; pending/capture+challenge -> pending; deny/cancel/expire/failure -> failed; refund diabaikan); transisi aman dalam transaksi (success final, pending tidak menimpa success/failed); update `payments`/`fines` (paid + paidAt, atau kembali unpaid); idempoten via `payment_events`; balas 200 cepat.
   - Opsional: `reconcilePendingPayments` terjadwal 15 menit via Status API.
5. UI Praktikan (aksen Terracotta `#EA580C`), semua dengan `MetricsGrid`, `EmptyState`, cache AsyncStorage per `uid`:
   - `src/app/praktikan/tagihan.tsx`: metrik (Total Tagihan, Belum Dibayar Rp, Menunggu, Lunas Rp), filter Semua/Belum Dibayar/Menunggu/Lunas.
   - `src/app/praktikan/tagihan/[id].tsx`: rincian sesi & nominal, catatan "pembayaran tidak mengubah status kehadiran", daftar percobaan, tombol Bayar Sekarang / Lanjutkan Pembayaran -> `createPayment` -> `expo-web-browser` (Web: tab baru).
   - `src/app/praktikan/pembayaran-hasil.tsx`: saat browser ditutup / `AppState` aktif, baca status dari Firestore real-time (Menunggu Verifikasi / Berhasil / Gagal + Coba Lagi). JANGAN menyimpulkan sukses dari penutupan browser/URL pengembalian.
   - `src/app/praktikan/riwayat-pembayaran.tsx`: sesi, tanggal tagihan, nominal, waktu transaksi, metode, status (pending/success/failed), filter status; tetap tersedia setelah app ditutup/dibuka lagi.
   - Tambah entry tab Tagihan & Riwayat Pembayaran di `src/app/praktikan/_layout.tsx` pada tahap integrasi.
   - `src/services/payment-service.ts`: pembungkus callable + listener `fines`/`payments`.
6. Notifikasi: `functions/src/notify.ts` (`sendToUser`): tulis `/notifications` dan kirim Expo Push; kegagalan push tidak menggagalkan proses utama. Event: `fine_created`, `payment_success`, `payment_failed`, `payment_action_required` (sekali saat pertama kali pending). Judul/isi tanpa emoji. Perbarui `use-notifications.ts` & `notifikasi.tsx`: ketukan -> `/praktikan/tagihan/[id]`.
7. `firestore.rules` seksi `// ===== P3 =====`: `fines` & `payments` (baca pemilik/aslab mata kuliah, tulis ditutup), `payment_events` (tertutup), `attendances` (praktikan hanya `create` miliknya dengan status `hadir|terlambat` tanpa `fineId`; update/delete ditutup untuk client).

### 2. Standar Kepatuhan Desain Mutlak (`DESIGN.md`):
- **Warna:** Praktikan `#EA580C`, Canvas `#F8FAFC`, Kartu `#FFFFFF`, Border `#E2E8F0`. Lunas/Berhasil hijau `#16A34A`, Menunggu/Terlambat amber `#D97706`, Belum Dibayar/Gagal merah `#DC2626`.
- **Anti-Slop:** DILARANG KERAS menggunakan emoji di kartu tagihan, badge, tombol, modal, maupun judul/isi notifikasi. Gunakan `●`, `←`, `→` dan teks tegas.
- **Layout:** Container desktop `maxWidth: 960`, `borderRadius: 14` (kartu), `borderRadius: 10` (tombol), `minHeight: 44`. Format `Rp 10.000` dan waktu WIB.

### 3. Verifikasi Wajib:
- Jalankan `npx tsc --noEmit`, `npx expo lint`, dan `npm --prefix functions run build` (0 error).
- Uji manual: tepat di batas grace = tepat waktu; telat = satu tagihan (presensi ganda ditolak); izin = tanpa tagihan; webhook signature salah/nominal salah ditolak; webhook duplikat idempoten; pembayaran sukses via Sandbox Simulator -> `paid` & kehadiran tetap `terlambat`; expire -> `failed` lalu bayar ulang dengan `orderId` baru.
- Pastikan pencarian `MIDTRANS_SERVER_KEY` / `SB-Mid-server` di repo & bundel tidak menemukan kunci. Jangan push ke remote sebelum integrasi lokal selesai.
````

---

### 9.6 Checklist Konfigurasi Midtrans Sandbox & Firebase Functions (Programmer 3, Disaksikan Tim)
1. Buat akun **Midtrans Sandbox**, ambil *Server Key* dan *Client Key* (Settings → Access Keys, lingkungan **Sandbox**). Hanya *Server Key* yang dipakai backend.
2. Simpan secret: `firebase functions:secrets:set MIDTRANS_SERVER_KEY` (tempel Server Key Sandbox).
3. Deploy: `firebase deploy --only functions,firestore:rules,firestore:indexes`. Catat URL `midtransWebhook` (`https://asia-southeast2-<project-id>.cloudfunctions.net/midtransWebhook`).
4. Pada Midtrans Sandbox Dashboard → Settings → Configuration, isi **Payment Notification URL** dengan URL webhook tersebut.
5. Uji pembayaran memakai **Midtrans Sandbox Simulator** (VA/QRIS/e-wallet) atau kartu uji sesuai dokumentasi resmi Midtrans Sandbox. Tidak ada uang asli yang dipakai.
6. Pengembangan lokal: gunakan Functions Emulator + *tunnel* HTTPS (mis. ngrok) untuk webhook, atau langsung uji pada Functions ter-*deploy*.

---

## 10. Kriteria Keberhasilan & Verifikasi Akhir (Acceptance Criteria)

- [ ] Seluruh tampilan baru (Dashboard Aslab, Laboratorium, Anggota, tiga layar Impor, Pindah Anggota, Jadwal Aslab, Tagihan, Detail Tagihan, Hasil Pembayaran, Riwayat Pembayaran) 100% patuh terhadap `DESIGN.md` dan bebas emoji generik.
- [ ] Tiga peran (Aslab, Asprak, Praktikan) masuk ke portal masing-masing; akses silang dialihkan; akun `asisten` lama terbaca sebagai Asprak.
- [ ] Aslab dapat mengelola laboratorium (nama, lokasi, koordinat, radius presensi, grace period, nominal denda) yang tersimpan persisten di Firestore.
- [ ] **Tiga** alur bulk/single insert (laboratorium per mata kuliah, praktikan ke lab, asprak ke lab) berjalan **terpisah**, masing-masing dengan template unduhan.
- [ ] Setiap baris impor tampil sebagai daftar scroll fleksibel yang dapat diterima/ditolak, diperbarui, dan dilengkapi datanya sebelum disimpan; hanya baris diterima & valid yang tertulis; retry bersifat idempoten.
- [ ] Praktikan dan asprak dapat dipindahkan antar laboratorium (satu/banyak) tanpa memindahkan jadwal; riwayat lama tetap utuh; satu praktikan hanya satu lab per mata kuliah.
- [ ] Dashboard Aslab menampilkan jumlah lab & praktikan, status kegiatan tiap lab, lokasi & waktu, jadwal berlangsung/mendatang, riwayat kegiatan, dan riwayat keuangan; filter hari/minggu/bulan mengubah data; seluruhnya bersumber dari Firestore.
- [ ] Asprak hanya melihat & mengelola lab yang diampu (buka sesi, pantau/kelola presensi, tutup sesi) dengan sinkronisasi real-time ke praktikan, dan tidak memiliki akses distribusi praktikan maupun konfigurasi lab.
- [ ] Keterlambatan dihitung dengan grace period yang dapat dikonfigurasi; presensi sebelum/tepat pada akhir grace = tepat waktu, setelahnya = terlambat.
- [ ] Setiap kejadian terlambat menghasilkan **tepat satu** tagihan nominal tetap yang terhubung ke praktikan, sesi, dan catatan presensi; pembayaran **tidak** mengubah status kehadiran.
- [ ] Izin yang disetujui Asprak tercatat `izin` (tidak hadir dengan izin), bebas denda, dan tidak pernah berubah menjadi hadir.
- [ ] Pembayaran melalui Midtrans Sandbox mengikuti alur client–server–payment gateway; status `pending/success/failed` hanya diperbarui oleh backend setelah webhook valid (signature, nominal, rekonsiliasi); secret key tidak ada di aplikasi/repo.
- [ ] Praktikan menerima notifikasi untuk tagihan baru, pembayaran berhasil, dan pembayaran gagal/butuh penyelesaian; semuanya tercatat di Pusat Notifikasi.
- [ ] Riwayat pembayaran menampilkan sesi, tanggal tagihan, nominal, waktu transaksi, dan status, serta tetap tersedia setelah aplikasi ditutup dan dibuka kembali.
- [ ] Seluruh kode di ketiga branch lolos `npx tsc --noEmit` (0 error), `npx expo lint` (0 error), dan `npm --prefix functions run build` (0 error).
