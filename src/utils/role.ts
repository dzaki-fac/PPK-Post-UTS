import type { Href } from 'expo-router';

import type { RawUserRole, UserRole } from '@/types/praktikum';

/**
 * Memetakan peran user termasuk nilai lama ('asisten' -> 'asprak') agar kompatibel dengan data Sprint 2-3.
 */
export function normalizeRole(peran?: RawUserRole | string | null): UserRole | null {
  if (peran === 'aslab') return 'aslab';
  if (peran === 'asprak' || peran === 'asisten') return 'asprak';
  if (peran === 'praktikan') return 'praktikan';
  return null;
}

export function isAslabRole(peran?: RawUserRole | string | null): boolean {
  return normalizeRole(peran) === 'aslab';
}

export function isAsprakRole(peran?: RawUserRole | string | null): boolean {
  return normalizeRole(peran) === 'asprak';
}

export function isPraktikanRole(peran?: RawUserRole | string | null): boolean {
  return normalizeRole(peran) === 'praktikan';
}

export function getDefaultRouteForRole(role: UserRole): Href {
  switch (role) {
    case 'aslab':
      return '/aslab/dashboard' as Href;
    case 'asprak':
      return '/asisten/jadwal' as Href;
    case 'praktikan':
    default:
      return '/praktikan/jadwal' as Href;
  }
}

export function getRoleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'aslab':
      return 'Aslab';
    case 'asprak':
      return 'Asprak';
    case 'praktikan':
    default:
      return 'Mahasiswa';
  }
}

export function getRoleAccentColors(role: UserRole | null): {
  accent: string;
  tint: string;
  border: string;
  badgeText: string;
} {
  if (role === 'aslab') {
    return {
      accent: '#4F46E5',
      tint: '#EEF2FF',
      border: '#C7D2FE',
      badgeText: 'ASLAB',
    };
  }
  if (role === 'asprak') {
    return {
      accent: '#0D9488',
      tint: '#F0FDFA',
      border: '#CCFBF1',
      badgeText: 'ASPRAK',
    };
  }
  return {
    accent: '#EA580C',
    tint: '#FFF7ED',
    border: '#FFEDD5',
    badgeText: 'MAHASISWA',
  };
}
