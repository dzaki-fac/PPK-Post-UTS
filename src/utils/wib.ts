import { WIB_OFFSET_MS } from '@/constants/praktikum-config';

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

const SHORT_MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Mengurai string tanggal (YYYY-MM-DD atau DD MMM YYYY Indo/Inggris) menjadi { year, monthIndex, day }.
 */
export function parseCalendarDateParts(
  tanggal: string
): { year: number; monthIndex: number; day: number } | null {
  const trimmed = (tanggal || '').trim();
  if (!trimmed) return null;

  // Format YYYY-MM-DD (atau YYYY/MM/DD)
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
      return { year, monthIndex, day };
    }
  }

  // Format DD MMM YYYY (mis. "19 Nov 2026" atau "12 Des 2026")
  const textMatch = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const monthKey = textMatch[2].toLowerCase();
    const monthIndex = MONTH_MAP[monthKey];
    const year = Number(textMatch[3]);
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      return { year, monthIndex, day };
    }
  }

  // Fallback parse umum
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const wib = new Date(parsed.getTime() + WIB_OFFSET_MS);
    return {
      year: wib.getUTCFullYear(),
      monthIndex: wib.getUTCMonth(),
      day: wib.getUTCDate(),
    };
  }

  return null;
}

/**
 * Mengurai string jam ("07.30" atau "07:30") menjadi { hour, minute }.
 */
export function parseTimeParts(jam: string): { hour: number; minute: number } | null {
  const cleaned = (jam || '').replace('.', ':').replace(/wib/i, '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Mengonversi tanggal + jam WIB menjadi objek Date (UTC epoch akurat).
 * Mendukung format Sprint 2-3 ("19 Nov 2026", "07.30") maupun standar ISO ("2026-11-19", "07:30").
 */
export function parseWibDateTime(tanggal: string, jam: string): Date | null {
  const dateParts = parseCalendarDateParts(tanggal);
  const timeParts = parseTimeParts(jam);
  if (!dateParts || !timeParts) return null;

  const utcMs =
    Date.UTC(
      dateParts.year,
      dateParts.monthIndex,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      0,
      0
    ) - WIB_OFFSET_MS;

  return new Date(utcMs);
}

/**
 * Mengonversi Date atau string tanggal ke format "YYYY-MM-DD" pada zona waktu WIB.
 */
export function toWibDateString(input: Date | string): string {
  if (typeof input === 'string') {
    const parts = parseCalendarDateParts(input);
    if (parts) {
      return `${parts.year}-${String(parts.monthIndex + 1).padStart(2, '0')}-${String(
        parts.day
      ).padStart(2, '0')}`;
    }
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return toWibDateString(parsed);
    }
    return '';
  }

  const wib = new Date(input.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Memformat ISO timestamp menjadi tampilan WIB ("19 Nov 2026, 07:30 WIB").
 */
export function formatWib(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const day = String(wib.getUTCDate()).padStart(2, '0');
  const month = SHORT_MONTHS_ID[wib.getUTCMonth()] ?? 'Jan';
  const year = wib.getUTCFullYear();
  const hour = String(wib.getUTCHours()).padStart(2, '0');
  const minute = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hour}:${minute} WIB`;
}

/**
 * Memformat "YYYY-MM-DD" atau tanggal Sprint 2-3 menjadi "19 Nov 2026".
 */
export function formatWibDateLabel(dateInput: Date | string): string {
  const ymd = toWibDateString(dateInput);
  const parts = parseCalendarDateParts(ymd);
  if (!parts) return typeof dateInput === 'string' ? dateInput : '-';
  return `${String(parts.day).padStart(2, '0')} ${SHORT_MONTHS_ID[parts.monthIndex] ?? 'Jan'} ${parts.year}`;
}

export type DashboardPeriodType = 'hari' | 'minggu' | 'bulan';

export interface WibPeriodRange {
  startMs: number;
  endMs: number;
  startDateStr: string;
  endDateStr: string;
  label: string;
}

/**
 * Menghitung rentang waktu WIB untuk filter Hari, Minggu (Senin-Minggu), atau Bulan kalender.
 */
export function getWibPeriodRange(
  period: DashboardPeriodType,
  anchorDate: Date = new Date()
): WibPeriodRange {
  const wib = new Date(anchorDate.getTime() + WIB_OFFSET_MS);
  const year = wib.getUTCFullYear();
  const month = wib.getUTCMonth();
  const day = wib.getUTCDate();

  if (period === 'hari') {
    const startMs = Date.UTC(year, month, day, 0, 0, 0, 0) - WIB_OFFSET_MS;
    const endMs = Date.UTC(year, month, day, 23, 59, 59, 999) - WIB_OFFSET_MS;
    const dateStr = toWibDateString(new Date(startMs));
    const dayIdx = new Date(Date.UTC(year, month, day)).getUTCDay();
    const label = `${SHORT_DAYS_ID[dayIdx]}, ${String(day).padStart(2, '0')} ${
      SHORT_MONTHS_ID[month]
    } ${year}`;
    return { startMs, endMs, startDateStr: dateStr, endDateStr: dateStr, label };
  }

  if (period === 'minggu') {
    const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay(); // 0=Min..6=Sab
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayUtc = new Date(Date.UTC(year, month, day + diffToMonday, 0, 0, 0, 0));
    const sundayUtc = new Date(
      Date.UTC(
        mondayUtc.getUTCFullYear(),
        mondayUtc.getUTCMonth(),
        mondayUtc.getUTCDate() + 6,
        23,
        59,
        59,
        999
      )
    );
    const startMs = mondayUtc.getTime() - WIB_OFFSET_MS;
    const endMs = sundayUtc.getTime() - WIB_OFFSET_MS;
    const startDateStr = toWibDateString(new Date(startMs));
    const endDateStr = toWibDateString(new Date(endMs));
    const startLabel = `${String(mondayUtc.getUTCDate()).padStart(2, '0')} ${
      SHORT_MONTHS_ID[mondayUtc.getUTCMonth()]
    }`;
    const endLabel = `${String(sundayUtc.getUTCDate()).padStart(2, '0')} ${
      SHORT_MONTHS_ID[sundayUtc.getUTCMonth()]
    } ${sundayUtc.getUTCFullYear()}`;
    return {
      startMs,
      endMs,
      startDateStr,
      endDateStr,
      label: `${startLabel} – ${endLabel}`,
    };
  }

  // Bulan kalender
  const firstDayMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - WIB_OFFSET_MS;
  const lastDayMs = Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - WIB_OFFSET_MS;
  return {
    startMs: firstDayMs,
    endMs: lastDayMs,
    startDateStr: toWibDateString(new Date(firstDayMs)),
    endDateStr: toWibDateString(new Date(lastDayMs)),
    label: `${SHORT_MONTHS_ID[month]} ${year}`,
  };
}

/**
 * Menggeser tanggal jangkar (anchor) maju/mundur 1 hari, 1 minggu, atau 1 bulan (WIB).
 */
export function shiftWibAnchor(
  period: DashboardPeriodType,
  anchorDate: Date,
  delta: -1 | 1
): Date {
  const wib = new Date(anchorDate.getTime() + WIB_OFFSET_MS);
  const year = wib.getUTCFullYear();
  const month = wib.getUTCMonth();
  const day = wib.getUTCDate();

  if (period === 'hari') {
    return new Date(Date.UTC(year, month, day + delta, 12, 0, 0) - WIB_OFFSET_MS);
  }
  if (period === 'minggu') {
    return new Date(Date.UTC(year, month, day + delta * 7, 12, 0, 0) - WIB_OFFSET_MS);
  }
  return new Date(Date.UTC(year, month + delta, 15, 12, 0, 0) - WIB_OFFSET_MS);
}
