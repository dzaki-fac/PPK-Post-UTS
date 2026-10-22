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

export type SesiStatus = 'belum-dibuka' | 'dibuka' | 'ditutup';

export type Sesi = {
  id: string;
  praktikum: string; // mis. "Praktikum PPK"
  kelas: string;
  tanggal: string;
  waktuMulai: string; // mis. "07.00"
  waktuSelesai: string;
  status: SesiStatus;
  ruang?: string;
  materi?: string;
};

export type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuKehadiran: string; // timestamp saat presensi
};

export type RiwayatItem = Presensi & {
  sesi?: Sesi;
};
