/**
 * Format tampilan keuangan & waktu WIB untuk modul tagihan (Sprint 4 / Programmer 3).
 * Mata uang `Rp 10.000`, zona waktu tampilan Asia/Jakarta (UTC+7) tanpa bergantung pada Intl.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatRupiah(value: number): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return `Rp ${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function toWibParts(iso?: string): {
  day: string;
  month: string;
  year: number;
  hour: string;
  minute: string;
} | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const date = new Date(ms + WIB_OFFSET_MS);
  return {
    day: String(date.getUTCDate()).padStart(2, '0'),
    month: MONTHS[date.getUTCMonth()] ?? 'Jan',
    year: date.getUTCFullYear(),
    hour: String(date.getUTCHours()).padStart(2, '0'),
    minute: String(date.getUTCMinutes()).padStart(2, '0'),
  };
}

/** `26 Nov 2026, 11:05 WIB` */
export function formatWibDateTime(iso?: string): string {
  const parts = toWibParts(iso);
  if (!parts) return '-';
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} WIB`;
}

/** `26 Nov 2026` */
export function formatWibDate(iso?: string): string {
  const parts = toWibParts(iso);
  if (!parts) return '-';
  return `${parts.day} ${parts.month} ${parts.year}`;
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer Bank (Virtual Account)',
  echannel: 'Mandiri Bill',
  qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  credit_card: 'Kartu Kredit/Debit',
  cstore: 'Gerai Retail',
  akulaku: 'Akulaku',
};

export function formatPaymentType(type?: string): string {
  if (!type) return 'Belum dipilih';
  return PAYMENT_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}
