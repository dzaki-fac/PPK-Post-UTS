import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { clampRadiusMeter } from '@/services/lab-service';
import {
  LabLocationDocument,
  LocationReadinessStatus,
  LocationVerificationResult,
} from '@/types/praktikum';

const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_LOCATION_TIMEOUT_MS = 12000;

export interface LocationReadinessResult {
  status: LocationReadinessStatus;
  message: string;
  canAskAgain?: boolean;
}

export interface DeviceLocationResult {
  status: LocationReadinessStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  checkedAt: string;
  message: string;
  canAskAgain?: boolean;
}

/**
 * Menghitung jarak antara dua koordinat GPS dalam meter menggunakan rumus Haversine.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawMeters = EARTH_RADIUS_METERS * c;
  return Math.round(rawMeters * 10) / 10;
}

/**
 * Memformat jarak dalam meter agar mudah dibaca di antarmuka pengguna.
 */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters)) return '-';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} meter`;
}

/**
 * Membuka halaman Pengaturan sistem perangkat untuk mengaktifkan izin lokasi atau GPS.
 */
export async function openDeviceLocationSettings(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Linking.openSettings();
  } catch {
    // Abaikan jika perangkat tidak mendukung openSettings
  }
}

/**
 * Memeriksa kesiapan layanan lokasi dan status izin lokasi foreground tanpa memaksa prompt izin.
 * Kontrak antarmuka resmi SRS3 Bagian 4.2 (dapat digunakan ulang oleh Programmer 2 & 3).
 */
export async function checkLocationReadiness(): Promise<LocationReadinessResult> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        return {
          status: 'unavailable',
          message: 'Browser ini tidak mendukung layanan geolokasi perangkat.',
        };
      }
      return {
        status: 'ready',
        message: 'Layanan geolokasi browser siap digunakan.',
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        status: 'services_disabled',
        message:
          'Layanan lokasi (GPS) perangkat sedang nonaktif. Aktifkan GPS pada pengaturan perangkat Anda lalu coba lagi.',
      };
    }

    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return {
        status: 'permission_denied',
        canAskAgain: permission.canAskAgain,
        message:
          'Izin akses lokasi belum diberikan. Aplikasi memerlukan lokasi untuk memverifikasi kehadiran di laboratorium.',
      };
    }

    return {
      status: 'ready',
      message: 'Layanan lokasi aktif dan siap memverifikasi posisi Anda.',
    };
  } catch {
    return {
      status: 'unavailable',
      message: 'Tidak dapat memeriksa status layanan lokasi perangkat saat ini.',
    };
  }
}

/**
 * Meminta izin lokasi foreground secara eksplisit kepada pengguna.
 */
export async function requestLocationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (Platform.OS === 'web') {
    return {
      granted: typeof navigator !== 'undefined' && 'geolocation' in navigator,
      canAskAgain: true,
    };
  }

  const res = await Location.requestForegroundPermissionsAsync();
  return {
    granted: res.status === Location.PermissionStatus.GRANTED,
    canAskAgain: res.canAskAgain,
  };
}

function getWebPositionWithTimeout(timeoutMs: number): Promise<DeviceLocationResult> {
  const checkedAt = new Date().toISOString();
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        status: 'unavailable',
        checkedAt,
        message: 'Browser Anda tidak mendukung akses lokasi (Geolocation API).',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          status: 'ready',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          checkedAt: new Date().toISOString(),
          message: 'Koordinat perangkat berhasil diperoleh.',
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            status: 'permission_denied',
            checkedAt: new Date().toISOString(),
            message:
              'Izin lokasi browser ditolak. Izinkan akses lokasi pada bilah alamat browser lalu periksa ulang.',
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({
            status: 'services_disabled',
            checkedAt: new Date().toISOString(),
            message:
              'Informasi lokasi perangkat tidak tersedia. Pastikan layanan lokasi aktif di sistem Anda.',
          });
        } else {
          resolve({
            status: 'unavailable',
            checkedAt: new Date().toISOString(),
            message:
              'Waktu tunggu pengambilan lokasi habis. Pastikan sinyal lokasi stabil lalu coba lagi.',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 15000,
      }
    );
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('LOCATION_TIMEOUT'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Mengambil koordinat GPS perangkat saat ini dengan penanganan izin, GPS nonaktif, dan batas waktu (timeout).
 */
export async function getCurrentDeviceLocation(options?: {
  timeoutMs?: number;
  requestPermission?: boolean;
}): Promise<DeviceLocationResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LOCATION_TIMEOUT_MS;
  const shouldRequestPermission = options?.requestPermission ?? true;
  const checkedAt = new Date().toISOString();

  if (Platform.OS === 'web') {
    return getWebPositionWithTimeout(timeoutMs);
  }

  try {
    // 1. Cek apakah layanan lokasi (GPS) aktif
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        status: 'services_disabled',
        checkedAt,
        message:
          'Layanan lokasi (GPS) pada perangkat sedang nonaktif. Aktifkan GPS lalu tekan Periksa Ulang Lokasi.',
      };
    }

    // 2. Cek dan minta izin lokasi foreground
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== Location.PermissionStatus.GRANTED && shouldRequestPermission) {
      perm = await Location.requestForegroundPermissionsAsync();
    }

    if (perm.status !== Location.PermissionStatus.GRANTED) {
      return {
        status: 'permission_denied',
        canAskAgain: perm.canAskAgain,
        checkedAt,
        message:
          'Izin lokasi ditolak. Aktifkan izin lokasi LabPortal di Pengaturan perangkat untuk melanjutkan.',
      };
    }

    // 3. Ambil koordinat presisi tinggi dengan batas waktu
    try {
      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        timeoutMs
      );

      return {
        status: 'ready',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
        checkedAt: new Date().toISOString(),
        message: 'Koordinat lokasi perangkat berhasil diperoleh.',
      };
    } catch {
      // Fallback: coba lokasi terakhir yang masih segar (maksimal 45 detik) untuk kondisi GPS indoor
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 45000,
        requiredAccuracy: 150,
      });

      if (lastKnown) {
        return {
          status: 'ready',
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy ?? undefined,
          checkedAt: new Date().toISOString(),
          message: 'Koordinat perangkat diperoleh dari pembacaan GPS terbaru.',
        };
      }

      return {
        status: 'unavailable',
        checkedAt: new Date().toISOString(),
        message:
          'Sinyal GPS belum terkunci atau waktu pemeriksaan habis. Dekatkan perangkat ke area terbuka/jendela lalu coba lagi.',
      };
    }
  } catch {
    return {
      status: 'unavailable',
      checkedAt: new Date().toISOString(),
      message:
        'Terjadi kendala saat mengakses sensor lokasi perangkat. Silakan coba periksa ulang lokasi.',
    };
  }
}

/**
 * Memverifikasi posisi perangkat pengguna terhadap koordinat dan radius laboratorium.
 */
export async function verifyUserLocationForLab(
  lab: LabLocationDocument,
  options?: {
    radiusOverride?: number;
    requestPermission?: boolean;
    timeoutMs?: number;
  }
): Promise<LocationVerificationResult> {
  const allowedRadiusMeters = clampRadiusMeter(
    options?.radiusOverride ?? lab.radiusMeter
  );

  const deviceLoc = await getCurrentDeviceLocation({
    requestPermission: options?.requestPermission ?? true,
    timeoutMs: options?.timeoutMs ?? DEFAULT_LOCATION_TIMEOUT_MS,
  });

  if (
    deviceLoc.status !== 'ready' ||
    deviceLoc.latitude === undefined ||
    deviceLoc.longitude === undefined
  ) {
    return {
      status:
        deviceLoc.status === 'permission_denied' ||
        deviceLoc.status === 'services_disabled'
          ? deviceLoc.status
          : 'unavailable',
      isWithinRadius: false,
      allowedRadiusMeters,
      labId: lab.id,
      labName: lab.nama,
      checkedAt: deviceLoc.checkedAt,
      message: deviceLoc.message,
    };
  }

  const distanceMeters = calculateDistanceMeters(
    deviceLoc.latitude,
    deviceLoc.longitude,
    lab.latitude,
    lab.longitude
  );

  const isWithinRadius = distanceMeters <= allowedRadiusMeters;

  return {
    status: isWithinRadius ? 'within_radius' : 'outside_radius',
    isWithinRadius,
    distanceMeters,
    allowedRadiusMeters,
    latitude: deviceLoc.latitude,
    longitude: deviceLoc.longitude,
    accuracy: deviceLoc.accuracy,
    labId: lab.id,
    labName: lab.nama,
    checkedAt: deviceLoc.checkedAt,
    message: isWithinRadius
      ? `Lokasi terverifikasi berada di dalam radius ${lab.nama} (${formatDistanceMeters(distanceMeters)} dari batas ${allowedRadiusMeters} meter).`
      : `Anda berada di luar radius ${lab.nama}. Jarak Anda ${formatDistanceMeters(distanceMeters)}, melebihi batas maksimal ${allowedRadiusMeters} meter.`,
  };
}
