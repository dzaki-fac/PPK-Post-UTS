import {
  Unsubscribe,
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  LabLocationDocument,
  LabWithActivity,
  SessionDocument,
} from '@/types/praktikum';

export const LABS_COLLECTION = 'labs';
export const SESSIONS_COLLECTION = 'sessions';

/**
 * Koordinat referensi Departemen Informatika FSM UNDIP (Tembalang, Semarang)
 * Digunakan sebagai pusat peta awal dan data default laboratorium jika Firestore /labs belum terisi.
 */
export const UNDIP_INFORMATIKA_COORDINATES = {
  latitude: -7.049615,
  longitude: 110.440735,
  latitudeDelta: 0.0035,
  longitudeDelta: 0.0035,
};

export const DEFAULT_LABS: LabLocationDocument[] = [
  {
    id: 'lab-komputasi-1',
    nama: 'Lab Komputasi 1',
    kode: 'LAB-K1',
    gedung: 'Gedung E Lantai 2, FSM UNDIP',
    latitude: -7.049580,
    longitude: 110.440620,
    radiusMeter: 50,
    deskripsi: 'Laboratorium Pemrograman Dasar, Algoritma, dan PPK Platform Khusus',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lab-komputasi-2',
    nama: 'Lab Komputasi 2',
    kode: 'LAB-K2',
    gedung: 'Gedung E Lantai 2, FSM UNDIP',
    latitude: -7.049650,
    longitude: 110.440780,
    radiusMeter: 50,
    deskripsi: 'Laboratorium Kecerdasan Buatan, Data Science, dan Komputasi Numerik',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lab-rpl',
    nama: 'Lab Rekayasa Perangkat Lunak',
    kode: 'LAB-RPL',
    gedung: 'Gedung E Lantai 3, FSM UNDIP',
    latitude: -7.049720,
    longitude: 110.440690,
    radiusMeter: 45,
    deskripsi: 'Laboratorium Rekayasa Perangkat Lunak & Desain Antarmuka Pengguna',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lab-jaringan',
    nama: 'Lab Jaringan & Sistem Komputer',
    kode: 'LAB-JSK',
    gedung: 'Gedung E Lantai 3, FSM UNDIP',
    latitude: -7.049530,
    longitude: 110.440850,
    radiusMeter: 40,
    deskripsi: 'Laboratorium Jaringan Komputer, Keamanan Siber, dan Sistem Terdistribusi',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'lab-basis-data',
    nama: 'Lab Sistem Informasi & Basis Data',
    kode: 'LAB-SIBD',
    gedung: 'Gedung F Lantai 1, FSM UNDIP',
    latitude: -7.049450,
    longitude: 110.440550,
    radiusMeter: 55,
    deskripsi: 'Laboratorium Manajemen Basis Data dan Sistem Informasi Terintegrasi',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

/**
 * Menghitung jarak Haversine (dalam satuan meter) antara dua titik koordinat GPS.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Normalisasi pencocokan string nama lab/ruang untuk mencocokkan data sesi lama dengan master lab.
 */
function isLabMatchingRoom(lab: LabLocationDocument, roomName: string): boolean {
  if (!roomName) return false;
  const cleanRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLabName = lab.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLabCode = lab.kode.toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    cleanRoom.includes(cleanLabName) ||
    cleanLabName.includes(cleanRoom) ||
    cleanRoom.includes(cleanLabCode) ||
    cleanLabCode.includes(cleanRoom)
  );
}

/**
 * Memeriksa apakah suatu sesi saat ini secara operasional sedang berlangsung.
 * Prioritas utama: status === 'dibuka'.
 */
export function isSessionOngoing(session: SessionDocument): boolean {
  if (session.status === 'dibuka') {
    return true;
  }
  if (session.status === 'ditutup') {
    return false;
  }

  // Jika belum-dibuka, cek apakah jam saat ini berada dalam rentang waktu sesi hari ini
  if (session.status === 'belum-dibuka' && session.tanggal && session.waktuMulai && session.waktuSelesai) {
    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      if (session.tanggal === todayStr) {
        const [startH, startM] = session.waktuMulai.split(/[:.]/).map((v) => parseInt(v, 10));
        const [endH, endM] = session.waktuSelesai.split(/[:.]/).map((v) => parseInt(v, 10));

        if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
          const startTime = new Date(now).setHours(startH, startM, 0, 0);
          const endTime = new Date(now).setHours(endH, endM, 0, 0);
          const nowTime = now.getTime();
          return nowTime >= startTime && nowTime <= endTime;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * Memetakan daftar sesi ke masing-masing laboratorium.
 */
export function computeLabActivities(
  labs: LabLocationDocument[],
  sessions: SessionDocument[],
  userCoords?: { latitude: number; longitude: number }
): LabWithActivity[] {
  return labs.map((lab) => {
    // Cari seluruh sesi yang berhubungan dengan laboratorium ini
    const labSessions = sessions.filter((s) => {
      if (s.labId && s.labId === lab.id) {
        return true;
      }
      return isLabMatchingRoom(lab, s.ruang);
    });

    // 1. ongoingSession: sesi yang sedang 'dibuka' atau ongoing
    const ongoingSession =
      labSessions.find((s) => s.status === 'dibuka') ||
      labSessions.find((s) => isSessionOngoing(s)) ||
      null;

    // 2. upcomingSessions: sesi berstatus 'belum-dibuka'
    const upcoming = labSessions
      .filter((s) => s.status === 'belum-dibuka' && s.id !== ongoingSession?.id)
      .sort((a, b) => {
        const dateComp = (a.tanggal || '').localeCompare(b.tanggal || '');
        if (dateComp !== 0) return dateComp;
        return (a.waktuMulai || '').localeCompare(b.waktuMulai || '');
      });

    const nextSession = upcoming[0] ?? null;

    let distanceMeters: number | undefined;
    let isUserInsideRadius: boolean | undefined;

    if (userCoords) {
      distanceMeters = calculateDistanceMeters(
        userCoords.latitude,
        userCoords.longitude,
        lab.latitude,
        lab.longitude
      );
      isUserInsideRadius = distanceMeters <= lab.radiusMeter;
    }

    return {
      lab,
      ongoingSession,
      nextSession,
      upcomingSessions: upcoming,
      distanceMeters,
      isUserInsideRadius,
    };
  });
}

/**
 * Listener Firestore terpadu yang mendengarkan koleksi /labs dan /sessions secara real-time.
 * Menghasilkan data aktivitas laboratorium yang selalu terbarukan tanpa reload.
 */
export function subscribeLabActivities(
  onData: (activities: LabWithActivity[]) => void,
  userCoordsGetter?: () => { latitude: number; longitude: number } | null,
  onError?: (err: Error) => void
): Unsubscribe {
  let cachedLabs: LabLocationDocument[] = DEFAULT_LABS;
  let cachedSessions: SessionDocument[] = [];

  const update = () => {
    const coords = userCoordsGetter ? userCoordsGetter() : null;
    const computed = computeLabActivities(
      cachedLabs,
      cachedSessions,
      coords || undefined
    );
    onData(computed);
  };

  // 1. Subscribe koleksi /labs
  const labsRef = collection(db, LABS_COLLECTION);
  const unsubLabs = onSnapshot(
    labsRef,
    (snapshot) => {
      if (!snapshot.empty) {
        cachedLabs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<LabLocationDocument>;
          return {
            id: docSnap.id,
            nama: data.nama ?? 'Lab Informatika',
            kode: data.kode ?? 'LAB',
            gedung: data.gedung ?? 'Gedung E FSM UNDIP',
            latitude: Number(data.latitude ?? UNDIP_INFORMATIKA_COORDINATES.latitude),
            longitude: Number(data.longitude ?? UNDIP_INFORMATIKA_COORDINATES.longitude),
            radiusMeter: Number(data.radiusMeter ?? 50),
            deskripsi: data.deskripsi,
            isActive: data.isActive !== false,
            updatedBy: data.updatedBy,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          };
        }).filter((l) => l.isActive);
      } else {
        cachedLabs = DEFAULT_LABS;
      }
      update();
    },
    (err) => {
      // Fallback ke default labs jika ada izin/koneksi rules
      cachedLabs = DEFAULT_LABS;
      update();
      if (onError) onError(err);
    }
  );

  // 2. Subscribe koleksi /sessions
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const unsubSessions = onSnapshot(
    sessionsRef,
    (snapshot) => {
      cachedSessions = snapshot.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          praktikum: String(raw.praktikum ?? 'Praktikum PPK'),
          kelas: raw.kelas === 'Kelas B' ? 'Kelas B' : 'Kelas A',
          materi: String(raw.materi ?? ''),
          tanggal: String(raw.tanggal ?? ''),
          waktuMulai: String(raw.waktuMulai ?? ''),
          waktuSelesai: String(raw.waktuSelesai ?? ''),
          ruang: String(raw.ruang ?? ''),
          status:
            raw.status === 'dibuka' || raw.status === 'ditutup' ? raw.status : 'belum-dibuka',
          kodeSesi: String(raw.kodeSesi ?? ''),
          createdBy: String(raw.createdBy ?? ''),
          labId: raw.labId ? String(raw.labId) : undefined,
          radiusOverride: typeof raw.radiusOverride === 'number' ? raw.radiusOverride : undefined,
          openedAt: raw.openedAt ? String(raw.openedAt) : undefined,
          closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
          createdAt: String(raw.createdAt ?? ''),
          updatedAt: String(raw.updatedAt ?? ''),
        };
      });
      update();
    },
    (err) => {
      if (onError) onError(err);
    }
  );

  return () => {
    unsubLabs();
    unsubSessions();
  };
}
