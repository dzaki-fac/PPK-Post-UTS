export type UserRole = 'praktikan' | 'asisten';

export interface UserDocument {
  uid: string;
  email: string;
  nama: string;
  peran: UserRole;
  nim?: string;
  kelas?: 'A' | 'B';
  peranLab?: string;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'belum-dibuka' | 'dibuka' | 'ditutup';

export interface SessionDocument {
  id: string;
  praktikum: string;
  kelas: 'Kelas A' | 'Kelas B';
  materi: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  ruang: string;
  status: SessionStatus;
  kodeSesi: string;
  createdBy: string;
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDocument {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  studentClass: 'A' | 'B';
  waktuKehadiran: string;
  timestamp: number;
  catatan?: string;
  deviceInfo?: string;
  verifiedByCode: boolean;
}

export type Praktikan = {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
};

export type Asisten = {
  id: string;
  nama: string;
  peranLab?: string;
};

export type SesiStatus = SessionStatus;

export type Sesi = {
  id: string;
  praktikum: string;
  kelas: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  status: SesiStatus;
  ruang?: string;
  materi?: string;
  kodeSesi?: string;
};

export type Presensi = {
  id: string;
  sesiId: string;
  praktikanId: string;
  waktuKehadiran: string;
};

export type RiwayatItem = Presensi & {
  sesi?: Sesi;
};
