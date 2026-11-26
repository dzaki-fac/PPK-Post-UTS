import {
  COLLECTIONS,
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
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
    const named = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (named) {
      day = Number(named[1]);
      month = MONTH_INDEX[named[2].toLowerCase()];
      year = Number(named[3]);
    }
  }

  if (year === undefined || month === undefined || day === undefined) return null;
  const utcMs = Date.UTC(year, month, day, hour - 7, minute, 0, 0);
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluateLateness(
  checkedInAt: Date,
  baselineAt: Date,
  graceMinutes: number
) {
  const safeGrace = Number.isFinite(graceMinutes) && graceMinutes >= 0 ? graceMinutes : DEFAULT_GRACE_MINUTES;
  const deadlineAt = new Date(baselineAt.getTime() + safeGrace * 60 * 1000);
  const isLate = checkedInAt.getTime() > deadlineAt.getTime();
  const minutesAfterStart = Math.max(
    0,
    Math.floor((checkedInAt.getTime() - baselineAt.getTime()) / 60000)
  );
  return {
    baselineAt: baselineAt.toISOString(),
    graceMinutes: safeGrace,
    deadlineAt: deadlineAt.toISOString(),
    minutesAfterStart,
    isLate,
  };
}

export function buildInvoiceNumber(attendanceId: string, createdAt: Date): string {
  const wib = new Date(createdAt.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  const shortHash = sha256Hex(attendanceId).slice(0, 8).toUpperCase();
  return `INV-${y}${m}${d}-${shortHash}`;
}

function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export async function evaluateAttendanceFine(attendanceId: string): Promise<{
  status: 'hadir' | 'terlambat' | 'izin' | 'skipped';
  fineId?: string;
}> {
  const attRef = db.collection(COLLECTIONS.attendances).doc(attendanceId);
  const snap = await attRef.get();
  if (!snap.exists) {
    throw new Error('Dokumen presensi tidak ditemukan.');
  }

  const attendance = snap.data() ?? {};

  if (
    attendance.attendanceStatus === 'izin' ||
    SKIPPED_METHODS.includes(String(attendance.verificationMethod ?? ''))
  ) {
    return { status: 'izin' };
  }

  const sessionId = typeof attendance.sessionId === 'string' ? attendance.sessionId : '';
  const studentId = typeof attendance.studentId === 'string' ? attendance.studentId : '';
  if (!sessionId || !studentId) return { status: 'skipped' };

  const sessionSnap = await db.collection(COLLECTIONS.sessions).doc(sessionId).get();
  const session = sessionSnap.data();
  if (!session) return { status: 'skipped' };

  const labId = String(session.labId ?? attendance.labId ?? '');
  const labSnap = labId ? await db.collection(COLLECTIONS.labs).doc(labId).get() : null;
  const lab = labSnap?.data();

  const startAt =
    (typeof session.startAt === 'string' ? new Date(session.startAt) : null) ??
    parseSessionStartAt(session.tanggal, session.waktuMulai);
  const startedAt = typeof session.startedAt === 'string' ? new Date(session.startedAt) : null;

  let baselineAt: Date | null = null;
  if (startAt && !Number.isNaN(startAt.getTime())) {
    baselineAt =
      startedAt && !Number.isNaN(startedAt.getTime()) && startedAt.getTime() > startAt.getTime()
        ? startedAt
        : startAt;
  } else if (startedAt && !Number.isNaN(startedAt.getTime())) {
    baselineAt = startedAt;
  }
  if (!baselineAt) return { status: 'skipped' };

  const rawGrace =
    typeof session.graceMinutesOverride === 'number'
      ? session.graceMinutesOverride
      : typeof lab?.graceMinutes === 'number'
      ? lab.graceMinutes
      : DEFAULT_GRACE_MINUTES;

  const checkedInAt = snap.createTime ? snap.createTime.toDate() : new Date();
  const lateness = evaluateLateness(checkedInAt, baselineAt, rawGrace);
  const finalStatus = lateness.isLate ? 'terlambat' : 'hadir';

  await attRef.update({
    attendanceStatus: finalStatus,
    lateness: { ...lateness, evaluatedBy: 'server' },
    ...(lateness.isLate ? { fineId: attendanceId } : {}),
  });

  if (!lateness.isLate) {
    return { status: 'hadir' };
  }

  const rawAmount = typeof lab?.fineAmount === 'number' ? lab.fineAmount : DEFAULT_FINE_AMOUNT;
  const amount = Math.max(1000, Math.round(rawAmount));
  const nowIso = new Date().toISOString();
  const invoiceNumber = buildInvoiceNumber(attendanceId, checkedInAt);
  const praktikum = String(session.praktikum ?? attendance.praktikum ?? 'Praktikum');

  const fineRef = db.collection(COLLECTIONS.fines).doc(attendanceId);
  let created = false;
  try {
    await fineRef.create({
      id: attendanceId,
      invoiceNumber,
      studentId,
      studentName: String(attendance.studentName ?? 'Praktikan'),
      ...(attendance.studentNim ? { studentNim: String(attendance.studentNim) } : {}),
      sessionId,
      attendanceId,
      labId,
      courseId: String(session.courseId ?? lab?.courseId ?? ''),
      praktikum,
      sessionDate: String(session.tanggal ?? ''),
      lateMinutes: lateness.minutesAfterStart,
      graceMinutes: lateness.graceMinutes,
      amount,
      currency: 'IDR',
      status: 'unpaid',
      paymentAttempts: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    created = true;
  } catch (error) {
    const code = (error as { code?: number | string })?.code;
    if (code !== ALREADY_EXISTS && code !== 'already-exists') {
      throw error;
    }
  }

  if (created) {
    await sendToUser(
      studentId,
      {
        eventType: 'fine_created',
        title: 'Tagihan Denda Baru',
        body: `Anda tercatat terlambat pada sesi ${praktikum}. Tagihan sebesar ${formatRupiah(amount)} telah diterbitkan.`,
        relatedSessionId: sessionId,
        relatedFineId: attendanceId,
      },
      `fine_created_${attendanceId}`
    );
  }

  return { status: 'terlambat', fineId: attendanceId };
}
