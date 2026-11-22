export type UserRole = 'praktikan' | 'asisten';

export interface UserDocument {
  uid: string;
  email: string;
  nama: string;
  peran: UserRole;
  nim?: string;
  kelas?: 'A' | 'B';
  peranLab?: string;
  fcmToken?: string;
  fcmTokenUpdatedAt?: string;
  expoPushToken?: string;
  pushTokenUpdatedAt?: string;
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Jenis peristiwa yang memicu notifikasi pada Sprint 3. */
export type NotificationEventType =
  | 'session_opened'
  | 'session_started'
  | 'schedule_updated'
  | 'leave_approved'
  | 'leave_rejected';

export type NotificationDeliveryStatus = 'sent' | 'failed' | 'in_app_only';

/** Log notifikasi di koleksi Firestore /notifications (juga dipakai sebagai fallback in-app). */
export interface NotificationDocument {
  id: string;
  targetUserId: string;
  targetRole: UserRole;
  eventType: NotificationEventType;
  title: string;
  body: string;
  relatedSessionId?: string;
  relatedLeaveId?: string;
  isRead: boolean;
  deliveryStatus: NotificationDeliveryStatus;
  createdAt: string;
}

export type SessionStatus = 'belum-dibuka' | 'dibuka' | 'ditutup';

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

export type LocationReadinessStatus =
  | 'ready'
  | 'permission_denied'
  | 'services_disabled'
  | 'unavailable';

export type LocationVerificationStatus =
  | 'within_radius'
  | 'outside_radius'
  | 'permission_denied'
  | 'services_disabled'
  | 'unavailable';

export interface LocationVerificationResult {
  status: LocationVerificationStatus;
  isWithinRadius: boolean;
  distanceMeters?: number;
  allowedRadiusMeters: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  userCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
  labId: string;
  labName: string;
  checkedAt: string;
  message: string;
}

export interface AttendanceLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceMeters: number;
  allowedRadiusMeters: number;
  labId: string;
  labName: string;
  checkedAt: string;
}

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

export interface LabWithActivity {
  lab: LabLocationDocument;
  ongoingSession: SessionDocument | null;
  nextSession: SessionDocument | null;
  upcomingSessions: SessionDocument[];
  distanceMeters?: number;
  isUserInsideRadius?: boolean;
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
  verifiedByLocation: boolean;
  verificationMethod: 'code-location' | 'qr-location';
  locationSnapshot?: AttendanceLocationSnapshot;
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
