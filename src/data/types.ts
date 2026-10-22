export type Praktikan = {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
};

export type Asisten = {
  id: string;
  nama: string;
};

export type StatusSesi = 'belum-dibuka' | 'dibuka' | 'ditutup';

export type Sesi = {
  id: string;
  praktikum: string;
  kelas: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  status: StatusSesi;
};

export type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuKehadiran: string;
};

export type Peran = 'praktikan' | 'asisten' | null;

export type IdentitasPengguna =
  | { peran: 'praktikan'; data: Praktikan }
  | { peran: 'asisten'; data: Asisten }
  | null;
