export type UserRole = 'praktikan' | 'asprak' | 'aslab';
export type RawUserRole = UserRole | 'asisten';

export interface UserDocument {
  uid: string;
  email: string;
  emailLower?: string;
  nama: string;
  peran: RawUserRole; // 'asisten' = legacy, dinormalisasi sebagai 'asprak'
  nim?: string;
  kelas?: 'A' | 'B';
  peranLab?: string;
  labId?: string; // PRAKTIKAN: laboratorium aktif (satu lab per mata kuliah)
  labIds?: string[]; // ASPRAK: daftar laboratorium yang diampu
  managedCourseIds?: string[]; // ASLAB: mata kuliah yang menjadi tanggung jawabnya
  fcmToken?: string;
  fcmTokenUpdatedAt?: string;
  expoPushToken?: string;
  pushTokenUpdatedAt?: string;
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Jenis peristiwa yang memicu notifikasi pada Sprint 3 & Sprint 4. */
export type NotificationEventType =
  | 'session_opened'
  | 'session_started'
  | 'schedule_updated'
  | 'leave_approved'
  | 'leave_rejected'
  | 'fine_created'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_action_required';

export type NotificationDeliveryStatus = 'sent' | 'failed' | 'in_app_only';

/** Log notifikasi di koleksi Firestore /notifications (juga dipakai sebagai fallback in-app). */
export interface NotificationDocument {
  id: string;
  targetUserId: string;
  targetRole: RawUserRole;
  eventType: NotificationEventType;
  title: string;
  body: string;
  relatedSessionId?: string;
  relatedLeaveId?: string;
  relatedFineId?: string;
  relatedPaymentId?: string;
  isRead: boolean;
  deliveryStatus: NotificationDeliveryStatus;
  createdAt: string;
}

export type SessionStatus = 'belum-dibuka' | 'dibuka' | 'ditutup';

export interface CourseDocument {
  id: string;
  kode: string;
  nama: string;
  semester?: string;
  aslabIds: string[];
  isActive: boolean;
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
  // Perluasan Sprint 4 (Bab 3.3)
  courseId?: string;
  courseNama?: string;
  kelas?: string;
  kapasitas?: number;
  graceMinutes?: number;
  fineAmount?: number;
}

export type LabMemberRole = 'praktikan' | 'asprak';
export type LabMemberStatus = 'active' | 'removed';

export interface LabMemberDocument {
  id: string;
  courseId: string;
  labId: string;
  role: LabMemberRole;
  nim?: string;
  kelas?: 'A' | 'B';
  nama: string;
  email: string;
  emailLower: string;
  uid?: string | null;
  status: LabMemberStatus;
  importBatchId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabTransferDocument {
  id: string;
  memberId: string;
  role: LabMemberRole;
  fromLabId: string;
  toLabId: string;
  courseId: string;
  movedBy: string;
  reason?: string;
  createdAt: string;
}

export type ImportBatchType = 'lab' | 'praktikan' | 'asprak';
export type ImportRowStatus = 'valid' | 'needs_input' | 'error' | 'duplicate' | 'conflict';
export type ImportRowDecision = 'accepted' | 'denied' | 'pending';

export interface ImportBatchDocument {
  id: string;
  type: ImportBatchType;
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

export interface ImportRowItem<TData> {
  rowNumber: number;
  raw: Record<string, string>;
  data: TData;
  status: ImportRowStatus;
  decision: ImportRowDecision;
  missingFields: string[];
  errors: string[];
  warnings: string[];
  saveError?: string;
  conflictInfo?: {
    existingMemberId: string;
    existingLabId: string;
    existingLabNama: string;
    resolveTransfer: boolean;
  };
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
  courseId?: string;
  radiusOverride?: number;
  graceMinutesOverride?: number;
  qrPayload?: string;
  startAt?: string;
  startedAt?: string;
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

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin';

export interface AttendanceLatenessInfo {
  baselineAt: string;
  graceMinutes: number;
  deadlineAt: string;
  minutesAfterStart: number;
  isLate: boolean;
  evaluatedBy: 'client' | 'server';
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
  verificationMethod:
    | 'code-location'
    | 'qr-location'
    | 'manual-asprak'
    | 'leave-approved';
  locationSnapshot?: AttendanceLocationSnapshot;
  // Perluasan Sprint 4 (Bab 3.7)
  labId?: string;
  courseId?: string;
  attendanceStatus?: AttendanceStatus;
  checkedInAt?: unknown;
  lateness?: AttendanceLatenessInfo;
  fineId?: string;
  excusedByLeaveId?: string;
  manualEntry?: { by: string; note: string; at: string };
}

export type FineStatus = 'unpaid' | 'pending' | 'paid';

export interface FineDocument {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  studentNim?: string;
  sessionId: string;
  attendanceId: string;
  labId: string;
  courseId: string;
  praktikum: string;
  sessionDate: string;
  lateMinutes: number;
  graceMinutes: number;
  amount: number;
  currency: 'IDR';
  status: FineStatus;
  activePaymentId?: string;
  paymentAttempts: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentDocument {
  id: string;
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
  status: PaymentStatus;
  midtransStatus?: string;
  fraudStatus?: string;
  paymentType?: string;
  transactionId?: string;
  snapToken: string;
  redirectUrl: string;
  expiresAt: string;
  settledAt?: string;
  failureReason?: string;
  lastWebhookAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEventDocument {
  id: string;
  orderId: string;
  signatureValid: boolean;
  transactionStatus?: string;
  statusCode?: string;
  grossAmount?: string;
  processed: boolean;
  receivedAt: string;
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
  attendanceStatus?: AttendanceStatus;
  lateMinutes?: number;
  fineId?: string;
};
