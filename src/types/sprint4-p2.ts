/**
 * ==============================================================================
 * PPK LabPortal — Tipe Lokal Sprint 4 (Programmer 2)
 * ==============================================================================
 * File ini SENGAJA terpisah dari `src/types/praktikum.ts` (milik Programmer 1 /
 * Stage 0) agar branch P2 tidak menimbulkan konflik merge.
 *
 * Setelah Stage 0 P1 di-merge ke main, konsolidasikan tipe di sini ke dalam
 * `src/types/praktikum.ts` dan hapus file ini.
 */

export type Sprint4Role = 'praktikan' | 'asprak' | 'aslab' | 'asisten';

/** Peran yang sudah dinormalisasi (legacy 'asisten' dibaca sebagai 'asprak'). */
export type NormalizedRole = 'praktikan' | 'asprak' | 'aslab';

export interface Sprint4UserDocument {
  uid: string;
  email: string;
  nama: string;
  peran?: Sprint4Role;
  nim?: string;
  kelas?: string;
  labId?: string;
  labIds?: string[];
  managedCourseIds?: string[];
  expoPushToken?: string;
  notificationsEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sprint4LabDocument {
  id: string;
  nama?: string;
  kode?: string;
  gedung?: string;
  kelas?: string;
  courseId?: string;
  courseNama?: string;
  latitude?: number;
  longitude?: number;
  radiusMeter?: number;
  graceMinutes?: number;
  fineAmount?: number;
  kapasitas?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sprint4SessionDocument {
  id: string;
  praktikum?: string;
  kelas?: string;
  materi?: string;
  tanggal: string; // YYYY-MM-DD (WIB)
  waktuMulai: string; // HH:mm (WIB)
  waktuSelesai?: string;
  ruang?: string;
  status: 'belum-dibuka' | 'dibuka' | 'ditutup';
  kodeSesi?: string;
  createdBy?: string;
  labId?: string;
  courseId?: string;
  radiusOverride?: number;
  qrPayload?: string;
  openedAt?: string;
  closedAt?: string;
  startAt?: string; // ISO UTC, dihitung dari tanggal + waktuMulai
  startedAt?: string; // ISO UTC, diisi sekali saat sesi pertama dibuka
  graceMinutesOverride?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type Sprint4AttendanceStatus = 'hadir' | 'terlambat' | 'izin';

export interface Sprint4AttendanceDocument {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  studentNim?: string;
  studentClass?: string;
  waktuKehadiran?: string;
  timestamp?: number;
  attendanceStatus?: Sprint4AttendanceStatus;
  checkedInAt?: unknown;
  verifiedByLocation?: boolean;
  verificationMethod?:
    | 'code-location'
    | 'qr-location'
    | 'manual-asprak'
    | 'leave-approved';
  excusedByLeaveId?: string;
  fineId?: string;
  manualEntry?: { by: string; note: string; at: string };
  lateness?: {
    baselineAt: string;
    graceMinutes: number;
    deadlineAt: string;
    minutesAfterStart: number;
    isLate: boolean;
    evaluatedBy: 'client' | 'server';
  };
  catatan?: string;
}

/** Status tampilan roster (termasuk praktikan yang belum punya dokumen). */
export type RosterStatus = 'hadir' | 'terlambat' | 'izin' | 'belum-hadir';

export interface Sprint4MemberDocument {
  id: string;
  courseId: string;
  labId: string;
  role: 'praktikan' | 'asprak';
  nim?: string;
  nama: string;
  email: string;
  emailLower?: string;
  uid?: string | null;
  status?: 'active' | 'removed';
}

/** Koleksi keuangan dibaca saja oleh P2 (ditulis backend oleh P3). */
export interface Sprint4FineDocument {
  id: string;
  studentId: string;
  studentName?: string;
  sessionId: string;
  labId?: string;
  courseId?: string;
  praktikum?: string;
  sessionDate?: string;
  amount: number;
  status: 'unpaid' | 'pending' | 'paid';
  paidAt?: string;
  createdAt?: string;
}

export interface Sprint4PaymentDocument {
  id: string;
  fineId?: string;
  studentId: string;
  sessionId?: string;
  courseId?: string;
  labId?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  midtransStatus?: string;
  paymentType?: string;
  transactionId?: string;
  settledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DashboardPeriod = 'hari' | 'minggu' | 'bulan';

export interface DashboardMetrics {
  totalLab: number;
  totalPraktikan: number;
  totalAsprak: number;
  sesiBerlangsung: number;
}

export interface DashboardLabStatus {
  labId: string;
  namaLab: string;
  gedung?: string;
  status: 'berlangsung' | 'terjadwal' | 'tidak-ada-kegiatan';
  waktu?: string;
  totalPraktikan: number;
  totalAsprak: number;
  kehadiranSesiBerjalan?: { hadir: number; terlambat: number; total: number };
}

export interface DashboardSessionItem {
  id: string;
  praktikum: string;
  kelas?: string;
  materi?: string;
  tanggal: string;
  waktuMulai: string;
  labId?: string;
  namaLab?: string;
  status: Sprint4SessionDocument['status'];
}

export interface DashboardHistoryItem extends DashboardSessionItem {
  hadir: number;
  terlambat: number;
  izin: number;
  belumHadir: number;
  openedAt?: string;
  closedAt?: string;
}

export interface DashboardFinanceSummary {
  diterbitkan: number;
  terbayar: number;
  menunggu: number;
  transaksi: {
    id: string;
    studentName: string;
    praktikum?: string;
    amount: number;
    time: string;
  }[];
}
