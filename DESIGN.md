# Portal Presensi Praktikum Design System

## 1. Overview & Identity

**Portal Presensi Praktikum** adalah aplikasi pencatatan dan pengelolaan kehadiran laboratorium akademik untuk mahasiswa (praktikan) dan asisten praktikum. 

- **Arah Gaya Visual**: Academic Modern (Clean, terstruktur, kontras tajam, profesional, mobile-first & desktop-responsive).
- **Karakter**: Andal, rapi, mudah dibaca cepat saat kegiatan lab berjalan, dan bebas dari ornamen berlebihan (*no generic AI-slop*).
- **Dial**:
  - **ENERGY 2** (Fokus, fungsional, menggunakan satu aksen warna utama yang bertenaga).
  - **RHYTHM 2** (Konsistensi layout kartu dan section dengan variasi hierarki yang logis).
  - **MOTION 1** (Transisi haluan, feedback klik responsif, tanpa animasi melayang yang mengganggu).

---

## 2. Palet Warna (Color System)

Sistem warna dibatasi secara disiplin pada 1 warna aksen utama, 1 netral slate, dan 3 warna status fungsional:

### Warna Utama (Primary Accent)
- **Primary Red-Orange** (`#EA580C`): Warna utama untuk aksi primer, identitas brand portal, ikon terpilih.
- **Primary Hover / Pressed** (`#C2410C`): State tombol aktif/ditekan.
- **Primary Tint** (`#FFF7ED`): Latar belakang badge halus, chip terpilih, dan highlight peran praktikan.
- **Primary Border** (`#FFEDD5`): Border elemen dengan aksen oranye lembut.

### Warna Netral (Slate Scale)
- **Background Utama** (`#F8FAFC`): Kanvas layar yang nyaman di mata.
- **Surface / Card** (`#FFFFFF`): Latar belakang kartu, modal sheet, dan header.
- **Text Heading** (`#0F172A`): Teks judul dengan kontras maksimal (WCAG AAA).
- **Text Body** (`#334155`): Teks isi, informasi utama.
- **Text Muted** (`#64748B`): Teks keterangan, timestamp, label metadata.
- **Border Default** (`#E2E8F0`): Garis pembatas kartu, divider, input stroke.

### Warna Status Fungsional (Status Accents)
- **Dibuka / Hadir (Success)**:
  - Dot & Ikon: `#16A34A`
  - Teks: `#15803D`
  - Latar Badge: `#DCFCE7`
  - Border: `#86EFAC`
- **Belum Dibuka / Menunggu (Warning)**:
  - Dot & Ikon: `#EAB308` / `#D97706`
  - Teks: `#B45309`
  - Latar Badge: `#FEF3C7`
  - Border: `#FDE68A`
- **Ditutup / Belum Hadir (Danger / Neutral-Muted)**:
  - Ditutup: Teks `#B91C1C`, Latar `#FEE2E2`, Border `#FCA5A5`, Dot `#DC2626`
  - Belum Hadir: Teks `#64748B`, Latar `#F1F5F9`, Border `#CBD5E1`, Dot `#94A3B8`

---

## 3. Tipografi & Skala Spacing

- **Heading 1 / Page Title**: 20–22px, Bold 800, warna `#0F172A`.
- **Card Title / Sesi Name**: 16–17px, SemiBold 700, warna `#0F172A`.
- **Subtitle / Deskripsi**: 13–14px, Regular 400–500, warna `#64748B`.
- **Metadata & Chips**: 11–12px, Medium 600.
- **Spacing Scale**: kelipatan 4px/8px (8, 12, 16, 20, 24, 32).

---

## 4. Pola Komponen & Tata Letak

### A. Konsistensi Cross-Platform (Mobile, Tablet, Web)
- **Web / Desktop Max Width**: Seluruh konten dibatasi pada `maxWidth: 840` dan terpusat (`alignSelf: 'center'`, `width: '100%'`). Hal ini mencegah kartu melebar secara berlebihan pada layar monitor lebar.
- **Mobile Safe Area**: Header dan top bar selalu menghitung `useSafeAreaInsets` agar tidak terpotong punch-hole kamera, notch, maupun status bar sistem.
- **Tap Targets**: Tombol dan elemen interaktif memiliki tinggi minimal 44px dengan feedback visual saat ditekan (`opacity: 0.85` atau `scale: 0.995`).

### B. Komponen Bersama
1. **`SesiCard`**: Digunakan bersama oleh Asisten dan Praktikan dengan tata letak yang identik: judul praktikum, chip kelas, badge status, baris tanggal/jam, dan lokasi lab.
2. **`StatusBadge`**: Menampilkan dot bulat + teks status dengan kombinasi warna background dan border yang kontras.
3. **`ConfirmationModal`**: Bottom sheet / dialog konfirmasi untuk seluruh aksi berisiko (buka sesi, tutup sesi, kirim presensi).
4. **`EmptyState`**: Tampilan terstruktur untuk kondisi data kosong dengan ikon konteks, judul tegas, pesan penjelasan, dan tombol aksi pemulih.
5. **`RoleHeader`**: Header identitas peran aktif di bagian atas dengan tombol beralih akun praktikan atau beralih peran ke beranda.
