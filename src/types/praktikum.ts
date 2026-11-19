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
  labId?: string;
  radiusOverride?: number;
  qrPayload?: string;
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabLocationDocument {
  id: string;
  nama: string;
  kode: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  deskripsi?: string;
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabWithActivity {
  lab: LabLocationDocument;
  ongoingSession: SessionDocument | null;
  nextSession: SessionDocument | null;
  upcomingSessions: SessionDocument[];
  distanceMeters?: number;
  isUserInsideRadius?: boolean;
}

export interface LocationVerificationResult {
  status: 'within_radius' | 'outside_radius' | 'permission_denied' | 'services_disabled' | 'unavailable';
  distanceMeters?: number;
  allowedRadiusMeters?: number;
  userCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
  message: string;
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
  verifiedByCode?: boolean;
  verifiedByLocation?: boolean;
  verificationMethod?: 'code-location' | 'qr-location';
  locationSnapshot?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    distanceMeters: number;
    allowedRadiusMeters: number;
    labId: string;
    labName: string;
    checkedAt: string;
  };
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
  nim?: string;
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
