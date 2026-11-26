/**
 * Helper waktu zona WIB (Asia/Jakarta, UTC+7) agar parsing & formatting konsisten lintas perangkat.
 */

export const WIB_OFFSET = '+07:00';

/**
 * Menggabungkan tanggal YYYY-MM-DD dan jam HH:mm sebagai waktu WIB eksplisit.
 */
export function parseWibDateTime(tanggal: string, jam: string): Date {
  const cleanDate = tanggal.trim();
  const cleanTime = jam.trim().slice(0, 5);
  const paddedTime = cleanTime.length === 4 ? `0${cleanTime}` : cleanTime;
  const iso = `${cleanDate}T${paddedTime}:00${WIB_OFFSET}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(NaN);
  }
  return parsed;
}

/**
 * Menghasilkan tanggal YYYY-MM-DD dalam zona waktu Asia/Jakarta (WIB).
 */
export function toWibDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
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
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  if (options?.timeOnly) {
    const time = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `${time.replace('.', ':')} WIB`;
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${formatted.replace('.', ':')} WIB`;
}
