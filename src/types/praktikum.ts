export type UserRole = 'praktikan' | 'asisten';

export interface UserDocument {
  uid: string;
  email: string;
  nama: string;
  peran: UserRole;
  nim?: string;
  kelas?: 'A' | 'B';
  peranLab?: string;
  expoPushToken?: string;
  pushTokenUpdatedAt?: string;
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Jenis peristiwa yang memicu notifikasi pada Sprint 3. */
export type NotificationEventType =
  | 'session_opened'
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
