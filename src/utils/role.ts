import { UserRole } from '@/types/praktikum';

/**
 * Menormalkan peran pengguna dari Firestore (memetakan nilai legacy 'asisten' -> 'asprak').
 */
export function normalizeRole(peran?: string | null): UserRole {
  if (peran === 'aslab') return 'aslab';
  if (peran === 'asprak' || peran === 'asisten') return 'asprak';
  return 'praktikan';
}

export function isAssistantRole(peran?: string | null): boolean {
  const normalized = normalizeRole(peran);
  return normalized === 'asprak' || normalized === 'aslab';
}

export function getHomeRouteByRole(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === 'aslab') return '/aslab/dashboard';
  if (normalized === 'asprak') return '/asisten/jadwal';
  return '/praktikan/jadwal';
}

export function getRoleDisplayLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === 'aslab') return 'ASLAB';
  if (normalized === 'asprak') return 'ASPRAK';
  return 'PRAKTIKAN';
}
