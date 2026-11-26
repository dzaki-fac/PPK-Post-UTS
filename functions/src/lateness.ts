/**
 * Trigger `onAttendanceCreated`: menghitung ulang keterlambatan secara otoritatif memakai
 * waktu server (createTime dokumen) dan menerbitkan tepat satu tagihan denda per kejadian.
 *
 * Aturan (SRS4 FR-P3-02):
 *  - baselineAt = max(startAt, startedAt ?? startAt)
 *  - deadlineAt = baselineAt + graceMinutes
 *  - presensi <= deadlineAt -> hadir; presensi > deadlineAt -> terlambat
 *  - izin / manual-asprak / leave-approved dilewati (tanpa denda)
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import {
  COLLECTIONS,
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  REGION,
  db,
} from './config';
import { sha256Hex } from './midtrans';
import { sendToUser } from './notify';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const ALREADY_EXISTS = 6;
const SKIPPED_METHODS = ['manual-asprak', 'leave-approved'];

const MONTH_INDEX: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, agt: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11,
};

/** Menggabungkan tanggal sesi + jam mulai (WIB) menjadi instant UTC. */
export function parseSessionStartAt(tanggal?: string, waktuMulai?: string): Date | null {
  if (!tanggal || !waktuMulai) return null;
  const time = waktuMulai.replace('.', ':').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!time) return null;
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (hour > 23 || minute > 59) return null;

  const clean = tanggal.trim();
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  const iso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
    day = Number(iso[3]);
  } else {
    const human = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (human) {
      day = Number(human[1]);
      month = MONTH_INDEX[human[2].toLowerCase()];
      year = Number(human[3]);
    }
  }
  if (year === undefined || month === undefined || day === undefined) return null;

  const ms = Date.UTC(year, month, day, hour, minute) - WIB_OFFSET_MS;
  return Number.isNaN(ms) ? null : new Date(ms);
}

export interface LatenessEvaluation {
  baselineAt: string;
  graceMinutes: number;
  deadlineAt: string;
  minutesAfterStart: number;
  isLate: boolean;
}

export function evaluateLateness(input: {
  startAt: Date;
  startedAt?: Date | null;
  graceMinutes: number;
  checkedInAt: Date;
}): LatenessEvaluation {
  const startedMs = input.startedAt ? input.startedAt.getTime() : input.startAt.getTime();
  const baselineMs = Math.max(input.startAt.getTime(), startedMs);
  const deadlineMs = baselineMs + input.graceMinutes * 60 * 1000;
  const checkedMs = input.checkedInAt.getTime();
  return {
    baselineAt: new Date(baselineMs).toISOString(),
    graceMinutes: input.graceMinutes,
    deadlineAt: new Date(deadlineMs).toISOString(),
    minutesAfterStart: Math.max(0, Math.floor((checkedMs - baselineMs) / 60000)),
    isLate: checkedMs > deadlineMs,
  };
}

function wibDateString(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Nomor invoice deterministik: INV-YYYYMMDD-XXXXXXXX (hash dari attendanceId). */
export function buildInvoiceNumber(attendanceId: string, referenceDate: Date): string {
  const datePart = wibDateString(referenceDate).replace(/-/g, '');
  return `INV-${datePart}-${sha256Hex(attendanceId).slice(0, 8).toUpperCase()}`;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const onAttendanceCreated = onDocumentCreated(
  { document: 'attendances/{attendanceId}', region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const attendanceId = event.params.attendanceId;
    const attendance = snapshot.data();

    if (
      attendance.attendanceStatus === 'izin' ||
      SKIPPED_METHODS.includes(String(attendance.verificationMethod))
    ) {
      return;
    }

    const sessionSnap = await db.collection(COLLECTIONS.sessions).doc(String(attendance.sessionId)).get();
    if (!sessionSnap.exists) {
      console.warn(`Sesi untuk presensi ${attendanceId} tidak ditemukan.`);
      return;
    }
    const session = sessionSnap.data() ?? {};

    const labId = String(session.labId ?? attendance.locationSnapshot?.labId ?? '');
    const labSnap = labId ? await db.collection(COLLECTIONS.labs).doc(labId).get() : null;
    const lab = labSnap?.exists ? (labSnap.data() ?? {}) : {};

    const graceMinutes = Number(
      session.graceMinutesOverride ?? lab.graceMinutes ?? DEFAULT_GRACE_MINUTES
    );
    const fineAmount = Math.round(Number(lab.fineAmount ?? DEFAULT_FINE_AMOUNT));

    const startAt = toDate(session.startAt) ?? parseSessionStartAt(session.tanggal, session.waktuMulai);
    if (!startAt) {
      console.warn(`Waktu mulai sesi ${attendance.sessionId} tidak dapat dihitung.`);
      return;
    }

    const checkedInAt = snapshot.createTime.toDate();
    const evaluation = evaluateLateness({
      startAt,
      startedAt: toDate(session.startedAt),
      graceMinutes: Number.isFinite(graceMinutes) ? graceMinutes : DEFAULT_GRACE_MINUTES,
      checkedInAt,
    });

    const attendanceRef = db.collection(COLLECTIONS.attendances).doc(attendanceId);
    const status = evaluation.isLate ? 'terlambat' : 'hadir';

    await attendanceRef.update({
      attendanceStatus: status,
      lateness: { ...evaluation, evaluatedBy: 'server' },
      ...(evaluation.isLate ? { fineId: attendanceId } : {}),
    });

    if (!evaluation.isLate) return;

    const now = new Date().toISOString();
    const studentId = String(attendance.studentId);
    const praktikum = String(session.praktikum ?? 'Praktikum');
    let created = false;

    try {
      await db.collection(COLLECTIONS.fines).doc(attendanceId).create({
        id: attendanceId,
        invoiceNumber: buildInvoiceNumber(attendanceId, checkedInAt),
        studentId,
        studentName: String(attendance.studentName ?? 'Praktikan'),
        ...(attendance.studentNim ? { studentNim: String(attendance.studentNim) } : {}),
        sessionId: String(attendance.sessionId),
        attendanceId,
        labId,
        courseId: String(lab.courseId ?? session.courseId ?? ''),
        praktikum,
        sessionDate: wibDateString(startAt),
        lateMinutes: evaluation.minutesAfterStart,
        graceMinutes: evaluation.graceMinutes,
        amount: fineAmount,
        currency: 'IDR',
        status: 'unpaid',
        paymentAttempts: 0,
        createdAt: now,
        updatedAt: now,
      });
      created = true;
    } catch (error) {
      if ((error as { code?: number }).code !== ALREADY_EXISTS) throw error;
    }

    if (created) {
      await sendToUser(
        studentId,
        {
          eventType: 'fine_created',
          title: 'Tagihan Denda Keterlambatan',
          body: `${praktikum}: terlambat ${evaluation.minutesAfterStart} menit. Denda Rp ${fineAmount
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.')} perlu dibayar.`,
          relatedFineId: attendanceId,
          relatedSessionId: String(attendance.sessionId),
        },
        `fine_created_${attendanceId}`
      );
    }
  }
);
