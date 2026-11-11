import { Asisten, Praktikan, Presensi, Sesi } from '@/types/praktikum';

export const DUMMY_PRAKTIKAN: Praktikan[] = [
  { id: 'prak-1', nama: 'Ahmad Dahlan', nim: '24060122130001', kelas: 'A' },
  { id: 'prak-2', nama: 'Budi Santoso', nim: '24060122130002', kelas: 'A' },
  { id: 'prak-3', nama: 'Citra Dewi', nim: '24060122130003', kelas: 'A' },
  { id: 'prak-4', nama: 'Dimas Prasetyo', nim: '24060122140004', kelas: 'B' },
  { id: 'prak-5', nama: 'Eka Rahmawati', nim: '24060122140005', kelas: 'B' },
  { id: 'prak-6', nama: 'Fajar Nugraha', nim: '24060122130006', kelas: 'A' },
  { id: 'prak-7', nama: 'Gita Permata', nim: '24060122140007', kelas: 'B' },
  { id: 'prak-8', nama: 'Hanif Alamsyah', nim: '24060122130008', kelas: 'A' },
  { id: 'prak-9', nama: 'Indah Lestari', nim: '24060122140009', kelas: 'B' },
  { id: 'prak-10', nama: 'Joko Wicaksono', nim: '24060122130010', kelas: 'A' },
];

export const DUMMY_ASISTEN: Asisten[] = [
  { id: 'ast-1', nama: 'Kak Dzaki M.' },
  { id: 'ast-2', nama: 'Kak Akmal R.' },
];

export const DUMMY_SESI: Sesi[] = [
  {
    id: 'sesi-1',
    praktikum: 'Praktikum PPK',
    kelas: 'Kelas A',
    tanggal: '15 Okt 2026',
    waktuMulai: '07.30',
    waktuSelesai: '09.30',
    status: 'ditutup',
    ruang: 'Lab Komputasi 1',
    materi: 'Modul 1: Arsitektur Platform Khusus & Pengenalan Expo',
  },
  {
    id: 'sesi-2',
    praktikum: 'Praktikum PPK',
    kelas: 'Kelas A',
    tanggal: '22 Okt 2026',
    waktuMulai: '09.45',
    waktuSelesai: '11.45',
    status: 'dibuka',
    ruang: 'Lab Komputasi 2',
    materi: 'Modul 2: Komponen Interaktif, State & Context Management',
  },
  {
    id: 'sesi-3',
    praktikum: 'Praktikum PPK',
    kelas: 'Kelas A',
    tanggal: '29 Okt 2026',
    waktuMulai: '07.30',
    waktuSelesai: '09.30',
    status: 'belum-dibuka',
    ruang: 'Lab Komputasi 1',
    materi: 'Modul 3: Navigasi Lanjutan dengan Expo Router & Deep Linking',
  },
  {
    id: 'sesi-4',
    praktikum: 'Basis Data Terdistribusi',
    kelas: 'Kelas B',
    tanggal: '22 Okt 2026',
    waktuMulai: '13.00',
    waktuSelesai: '15.00',
    status: 'dibuka',
    ruang: 'Lab Rekayasa Perangkat Lunak',
    materi: 'Modul 4: Replikasi & Sharding Basis Data MongoDB',
  },
  {
    id: 'sesi-5',
    praktikum: 'Pemrograman Web Lanjut',
    kelas: 'Kelas A',
    tanggal: '24 Okt 2026',
    waktuMulai: '10.00',
    waktuSelesai: '12.00',
    status: 'belum-dibuka',
    ruang: 'Lab Jaringan',
    materi: 'Modul 3: Server Actions & Authentication pada Next.js',
  },
];

export const DUMMY_PRESENSI_AWAL: Presensi[] = [
  // Presensi awal untuk sesi-1 (yang sudah ditutup)
  {
    id: 'pres-1',
    sesiId: 'sesi-1',
    praktikanId: 'prak-1', // Ahmad Dahlan
    waktuKehadiran: '15 Okt 2026, 07:35 WIB',
  },
  {
    id: 'pres-2',
    sesiId: 'sesi-1',
    praktikanId: 'prak-2', // Budi Santoso
    waktuKehadiran: '15 Okt 2026, 07:38 WIB',
  },
  {
    id: 'pres-3',
    sesiId: 'sesi-1',
    praktikanId: 'prak-3', // Citra Dewi
    waktuKehadiran: '15 Okt 2026, 07:40 WIB',
  },
  {
    id: 'pres-4',
    sesiId: 'sesi-1',
    praktikanId: 'prak-6', // Fajar Nugraha
    waktuKehadiran: '15 Okt 2026, 07:44 WIB',
  },
  // Presensi awal untuk sesi-2 (sedang dibuka, tapi baru Citra dan Gita yang hadir)
  {
    id: 'pres-5',
    sesiId: 'sesi-2',
    praktikanId: 'prak-3', // Citra Dewi
    waktuKehadiran: '22 Okt 2026, 09:48 WIB',
  },
  {
    id: 'pres-6',
    sesiId: 'sesi-2',
    praktikanId: 'prak-6', // Fajar Nugraha
    waktuKehadiran: '22 Okt 2026, 09:50 WIB',
  },
];
