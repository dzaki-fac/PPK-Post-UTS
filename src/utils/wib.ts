import { TIMEZONE } from '@/constants/praktikum-config';

/**
 * Helper waktu zona WIB (Asia/Jakarta, UTC+7) yang mendukung format tanggal & jam
 * Sprint 2–3 (`DD MMM YYYY` bahasa Indonesia/Inggris, `HH.mm`) sekaligus Sprint 4 (`YYYY-MM-DD`, `HH:mm`).
 */

export const WIB_OFFSET = '+07:00';

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01',
  januari: '01',
  january: '01',
  feb: '02',
  februari: '02',
  february: '02',
  mar: '03',
  maret: '03',
  march: '03',
  apr: '04',
  april: '04',
  mei: '05',
  may: '05',
  jun: '06',
  juni: '06',
  june: '06',
  jul: '07',
  juli: '07',
  july: '07',
  agu: '08',
  ags: '08',
  agust: '08',
  agustus: '08',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  okt: '10',
  oktober: '10',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  des: '12',
  desember: '12',
  dec: '12',
  december: '12',
};

function normalizeDateToIso(tanggal: string): string | null {
  const clean = tanggal.trim();
  if (!clean) return null;

  // Format ISO: YYYY-MM-DD atau YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(clean);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format Sprint 2-3: DD MMM YYYY / D MMMM YYYY (ID atau EN), opsional nama hari di depan
  const withoutWeekday = clean.replace(/^[A-Za-z]+,\s*/, '');
  const dmyTextMatch = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(withoutWeekday);
  if (dmyTextMatch) {
    const day = dmyTextMatch[1].padStart(2, '0');
    const monthKey = dmyTextMatch[2].toLowerCase();
    const month = MONTH_NAME_MAP[monthKey];
    const year = dmyTextMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyNumMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(clean);
  if (dmyNumMatch) {
    const day = dmyNumMatch[1].padStart(2, '0');
    const month = dmyNumMatch[2].padStart(2, '0');
    const year = dmyNumMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function normalizeTimeToHms(jam: string): string | null {
  const clean = jam
    .trim()
    .replace(/\s*WIB$/i, '')
    .replace(/\./g, ':');
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(clean);
  if (!match) return null;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = match[3] ? Number(match[3]) : 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) {
    return null;
  }

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Menggabungkan tanggal (`YYYY-MM-DD` atau `DD MMM YYYY` ID/EN) dan jam (`HH:mm` atau `HH.mm`)
 * sebagai Date dengan zona waktu WIB eksplisit (`+07:00`).
 */
export function parseWibDateTime(tanggal: string, jam: string): Date {
  const isoDate = normalizeDateToIso(tanggal);
  const hms = normalizeTimeToHms(jam);
  if (!isoDate || !hms) {
    return new Date(NaN);
  }
  const parsed = new Date(`${isoDate}T${hms}${WIB_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
}

/**
 * Menghasilkan tanggal YYYY-MM-DD dalam zona waktu Asia/Jakarta (WIB).
 */
export function toWibDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/**
 * Memformat ISO timestamp ke tampilan WIB yang rapi untuk UI.
 */
export function formatWib(
  iso: string,
  options?: { dateOnly?: boolean; timeOnly?: boolean }
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  if (options?.dateOnly) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  if (options?.timeOnly) {
    const time = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `${time.replace('.', ':')} WIB`;
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${formatted.replace('.', ':')} WIB`;
}
