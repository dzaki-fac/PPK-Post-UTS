import { DEFAULT_GRACE_MINUTES } from '@/constants/praktikum-config';
import { AttendanceLatenessInfo } from '@/types/praktikum';
import { parseWibDateTime } from '@/utils/wib';

export interface EvaluateLatenessInput {
  startAt?: string;
  startedAt?: string;
  tanggal?: string;
  waktuMulai?: string;
  graceMinutes?: number;
  checkedInAt?: Date | number;
}

export interface EvaluateLatenessOutput {
  status: 'hadir' | 'terlambat';
  lateness: AttendanceLatenessInfo;
}

/**
 * Menghitung status keterlambatan berdasarkan baseline = max(startAt, startedAt) + graceMinutes.
 * Presensi sebelum atau TEPAT pada deadline dianggap tepat waktu ('hadir');
 * setelah melewati deadline dinyatakan 'terlambat'.
 */
export function evaluateLateness(input: EvaluateLatenessInput): EvaluateLatenessOutput {
  const checkedInMs =
    input.checkedInAt instanceof Date
      ? input.checkedInAt.getTime()
      : typeof input.checkedInAt === 'number'
      ? input.checkedInAt
      : Date.now();

  let startAtMs = input.startAt ? new Date(input.startAt).getTime() : NaN;
  if (Number.isNaN(startAtMs) && input.tanggal && input.waktuMulai) {
    const parsed = parseWibDateTime(input.tanggal, input.waktuMulai);
    if (parsed) {
      startAtMs = parsed.getTime();
    }
  }
  if (Number.isNaN(startAtMs)) {
    startAtMs = checkedInMs;
  }

  const startedAtMs = input.startedAt ? new Date(input.startedAt).getTime() : NaN;
  const baselineMs =
    !Number.isNaN(startedAtMs) && startedAtMs > startAtMs ? startedAtMs : startAtMs;

  const graceMinutes =
    input.graceMinutes !== undefined &&
    Number.isFinite(input.graceMinutes) &&
    input.graceMinutes >= 0
      ? Math.round(input.graceMinutes)
      : DEFAULT_GRACE_MINUTES;

  const deadlineMs = baselineMs + graceMinutes * 60 * 1000;
  const isLate = checkedInMs > deadlineMs;
  const minutesAfterStart = Math.max(0, Math.floor((checkedInMs - baselineMs) / 60000));

  return {
    status: isLate ? 'terlambat' : 'hadir',
    lateness: {
      baselineAt: new Date(baselineMs).toISOString(),
      graceMinutes,
      deadlineAt: new Date(deadlineMs).toISOString(),
      minutesAfterStart,
      isLate,
      evaluatedBy: 'client',
    },
  };
}
