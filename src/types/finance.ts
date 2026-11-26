/**
 * Tipe domain keuangan Sprint 4 (Programmer 3): keterlambatan, tagihan denda, dan pembayaran.
 * Sesuai SRS4 Bab 3.7 - 3.9. Seluruh dokumen `fines`, `payments` hanya ditulis backend (Admin SDK).
 */

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin';

export interface AttendanceLateness {
  baselineAt: string;
  graceMinutes: number;
  deadlineAt: string;
  minutesAfterStart: number;
  isLate: boolean;
  evaluatedBy: 'client' | 'server';
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
  snapToken?: string;
  redirectUrl?: string;
  expiresAt: string;
  settledAt?: string;
  failureReason?: string;
  lastWebhookAt?: string;
  createdAt: string;
  updatedAt: string;
}
