# SRS — Aplikasi Pencatatan Kehadiran Praktikum

**Sprint 1: Antarmuka dan Alur Praktikum**
**Teknologi:** React Native (Expo + Expo Router), data dummy lokal, state management React

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini mendefinisikan kebutuhan perangkat lunak untuk aplikasi pencatatan kehadiran praktikum pada Sprint 1. Aplikasi didemonstrasikan dari dua sudut pandang: **praktikan** dan **asisten**.

### 1.2 Ruang Lingkup

- Membangun aplikasi React Native yang mendemonstrasikan alur: asisten membuka sesi → praktikan melakukan presensi → asisten melihat rekap → asisten menutup sesi.
- Menggunakan **data dummy lokal** (identitas pengguna, jadwal, sesi). Data absen **tidak perlu selaras antar peran** — perubahan data dikelola dengan state selama aplikasi berjalan.
- Fokus utama: **antarmuka responsif dan benar**, bukan persistensi database.

### 1.3 Definisi

| Istilah | Definisi |
|---|---|
| Praktikan | Mahasiswa yang mengikuti praktikum dan melakukan presensi |
| Asisten | Pengelola sesi praktikum (buka/tutup sesi, lihat rekap) |
| Sesi | Pertemuan praktikum pada waktu tertentu, punya status `Belum Dibuka`, `Dibuka`, atau `Ditutup` |
| Presensi | Tindakan praktikan mencatat kehadiran saat sesi berstatus `Dibuka` |

---

## 2. Deskripsi Umum

### 2.1 Karakteristik Pengguna

| Peran | Kebutuhan |
|---|---|
| Praktikan | Melihat jadwal & detail sesi, melakukan presensi saat sesi dibuka, melihat catatan kehadiran sendiri |
| Asisten | Melihat jadwal, membuka & menutup sesi, memantau kehadiran, melihat rekap presensi |

### 2.2 Pemilihan Peran dan Identitas

- Peran dan identitas dipilih melalui **pilihan sederhana di dalam aplikasi** (layar pemilihan peran → pilih nama dari daftar dummy).
- Tidak ada autentikasi nyata; identitas cukup berupa nama + NIM/nomor praktikan.

### 2.3 Batasan (Constraints)

- Semua data berasal dari berkas dummy di `src/data/`.
- Tidak ada backend, tidak ada persistensi (AsyncStorage opsional; state in-memory sudah cukup).
- Tata letak disusun dengan **Flexbox**; perpindahan halaman memakai **navigasi Expo Router**; interaksi memakai **state** agar UI merespons aksi pengguna.
- Konfirmasi/informasi pendukung memakai **Modal atau Bottom Sheet**.

---

## 3. Kebutuhan Fungsional

### FR-1 — Pemilihan Peran dan Identitas

- **FR-1.1** Aplikasi menampilkan layar depan untuk memilih peran: *Praktikan* atau *Asisten*.
- **FR-1.2** Setelah memilih peran, pengguna memilih identitas dari daftar dummy (mis. nama dan NIM).
- **FR-1.3** Peran aktif ditampilkan pada antarmuka (mis. badge/nama di header), dan navigasi botton/tab menyesuaikan peran (tab berbeda untuk praktikan vs asisten).

### FR-2 — Jadwal dan Detail Sesi

- **FR-2.1** Pengguna dapat melihat daftar jadwal praktikum (nama praktikum, kelas, waktu).
- **FR-2.2** Pengguna dapat membuka halaman detail sesi yang menampilkan informasi: nama praktikum, kelas, waktu, dan **status sesi** (`Belum Dibuka` / `Dibuka` / `Ditutup`).
- **FR-2.3** Status sesi ditampilkan dengan indikasi visual yang jelas (warna/label).

### FR-3 — Pengelolaan Sesi (Asisten)

- **FR-3.1** Asisten dapat **membuka sesi** yang berstatus `Belum Dibuka`, melalui tombol + konfirmasi Modal/Bottom Sheet.
- **FR-3.2** Asisten dapat **menutup sesi** yang berstatus `Dibuka`, melalui tombol + konfirmasi Modal/Bottom Sheet.
- **FR-3.3** Perubahan status sesi harus langsung terlihat pada semua antarmuka yang menampilkan sesi tersebut (daftar jadwal, detail sesi).
- **FR-3.4** Sesi yang sudah ditutup tidak dapat dibuka kembali, dan praktikan tidak dapat presensi padanya.

### FR-4 — Pencatatan Presensi (Praktikan)

- **FR-4.1** Praktikan dapat melakukan presensi pada sesi dengan status `Dibuka` (tidak pada `Belum Dibuka` atau `Ditutup`).
- **FR-4.2** Aplikasi mencatat **waktu kehadiran** saat presensi dilakukan.
- **FR-4.3** Aplikasi memberikan **umpan balik** bahwa presensi berhasil (toast/alert/konfirmasi Modal, dsb).
- **FR-4.4** Praktikan yang sama **tidak dapat presensi dua kali** pada sesi yang sama; tombol/aksi dinonaktifkan atau berubah menjadi status "sudah presensi".
- **FR-4.5** Presensi dilakukan melalui **form** (mis. tombol presensi atau form konfirmasi), disertai konfirmasi Modal/Bottom Sheet.

### FR-5 — Rekap Sederhana

- **FR-5.1** Asisten melihat **daftar praktikan yang sudah presensi** beserta waktu kehadiran pada sesi yang dibuka/ditutup.
- **FR-5.2** Praktikan melihat **riwayat kehadiran miliknya sendiri** (sesi, tanggal, waktu presensi, status).
- **FR-5.3** Daftar menampilkan status kehadiran seluruh praktikan dummy (hadir / belum hadir).

### FR-6 — Interaksi dan Umpan Balik Antarmuka

- **FR-6.1** Penerimaan masukan/pilihan pengguna menggunakan **form**.
- **FR-6.2** Konfirmasi aksi (buka/tutup sesi, presensi) dan informasi pendukung menggunakan **Modal atau Bottom Sheet**.
- **FR-6.3** Tampilan harus merespons tindakan pengguna (perubahan status, presensi) secara instan melalui state.

---

## 4. Kebutuhan Non-Fungsional

| ID | Kebutuhan |
|---|---|
| NFR-1 | **Tata letak.** Semua skrin disusun dengan Flexbox. |
| NFR-2 | **Navigasi.** Perpindahan halaman memakai Expo Router; struktur rute jelas per peran. |
| NFR-3 | **Tampilan kosong.** Ada empty state untuk: daftar masih kosong, sesi belum dibuka, presensi sudah tercatat. |
| NFR-4 | **Konsistensi.** Informasi nama, kelas, waktu, status konsisten pada poin-poin antarmuka terkait. |
| NFR-5 | **Keterbacaan.** Label, warna status, dan hierarki informasi jelas pada kedua peran. |
| NFR-6 | Data dummy mudah diganti nantinya (dipisahkan di `src/data/`). |

---

## 5. Model Data Dummy (`src/data/`)

```ts
type Praktikan = { id: string; nama: string; nim: string; kelas: string };
type Asisten = { id: string; nama: string };

type Sesi = {
  id: string;
  praktikum: string;   // mis. "Praktikum PPK"
  kelas: string;
  tanggal: string;
  waktuMulai: string;  // mis. "07.00"
  waktuSelesai: string;
  status: "belum-dibuka" | "dibuka" | "ditutup";
};

type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuKehadiran: string; // timestamp saat presensi
};
```

- Minimal **5–8 praktikan**, **2 asisten**, **4–6 sesi** dengan campuran status awal.
- State dibungkus dalam **Context** (mis. `PraktikumContext`) agar perubahan sesi/presensi bisa mengalir ke banyak layar.

---

## 6. Struktur Rute (Expo Router)

```
src/app/
  index.tsx                  → pemilihan peran (FR-1)
  praktikan/
    _layout.tsx              → navigasi praktikan (Tabs/Jadwal, Riwayat)
    jadwal.tsx               → daftar jadwal + detail sesi (FR-2)
    detail-sesi/[id].tsx     → detail sesi + tombol presensi (FR-4)
    riwayat.tsx              → catatan kehadiran sendiri (FR-5.2)
  asisten/
    _layout.tsx              → navigasi asisten (Jadwal, Rekap)
    jadwal.tsx               → daftar jadwal + kontrol buka/tutup (FR-3)
    detail-sesi/[id].tsx     → detail sesi + buka/tutup + rekap (FR-3, FR-5.1)
```

Komponen bersama (`src/components/`): kartu sesi, badge status, modal konfirmasi, empty state.

---

## 7. Kriteria Penerimaan / Hasil Akhir

Aplikasi dapat mendemonstrasikan alur berikut dengan informasi konsisten di kedua peran:

1. Asisten memilih identitas → melihat jadwal → **membuka sesi** (via Modal konfirmasi).
2. Praktikan memilih identitas → melihat jadwal → membuka detail sesi yang **Dibuka** → **melakukan presensi** → menerima umpan balik berhasil; mencoba presensi lagi → **ditolak** (FR-4.4).
3. Asisten **melihat rekap** praktikan yang hadir + waktu kehadiran.
4. Asisten **menutup sesi**; praktikan tidak bisa presensi lagi pada sesi tersebut.

Selain itu:

- [ ] Daftar kosong, sesi belum dibuka, dan presensi tercatat punya tampilan tersendiri (NFR-3).
- [ ] Semua aksi berisiko dikonfirmasi lewat Modal/Bottom Sheet (FR-6.2).
- [ ] Lint (`npx expo lint`) dan typecheck (`npx tsc --noEmit`) lolos.

---

## 8. Pembagian Tugas — 2 Programmer

> Dibagi per **alur/lapisan** agar setiap programmer punya bagian end-to-end yang utuh, bukan sekadar "satu orang buat semua screen".

### Programmer A — Sisi Asisten + Fondasi Data

**Ruang lingkup:** fondasi data, pemilihan peran, dan seluruh sisi asisten.

| # | Tugas | Kebutuhan |
|---|---|---|
| A1 | Data dummy (`src/data/`) + Context/state global (`PraktikumContext`): daftar sesi, presensi, aksi `bukaSesi`, `tutupSesi`, `tandaiPresensi` (dengan validasi anti presensi ganda) | §5, FR-3.1, FR-4.4 |
| A2 | Layar pemilihan peran + identitas (`src/app/index.tsx`): pilih peran → pilih nama dari dummy | FR-1.1–1.3 |
| A3 | Rute & layout asisten (`src/app/asisten/`): Tabs "Jadwal" & "Rekap" | NFR-2, FR-1.3 |
| A4 | Layar jadwal & **detail sesi asisten** + tombol buka/tutup + indikasi status | FR-2.1–2.3, FR-3.1–3.2, FR-3.3 |
| A5 | Modal/Bottom Sheet konfirmasi buka sesi & tutup sesi | FR-3.1–3.2, FR-6.2 |
| A6 | Rekap presensi asisten (daftar praktikan yang hadir + waktu kehadiran) | FR-5.1, FR-5.3 |
| A7 | Empty state asisten: rekap kosong | NFR-3 |
| A8 | Lint + typecheck untuk file milik A (`npx expo lint`, `npx tsc --noEmit`) | §7 |

### Programmer B — Sisi Praktikan + Pola UI

**Ruang lingkup:** seluruh sisi praktikan dan komponen UI bersama.

| # | Tugas | Kebutuhan |
|---|---|---|
| B1 | Rute & layout praktikan (`src/app/praktikan/`): Tabs "Jadwal" & "Riwayat" | NFR-2, FR-1.3 |
| B2 | Dummy praktikan (nama + NIM, minimal 8 orang) + dummy riwayat awal (dikirim ke A untuk dimasukkan ke `src/data/`) | §5 |
| B3 | Layar jadwal & **detail sesi praktikan** (status sesi responsif terhadap state terbaru) | FR-2.1–2.3 |
| B4 | Layout & form **presensi** praktikan: tombol presensi/buka/tutup → konfirmasi Modal/Bottom Sheet → umpan balik berhasil | FR-4.1–4.3, FR-6.1, FR-6.2 |
| B5 | Cegah presensi ganda pada antarmuka: nonaktifkan tombol / tampilkan "sudah presensi" (validasi utamanya di context A) | FR-4.4 |
| B6 | Riwayat kehadiran praktikan (daftar sesi yang dihadiri + waktu) | FR-5.2 |
| B7 | Komponen UI bersama: kartu sesi + badge status (`Belum Dibuka`/`Dibuka`/`Ditutup`), dipakai kedua peran | NFR-4, NFR-5 |
| B8 | Empty state praktikan: belum ada sesi, presensi sudah tercatat, riwayat kosong | NFR-3 |
| B9 | Lint + typecheck untuk file milik B | §7 |

### Antarmuka Kerja (agar tidak bentrok)

- **A** menulis dan memelihara `src/context/praktikum-context.tsx` + `src/data/*.ts` (**API/context dan data dummy**).
- **B** hanya **menggunakan** context itu di layar praktikan; jika perlu API tambahan, minta pada **A** (mis. `tandaiPresensi(sesiId, praktikanId)` yang validasi ganda, dsb).
- **A** menulis: `src/app/asisten/*` + `src/app/index.tsx`.
- **B** menulis: `src/app/praktikan/*` + `src/components/` (kartu sesi, badge, modal, empty state).
- **Form presensi** milik **B**, tapi mutasi state dipanggil lewat action context dari **A** — sehingga prinsip "praktikan yang sama tidak dua kali" tetap satu sumber (di context **A**).
- **Integrasi & demo** (alur end-to-end: buka sesi → presensi → rekap → tutup sesi) dilakukan bersama setelah kedua pihak selesai.
