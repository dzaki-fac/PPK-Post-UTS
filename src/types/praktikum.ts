export type UserRole = 'praktikan' | 'asprak' | 'aslab';
export type RawUserRole = UserRole | 'asisten';

export interface UserDocument {
  uid: string;
  email: string;
  emailLower?: string;
  nama: string;
  peran: RawUserRole;
  nim?: string;
  kelas?: 'A' | 'B';
  peranLab?: string;
  angkatan?: string;
  courseId?: string;
  labId?: string;
  labIds?: string[];
  managedCourseIds?: string[];
  fcmToken?: string | null;
  fcmTokenUpdatedAt?: string;
  expoPushToken?: string;
  pushTokenUpdatedAt?: string;
  notificationsEnabled?: boolean;
  pushEnabled?: boolean;
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
  | 'fine_issued'
  | 'payment_uploaded'
  | 'payment_verified'
  | 'payment_rejected'
  | 'lab_transferred';

export type NotificationDeliveryStatus = 'sent' | 'failed' | 'in_app_only';

/** Log notifikasi di koleksi Firestore /notifications (kompatibel Sprint 3 & Sprint 4). */
export interface NotificationDocument {
  id: string;
  targetUserId: string;
  targetRole: RawUserRole;
  userId?: string;
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
export type SesiStatus = SessionStatus;
export type LeaveStatus = 'menunggu' | 'disetujui' | 'ditolak';

export type AttendanceStatus =
  | 'hadir'
  | 'terlambat'
  | 'izin'
  | 'alfa'
  | 'hadir-terlambat'
  | 'belum-hadir'
  | 'pulang';

export type LabMemberRole = 'praktikan' | 'asprak';
export type LabMemberStatus = 'active' | 'removed';

export type ImportBatchType = 'labs' | 'praktikan' | 'asprak';
export type ImportRowStatus = 'valid' | 'needs_input' | 'error' | 'duplicate' | 'conflict';

export type FineStatus = 'unpaid' | 'pending_verification' | 'paid' | 'waived';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';

export interface CourseDocument {
  id: string;
  kode: string;
  nama: string;
  semester: string;
  aslabIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LabLocationDocument {
  id: string;
  courseId?: string;
  courseNama?: string;
  nama: string;
  kode: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  graceMinutes?: number;
  fineAmount?: number;
  kapasitas?: number;
  kelas?: string;
  deskripsi?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabMemberDocument {
  id: string;
  courseId: string;
  labId: string;
  labNama: string;
  role: LabMemberRole;
  uid: string | null;
  nim?: string;
  nama: string;
  email: string;
  emailLower: string;
  status: LabMemberStatus;
  importedBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabTransferDocument {
  id: string;
  courseId: string;
  memberId: string;
  memberNama: string;
  memberRole: LabMemberRole;
  nim?: string;
  fromLabId: string;
  fromLabNama: string;
  toLabId: string;
  toLabNama: string;
  alasan?: string;
  transferredBy: string;
  transferredByNama: string;
  createdAt: string;
}

export interface ImportBatchDocument {
  id: string;
  type: ImportBatchType;
  courseId: string;
  targetLabId?: string;
  fileName?: string;
  totalRows: number;
  acceptedCount: number;
  rejectedCount: number;
  createdBy: string;
  createdByNama: string;
  createdAt: string;
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
  // Sprint 3 fields
  praktikum: string;
  kelas: 'Kelas A' | 'Kelas B' | string;
  materi: string;
  tanggal: string; // YYYY-MM-DD (WIB)
  waktuMulai: string; // HH:mm (WIB)
  waktuSelesai: string; // HH:mm (WIB)
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
  // Sprint 4 additions
  courseId?: string;
  judul?: string;
  modulNomor?: number;
  jamMulai?: string;
  jamSelesai?: string;
  ruangan?: string;
  graceMinutes?: number;
  fineAmount?: number;
  asistenId?: string;
  asistenNama?: string;
  qrSecret?: string;
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
  // Sprint 3 fields
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  studentClass: 'A' | 'B' | string;
  waktuKehadiran: string;
  timestamp: number;
  catatan?: string;
  deviceInfo?: string;
  verifiedByCode: boolean;
  verifiedByLocation: boolean;
  verificationMethod: 'code-location' | 'qr-location';
  locationSnapshot?: AttendanceLocationSnapshot;
  // Sprint 4 additions
  sesiId?: string;
  sesiJudul?: string;
  courseId?: string;
  labId?: string;
  labNama?: string;
  tanggal?: string;
  mahasiswaId?: string;
  mahasiswaNama?: string;
  mahasiswaNim?: string;
  status?: AttendanceStatus;
  waktuCheckIn?: string;
  waktuCheckOut?: string;
  lateMinutes?: number;
  fineId?: string;
  fineAmount?: number;
  jarakMeter?: number;
  latitude?: number;
  longitude?: number;
  qrToken?: string;
  createdAt?: string;
}

export interface FineDocument {
  id: string;
  courseId: string;
  labId: string;
  labNama: string;
  sesiId: string;
  sesiJudul: string;
  tanggal: string;
  attendanceId: string;
  mahasiswaId: string;
  mahasiswaNama: string;
  mahasiswaNim: string;
  reason: 'late' | 'alpha';
  lateMinutes?: number;
  amount: number;
  status: FineStatus;
  paymentId?: string;
  waiveReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDocument {
  id: string;
  courseId: string;
  labId: string;
  mahasiswaId: string;
  mahasiswaNama: string;
  mahasiswaNim: string;
  fineIds: string[];
  totalAmount: number;
  method: string;
  proofImageBase64: string;
  proofMimeType: string;
  proofNote?: string;
  status: PaymentStatus;
  verifiedBy?: string;
  verifiedByNama?: string;
  verifiedAt?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEventDocument {
  id: string;
  paymentId: string;
  actorId: string;
  actorNama: string;
  actorRole: RawUserRole;
  action: 'uploaded' | 'verified' | 'rejected' | 'resubmitted';
  note?: string;
  createdAt: string;
}

export interface LeaveRequestDocument {
  id: string;
  mahasiswaId: string;
  mahasiswaNama: string;
  mahasiswaNim: string;
  kelas: string;
  sesiId: string;
  sesiJudul: string;
  tanggalSesi: string;
  alasan: string;
  status: LeaveStatus;
  diprosesOlehId?: string;
  diprosesOlehNama?: string;
  catatanAsisten?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionLiveStats {
  totalPraktikan: number;
  totalHadir: number;
  totalTerlambat: number;
  totalIzin: number;
  totalAlfa: number;
  attendanceRate: number;
}

export type LabOccupancyStatus = 'kosong' | 'aktif' | 'terkunci';

export interface LabLiveSummary {
  lab: LabLocationDocument;
  activeSession: SessionDocument | null;
  occupancyStatus: LabOccupancyStatus;
  checkedInCount: number;
  latestCheckInNama: string | null;
  latestCheckInTime: string | null;
}

export interface ImportRowItem<TData> {
  rowNumber: number;
  raw: Record<string, string>;
  data: TData;
  status: ImportRowStatus;
  accepted: boolean;
  missingFields: string[];
  errors: string[];
  warnings: string[];
  conflictInfo?: {
    existingMemberId: string;
    existingLabId: string;
    existingLabNama: string;
    resolveTransfer: boolean;
  };
}

// Kompatibilitas alias tipe UI Sprint 2-3
export type Praktikan = {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  email?: string;
  labId?: string;
  courseId?: string;
};

export type Asisten = {
  id: string;
  nama: string;
  nim?: string;
  peranLab?: string;
  email?: string;
};

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
