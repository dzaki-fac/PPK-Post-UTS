import crypto from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  WIB_OFFSET_MS,
  adminDb,
} from './config.js';
import { formatRupiahId, sendToUser } from './notify.js';

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  agu: 7,
  agt: 7,
  aug: 7,
  agustus: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oct: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  des: 11,
  dec: 11,
  desember: 11,
};

function parseSessionStartMs(session: Record<string, unknown>): number | null {
  if (typeof session.startAt === 'string' && session.startAt) {
    const ms = new Date(session.startAt).getTime();
    if (!Number.isNaN(ms)) return ms;
  }

  const tanggal = typeof session.tanggal === 'string' ? session.tanggal.trim() : '';
  const waktuMulai = typeof session.waktuMulai === 'string' ? session.waktuMulai.trim() : '';
  if (!tanggal || !waktuMulai) return null;

  let year: number | undefined;
  let monthIndex: number | undefined;
  let day: number | undefined;

  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(tanggal);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    monthIndex = Number(isoMatch[2]) - 1;
    day = Number(isoMatch[3]);
  } else {
    const textMatch = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(tanggal);
    if (textMatch) {
      day = Number(textMatch[1]);
      monthIndex = MONTH_MAP[textMatch[2].toLowerCase()];
      year = Number(textMatch[3]);
    }
  }

  const timeClean = waktuMulai.replace('.', ':').replace(/wib/i, '').trim();
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeClean);
  if (
    year === undefined ||
    monthIndex === undefined ||
    day === undefined ||
    !timeMatch
  ) {
    return null;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  return Date.UTC(year, monthIndex, day, hour, minute, 0, 0) - WIB_OFFSET_MS;
}

function toWibYmd(ms: number): string {
  const wib = new Date(ms + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function toWibDateDashed(ms: number): string {
  const wib = new Date(ms + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDeterministicInvoiceNumber(
  attendanceId: string,
  referenceMs: number
): string {
  const ymd = toWibYmd(referenceMs);
  const shortHash = crypto
    .createHash('sha256')
    .update(attendanceId)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  return `INV-${ymd}-${shortHash}`;
}

export interface ServerLatenessOutcome {
  attendanceId: string;
  skipped?: boolean;
  attendanceStatus: 'hadir' | 'terlambat' | 'izin';
  lateMinutes: number;
  fineCreated: boolean;
  fineId?: string;
}

/**
 * Mengevaluasi keterlambatan presensi secara otoritatif di server menggunakan waktu server
 * dan menerbitkan tepat satu tagihan denda (`fines/{attendanceId}`) bila terlambat.
 */
export async function evaluateAttendanceLateness(
  attendanceId: string
): Promise<ServerLatenessOutcome | null> {
  const attRef = adminDb.collection('attendances').doc(attendanceId);
  const attSnap = await attRef.get();
  if (!attSnap.exists) {
    return null;
  }

  const attData = attSnap.data() as Record<string, unknown>;
  const existingStatus = String(attData.attendanceStatus ?? '');
  const method = String(attData.verificationMethod ?? '');

  // Lewati izin (excused absence) & presensi manual Asprak — tidak pernah menerbitkan denda
  if (
    existingStatus === 'izin' ||
    method === 'manual-asprak' ||
    method === 'leave-approved'
  ) {
    return {
      attendanceId,
      skipped: true,
      attendanceStatus: existingStatus === 'izin' ? 'izin' : 'hadir',
      lateMinutes: 0,
      fineCreated: false,
    };
  }

  const existingLateness = attData.lateness as Record<string, unknown> | undefined;
  if (existingLateness?.evaluatedBy === 'server') {
    return {
      attendanceId,
      skipped: true,
      attendanceStatus: existingStatus === 'terlambat' ? 'terlambat' : 'hadir',
      lateMinutes: Number(existingLateness.minutesAfterStart ?? 0),
      fineCreated: false,
      ...(typeof attData.fineId === 'string' ? { fineId: attData.fineId } : {}),
    };
  }

  const sessionId = String(attData.sessionId ?? '');
  const sessionSnap = sessionId
    ? await adminDb.collection('sessions').doc(sessionId).get()
    : null;
  const sessionData = (sessionSnap?.data() as Record<string, unknown> | undefined) ?? {};

  const locationSnap = attData.locationSnapshot as Record<string, unknown> | undefined;
  const labId = String(
    sessionData.labId ?? locationSnap?.labId ?? ''
  ).trim();
  const labSnap = labId ? await adminDb.collection('labs').doc(labId).get() : null;
  const labData = (labSnap?.data() as Record<string, unknown> | undefined) ?? {};

  // Tentukan waktu server check-in
  let checkedInAtMs = attSnap.createTime?.toMillis() ?? Date.now();
  const rawCheckedInAt = attData.checkedInAt;
  if (rawCheckedInAt instanceof Timestamp) {
    checkedInAtMs = rawCheckedInAt.toMillis();
  } else if (
    rawCheckedInAt &&
    typeof rawCheckedInAt === 'object' &&
    'toMillis' in rawCheckedInAt &&
    typeof (rawCheckedInAt as { toMillis: () => number }).toMillis === 'function'
  ) {
    checkedInAtMs = (rawCheckedInAt as { toMillis: () => number }).toMillis();
  }

  const startAtMs = parseSessionStartMs(sessionData) ?? checkedInAtMs;
  const startedAtMsRaw =
    typeof sessionData.startedAt === 'string' && sessionData.startedAt
      ? new Date(sessionData.startedAt).getTime()
      : NaN;
  const baselineMs =
    !Number.isNaN(startedAtMsRaw) && startedAtMsRaw > startAtMs
      ? startedAtMsRaw
      : startAtMs;

  const graceRaw =
    sessionData.graceMinutesOverride ?? labData.graceMinutes ?? DEFAULT_GRACE_MINUTES;
  const graceMinutes =
    Number.isFinite(Number(graceRaw)) && Number(graceRaw) >= 0
      ? Math.round(Number(graceRaw))
      : DEFAULT_GRACE_MINUTES;

  const deadlineMs = baselineMs + graceMinutes * 60 * 1000;
  const isLate = checkedInAtMs > deadlineMs;
  const minutesAfterStart = Math.max(
    0,
    Math.floor((checkedInAtMs - baselineMs) / 60000)
  );
  const finalStatus: 'hadir' | 'terlambat' = isLate ? 'terlambat' : 'hadir';

  const latenessPayload = {
    baselineAt: new Date(baselineMs).toISOString(),
    graceMinutes,
    deadlineAt: new Date(deadlineMs).toISOString(),
    minutesAfterStart,
    isLate,
    evaluatedBy: 'server' as const,
  };

  const courseId = String(sessionData.courseId ?? labData.courseId ?? 'ppk-2026');

  if (!isLate) {
    await attRef.update({
      attendanceStatus: 'hadir',
      lateness: latenessPayload,
      ...(labId ? { labId } : {}),
      ...(courseId ? { courseId } : {}),
    });
    return {
      attendanceId,
      attendanceStatus: 'hadir',
      lateMinutes: minutesAfterStart,
      fineCreated: false,
    };
  }

  // Terlambat -> buat tepat satu tagihan denda: fines/{attendanceId}
  const fineRaw = Number(labData.fineAmount ?? DEFAULT_FINE_AMOUNT);
  const fineAmount =
    Number.isFinite(fineRaw) && fineRaw > 0 ? Math.round(fineRaw) : DEFAULT_FINE_AMOUNT;
  const nowIso = new Date().toISOString();
  const invoiceNumber = buildDeterministicInvoiceNumber(attendanceId, checkedInAtMs);
  const studentId = String(attData.studentId ?? '');
  const studentName = String(attData.studentName ?? 'Praktikan');
  const studentNim =
    typeof attData.studentNim === 'string' ? attData.studentNim : undefined;
  const praktikum = String(sessionData.praktikum ?? 'Praktikum PPK');
  const sessionDate = toWibDateDashed(startAtMs);

  const fineRef = adminDb.collection('fines').doc(attendanceId);
  let fineCreated = false;

  try {
    await fineRef.create({
      id: attendanceId,
      invoiceNumber,
      studentId,
      studentName,
      ...(studentNim ? { studentNim } : {}),
      sessionId,
      attendanceId,
      labId,
      courseId,
      praktikum,
      sessionDate,
      lateMinutes: minutesAfterStart,
      graceMinutes,
      amount: fineAmount,
      currency: 'IDR',
      status: 'unpaid',
      paymentAttempts: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    fineCreated = true;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code: unknown }).code
        : null;
    if (code !== 6 && code !== 'already-exists') {
      throw err;
    }
  }

  await attRef.update({
    attendanceStatus: 'terlambat',
    lateness: latenessPayload,
    fineId: attendanceId,
    ...(labId ? { labId } : {}),
    ...(courseId ? { courseId } : {}),
  });

  if (fineCreated && studentId) {
    await sendToUser(studentId, {
      eventType: 'fine_created',
      title: 'Tagihan Denda Keterlambatan Baru',
      body: `Anda tercatat terlambat ${minutesAfterStart} menit pada ${praktikum}. Tagihan sebesar ${formatRupiahId(
        fineAmount
      )} (${invoiceNumber}) telah diterbitkan.`,
      relatedSessionId: sessionId,
      relatedFineId: attendanceId,
    });
  }

  return {
    attendanceId,
    attendanceStatus: 'terlambat',
    lateMinutes: minutesAfterStart,
    fineCreated,
    fineId: attendanceId,
  };
}

/**
 * Memantau dokumen presensi baru yang belum dievaluasi oleh server agar otomatis terproses
 * meskipun client offline sesaat setelah menulis dokumen ke Firestore.
 */
export function startAttendanceWatcher(): () => void {
  const q = adminDb
    .collection('attendances')
    .where('lateness.evaluatedBy', '==', 'client')
    .limit(50);

  return q.onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          void evaluateAttendanceLateness(change.doc.id).catch((err) => {
            console.warn(
              `[lateness] Gagal mengevaluasi ${change.doc.id}:`,
              err instanceof Error ? err.message : err
            );
          });
        }
      });
    },
    (err) => {
      console.warn('[lateness] Watcher berhenti sementara:', err.message);
    }
  );
}
