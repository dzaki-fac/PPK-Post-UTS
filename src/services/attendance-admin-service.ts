/**
 * ==============================================================================
 * PPK LabPortal — Attendance Admin Service (Sprint 4 / Programmer 2)
 * ==============================================================================
 * Menyusun roster presensi (Hadir / Terlambat / Izin / Belum Hadir) dan
 * mencatat presensi manual oleh asprak. TIDAK mengubah catatan yang sudah ada.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  RosterStatus,
  Sprint4AttendanceDocument,
} from '@/types/sprint4-p2';
import { hitungKehadiran } from '@/utils/sprint4-p2-helpers';
import { buildAttendanceId } from './attendance-service';

const ATTENDANCES_COLLECTION = 'attendances';

export interface RosterStudent {
  id: string;
  nama: string;
  nim?: string;
  kelas?: string;
}

export interface LeaveMarker {
  studentId: string;
  studentName?: string;
  alasan?: string;
}

export interface RosterEntry {
  id: string;
  studentId: string;
  nama: string;
  nim: string;
  kelas: string;
  status: RosterStatus;
  waktu?: string;
  menitTerlambat?: number;
  alasanIzin?: string;
  verificationMethod?: string;
  catatan?: string;
}

export interface RosterStats {
  total: number;
  hadir: number;
  terlambat: number;
  izin: number;
  belumHadir: number;
  persentaseHadir: number;
}

function normalisasiKelas(kelas?: string): string {
  const value = (kelas ?? '').trim().toUpperCase();
  return value.endsWith('A') || value.endsWith('B') ? value.slice(-1) : value;
}

export function formatWibClock(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

/** Menggabungkan praktikan, catatan presensi, dan izin menjadi satu roster. */
export function buildAttendanceRoster(
  students: RosterStudent[],
  attendances: Sprint4AttendanceDocument[],
  approvedLeaves: LeaveMarker[] = []
): RosterEntry[] {
  const attendanceMap = new Map<string, Sprint4AttendanceDocument>();
  attendances.forEach((item) => {
    if (item.studentId) attendanceMap.set(item.studentId, item);
  });
  const leaveMap = new Map<string, LeaveMarker>();
  approvedLeaves.forEach((item) => {
    if (item.studentId) leaveMap.set(item.studentId, item);
  });

  const entries: RosterEntry[] = students.map((student) => {
    const attendance = attendanceMap.get(student.id);
    const leave = leaveMap.get(student.id);
    // Kompatibilitas mundur: dokumen Sprint 3 tidak punya attendanceStatus,
    // tetapi keberadaan dokumen presensi berarti hadir.
    const status: RosterStatus = attendance
      ? attendance.attendanceStatus
        ? hitungKehadiran(attendance.attendanceStatus)
        : 'hadir'
      : leave
        ? 'izin'
        : 'belum-hadir';
    const timestamp = typeof attendance?.timestamp === 'number' ? attendance.timestamp : 0;

    return {
      id: attendance?.id || buildAttendanceId(attendance?.sessionId ?? '', student.id),
      studentId: student.id,
      nama: student.nama || attendance?.studentName || 'Praktikan',
      nim: student.nim || attendance?.studentNim || '',
      kelas: normalisasiKelas(student.kelas || attendance?.studentClass),
      status,
      waktu:
        status === 'izin'
          ? undefined
          : timestamp > 0
            ? formatWibClock(timestamp)
            : attendance?.waktuKehadiran,
      menitTerlambat: attendance?.lateness?.minutesAfterStart,
      alasanIzin: leave?.alasan || attendance?.catatan,
      verificationMethod: attendance?.verificationMethod,
      catatan: attendance?.manualEntry?.note || attendance?.catatan,
    };
  });

  // Catatan presensi tanpa akun praktikan yang cocok tetap ditampilkan.
  attendances.forEach((attendance) => {
    if (attendance.studentId && attendanceMap.has(attendance.studentId)) {
      if (students.some((s) => s.id === attendance.studentId)) return;
    }
    entries.unshift({
      id: attendance.id,
      studentId: attendance.studentId,
      nama: attendance.studentName || 'Praktikan',
      nim: attendance.studentNim || '',
      kelas: normalisasiKelas(attendance.studentClass),
      status: attendance.attendanceStatus
        ? hitungKehadiran(attendance.attendanceStatus)
        : 'hadir',
      waktu:
        typeof attendance.timestamp === 'number'
          ? formatWibClock(attendance.timestamp)
          : attendance.waktuKehadiran,
      menitTerlambat: attendance.lateness?.minutesAfterStart,
      verificationMethod: attendance.verificationMethod,
      catatan: attendance.manualEntry?.note || attendance.catatan,
    });
  });

  return entries;
}

export function hitungStatistikRoster(entries: RosterEntry[]): RosterStats {
  const hadir = entries.filter((e) => e.status === 'hadir').length;
  const terlambat = entries.filter((e) => e.status === 'terlambat').length;
  const izin = entries.filter((e) => e.status === 'izin').length;
  const total = entries.length;
  return {
    total,
    hadir,
    terlambat,
    izin,
    belumHadir: entries.filter((e) => e.status === 'belum-hadir').length,
    // Izin tidak dihitung sebagai hadir (SRS4 FR-P2-04.2).
    persentaseHadir: total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0,
  };
}

export interface ManualAttendanceInput {
  sessionId: string;
  student: RosterStudent;
  asprakUid: string;
  catatan: string;
}

export interface ManualAttendanceResult {
  success: boolean;
  message: string;
}

/**
 * Presensi manual oleh asprak untuk praktikan yang belum punya catatan.
 * Tidak pernah menimpa catatan yang sudah ada dan tidak menerbitkan denda.
 */
export async function createManualAttendance(
  input: ManualAttendanceInput
): Promise<ManualAttendanceResult> {
  const catatan = input.catatan.trim();
  if (catatan.length < 3) {
    return { success: false, message: 'Catatan presensi manual wajib diisi (minimal 3 karakter).' };
  }
  if (!input.sessionId || !input.student.id) {
    return { success: false, message: 'Sesi atau praktikan tidak valid.' };
  }

  const attendanceId = buildAttendanceId(input.sessionId, input.student.id);
  try {
    const ref = doc(db, ATTENDANCES_COLLECTION, attendanceId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return {
        success: false,
        message: 'Praktikan sudah memiliki catatan presensi. Catatan tidak dapat diubah.',
      };
    }

    const now = Date.now();
    await setDoc(ref, {
      id: attendanceId,
      sessionId: input.sessionId,
      studentId: input.student.id,
      studentName: input.student.nama,
      studentNim: input.student.nim ?? '',
      studentClass: normalisasiKelas(input.student.kelas),
      attendanceStatus: 'hadir',
      verifiedByCode: false,
      verifiedByLocation: false,
      verificationMethod: 'manual-asprak',
      manualEntry: { by: input.asprakUid, note: catatan, at: new Date(now).toISOString() },
      catatan,
      waktuKehadiran: formatWibClock(now),
      timestamp: now,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });

    return { success: true, message: 'Presensi manual berhasil dicatat.' };
  } catch (error) {
    console.warn('Gagal mencatat presensi manual:', error);
    return { success: false, message: 'Gagal menyimpan presensi manual. Coba lagi.' };
  }
}

/** Dipakai praktikan (koordinasi P2–P3): apakah sesi ini berstatus izin? */
export async function isExcusedFromSession(
  sessionId: string,
  studentId: string
): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, ATTENDANCES_COLLECTION, buildAttendanceId(sessionId, studentId)));
    return snap.exists() && snap.data()?.attendanceStatus === 'izin';
  } catch {
    return false;
  }
}
