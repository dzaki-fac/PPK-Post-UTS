import type { Href } from 'expo-router';

import type { RawUserRole, UserRole } from '@/types/praktikum';

/**
 * Memetakan nilai peran termasuk nilai lama ('asisten' -> 'asprak') sesuai SRS4 FR-P1-01.
 */
export function normalizeRole(peran?: RawUserRole | string | null): UserRole {
  if (peran === 'aslab') return 'aslab';
  if (peran === 'asprak' || peran === 'asisten') return 'asprak';
  return 'praktikan';
}

export function tryNormalizeRole(peran?: RawUserRole | string | null): UserRole | null {
  if (peran === 'aslab') return 'aslab';
  if (peran === 'asprak' || peran === 'asisten') return 'asprak';
  if (peran === 'praktikan') return 'praktikan';
  return null;
}

export function isAssistantRole(peran?: RawUserRole | string | null): boolean {
  const normalized = normalizeRole(peran);
  return normalized === 'asprak' || normalized === 'aslab';
}

/**
 * Mengembalikan rute beranda sesuai peran pengguna.
 */
export function getHomeRouteByRole(role?: RawUserRole | UserRole | string | null): Href {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'aslab':
      return '/aslab/dashboard' as Href;
    case 'asprak':
      return '/asisten/jadwal' as Href;
    case 'praktikan':
    default:
      return '/praktikan/jadwal' as Href;
  }
}

export function getRoleDisplayLabel(role?: RawUserRole | string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === 'aslab') return 'ASLAB';
  if (normalized === 'asprak') return 'ASPRAK';
  return 'PRAKTIKAN';
}
