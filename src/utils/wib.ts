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

export function parseCalendarDateParts(
  tanggal: string
): { year: number; monthIndex: number; day: number } | null {
  const trimmed = (tanggal || '').trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
      return { year, monthIndex, day };
    }
  }

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

export function parseTimeParts(jam: string): { hour: number; minute: number } | null {
  const cleaned = (jam || '').replace('.', ':').replace(/wib/i, '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

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
