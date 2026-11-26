/**
 * Perhitungan keterlambatan di sisi client (hasil sementara). Hasil final selalu
 * dihitung ulang backend memakai waktu server (lihat functions/src/lateness.ts).
 *
 * Aturan (SRS4 FR-P3-02.1):
 *  baselineAt = max(startAt, startedAt ?? startAt)
 *  deadlineAt = baselineAt + graceMinutes
 *  checkedInAt <= deadlineAt -> 'hadir'; checkedInAt > deadlineAt -> 'terlambat'
 */

import type { AttendanceLateness } from '@/types/finance';
import type { SessionDocument } from '@/types/praktikum';

export const DEFAULT_GRACE_MINUTES = 15;
export const DEFAULT_FINE_AMOUNT = 10000;

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

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

/** Instant mulai terjadwal sebuah sesi: memakai `startAt` bila ada, jika tidak dihitung dari tanggal + jam. */
export function resolveSessionStartAt(
  session: Pick<SessionDocument, 'startAt' | 'tanggal' | 'waktuMulai'>
): Date | null {
  if (session.startAt) {
    const parsed = new Date(session.startAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseSessionStartAt(session.tanggal, session.waktuMulai);
}

export interface EvaluateLatenessInput {
  startAt: Date | string;
  startedAt?: Date | string | null;
  graceMinutes: number;
  checkedInAt: Date | string;
}

export interface LatenessResult extends Omit<AttendanceLateness, 'evaluatedBy'> {
  attendanceStatus: 'hadir' | 'terlambat';
}

function toMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Fungsi murni: tepat pada deadline = tepat waktu, setelahnya = terlambat. */
export function evaluateLateness(input: EvaluateLatenessInput): LatenessResult {
  const startMs = toMs(input.startAt);
  const startedMs = input.startedAt ? toMs(input.startedAt) : startMs;
  const baselineMs = Math.max(startMs, Number.isNaN(startedMs) ? startMs : startedMs);
  const deadlineMs = baselineMs + input.graceMinutes * 60 * 1000;
  const checkedMs = toMs(input.checkedInAt);
  const isLate = checkedMs > deadlineMs;

  return {
    baselineAt: new Date(baselineMs).toISOString(),
    graceMinutes: input.graceMinutes,
    deadlineAt: new Date(deadlineMs).toISOString(),
    minutesAfterStart: Math.max(0, Math.floor((checkedMs - baselineMs) / 60000)),
    isLate,
    attendanceStatus: isLate ? 'terlambat' : 'hadir',
  };
}
