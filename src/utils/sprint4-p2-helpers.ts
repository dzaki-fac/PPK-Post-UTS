/**
 * Helpers lokal Programmer 2 (Sprint 4).
 * Sengaja terpisah dari src/utils/wib.ts & format.ts milik Programmer 1 (Stage 0).
 * Setelah Stage 0 di-merge, helper ini bisa dialihkan ke sana.
 */
import type { DashboardPeriod, NormalizedRole, Sprint4UserDocument } from '@/types/sprint4-p2';

const WIB_OFFSET_HOURS = 7;

/** Legacy 'asisten' dibaca sebagai 'asprak' (SRS4 §1.3). */
export function normalizeRoleP2(peran?: string | null): NormalizedRole {
  if (peran === 'aslab') return 'aslab';
  if (peran === 'praktikan') return 'praktikan';
  return 'asprak'; // 'asprak' maupun legacy 'asisten'
}

export function asSprint4UserDoc(value: unknown): Sprint4UserDocument | null {
  return value && typeof value === 'object' ? (value as Sprint4UserDocument) : null;
}

/** Daftar lab yang diampu asprak (fallback: labId tunggal). */
export function getUserLabIds(userDoc: unknown): string[] {
  const doc = asSprint4UserDoc(userDoc);
  if (!doc) return [];
  const ids = Array.isArray(doc.labIds) ? doc.labIds.filter(Boolean) : [];
  if (ids.length === 0 && doc.labId) ids.push(doc.labId);
  return ids;
}

/** Mata kuliah yang dikelola aslab. */
export function getManagedCourseIds(userDoc: unknown): string[] {
  const doc = asSprint4UserDoc(userDoc);
  return Array.isArray(doc?.managedCourseIds) ? doc!.managedCourseIds!.filter(Boolean) : [];
}

/** WIB = UTC+7 (tanpa DST) — aman untuk Indonesia. */
export function parseWibDateTime(tanggal: string, jam: string): Date | null {
  if (!tanggal || !jam) return null;
  const cleanDate = tanggal.trim().slice(0, 10);
  const cleanJam = jam.trim().replace('.', ':');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !/^\d{1,2}:\d{2}$/.test(cleanJam)) {
    return null;
  }
  const [h, m] = cleanJam.split(':').map((v) => Number(v));
  const parsed = new Date(`${cleanDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toWibDateString(date: Date): string {
  const shifted = new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function formatWib(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatJamWib(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatTanggalPendek(tanggal: string): string {
  if (!tanggal) return '-';
  const date = new Date(`${tanggal.slice(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return tanggal;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Awal periode dalam WIB, dikembalikan sebagai Date UTC untuk query Firestore. */
export function startOfWibPeriod(
  base: Date,
  period: DashboardPeriod
): Date {
  const shifted = new Date(base.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  let isoDate: string;
  if (period === 'hari') {
    isoDate = shifted.toISOString().slice(0, 10);
  } else if (period === 'minggu') {
    const day = shifted.getUTCDay(); // 0 = Minggu
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const monday = new Date(shifted.getTime() + mondayDelta * 86400000);
    isoDate = monday.toISOString().slice(0, 10);
  } else {
    isoDate = `${shifted.toISOString().slice(0, 7)}-01`;
  }
  return new Date(`${isoDate}T00:00:00+07:00`);
}

export function shiftPeriod(base: Date, period: DashboardPeriod, delta: number): Date {
  const shifted = new Date(base.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  if (period === 'hari') shifted.setUTCDate(shifted.getUTCDate() + delta);
  else if (period === 'minggu') shifted.setUTCDate(shifted.getUTCDate() + delta * 7);
  else shifted.setUTCMonth(shifted.getUTCMonth() + delta);
  return new Date(shifted.toISOString());
}

/** Firestore `in` hanya menerima maks. 30 nilai. */
export function chunk<T>(items: T[], size = 30): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export function hitungKehadiran(status?: string): 'hadir' | 'terlambat' | 'izin' | 'belum-hadir' {
  if (status === 'hadir') return 'hadir';
  if (status === 'terlambat') return 'terlambat';
  if (status === 'izin') return 'izin';
  return 'belum-hadir';
}
