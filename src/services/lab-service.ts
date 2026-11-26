import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  DEFAULT_COURSE_ID,
  DEFAULT_COURSE_NAMA,
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_RADIUS_METER,
  MAX_FINE_AMOUNT,
  MAX_GRACE_MINUTES,
  MAX_RADIUS_METER,
  MIN_FINE_AMOUNT,
  MIN_GRACE_MINUTES,
  MIN_RADIUS_METER,
} from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import { LabLocationDocument, SessionDocument } from '@/types/praktikum';

export const LABS_COLLECTION = 'labs';
export const MIN_LAB_RADIUS_METER = MIN_RADIUS_METER;
export const MAX_LAB_RADIUS_METER = MAX_RADIUS_METER;
export const DEFAULT_LAB_RADIUS_METER = DEFAULT_RADIUS_METER;

export interface LabLocationInput {
  courseId?: string;
  courseNama?: string;
  nama: string;
  kode: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  graceMinutes?: number;
  fineAmount?: number;
  kapasitas?: number;
  kelas?: string;
  deskripsi?: string;
  isActive?: boolean;
}

export type LabLocationUpdateInput = Partial<LabLocationInput>;

/**
 * Koordinat awal laboratorium Departemen Informatika FSM UNDIP (Kawasan Gedung E, Tembalang).
 */
export const DEFAULT_LAB_SEEDS: Omit<
  LabLocationDocument,
  'updatedBy' | 'createdAt' | 'updatedAt'
>[] = [
  {
    id: 'lab-komputasi-1',
    nama: 'Lab Komputasi 1',
    kode: 'LAB-K1',
    gedung: 'Gedung E Lantai 2, FSM UNDIP',
    latitude: -7.04912,
    longitude: 110.44082,
    radiusMeter: 50,
    deskripsi: 'Laboratorium pemrograman dasar, PPK, dan komputasi umum (40 unit PC).',
    isActive: true,
  },
  {
    id: 'lab-komputasi-2',
    nama: 'Lab Komputasi 2',
    kode: 'LAB-K2',
    gedung: 'Gedung E Lantai 2, FSM UNDIP',
    latitude: -7.04918,
    longitude: 110.44095,
    radiusMeter: 50,
    deskripsi: 'Laboratorium basis data, struktur data, dan praktikum sistem informasi.',
    isActive: true,
  },
  {
    id: 'lab-rpl',
    nama: 'Lab Rekayasa Perangkat Lunak',
    kode: 'LAB-RPL',
    gedung: 'Gedung E Lantai 3, FSM UNDIP',
    latitude: -7.04905,
    longitude: 110.44076,
    radiusMeter: 50,
    deskripsi: 'Laboratorium pengembangan aplikasi mobile, web, dan proyek perangkat lunak.',
    isActive: true,
  },
  {
    id: 'lab-jaringan',
    nama: 'Lab Jaringan & Keamanan Siber',
    kode: 'LAB-JAR',
    gedung: 'Gedung E Lantai 3, FSM UNDIP',
    latitude: -7.04925,
    longitude: 110.44105,
    radiusMeter: 50,
    deskripsi: 'Laboratorium jaringan komputer, sistem operasi, dan keamanan informasi.',
    isActive: true,
  },
  {
    id: 'lab-sistem-cerdas',
    nama: 'Lab Sistem Cerdas & Data',
    kode: 'LAB-SC',
    gedung: 'Gedung E Lantai 1, FSM UNDIP',
    latitude: -7.04900,
    longitude: 110.44088,
    radiusMeter: 50,
    deskripsi: 'Laboratorium kecerdasan buatan, pembelajaran mesin, dan sains data.',
    isActive: true,
  },
];

export function buildFallbackDefaultLabs(): LabLocationDocument[] {
  const now = new Date().toISOString();
  return DEFAULT_LAB_SEEDS.map((seed) => ({
    ...seed,
    updatedBy: 'system-seed',
    createdAt: now,
    updatedAt: now,
  }));
}

function slugifyLabId(nama: string, kode: string): string {
  const base = (nama || kode)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `lab-${Date.now()}`;
}

export function clampRadiusMeter(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LAB_RADIUS_METER;
  return Math.max(MIN_LAB_RADIUS_METER, Math.min(MAX_LAB_RADIUS_METER, Math.round(value)));
}

export function clampGraceMinutes(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_GRACE_MINUTES;
  return Math.max(MIN_GRACE_MINUTES, Math.min(MAX_GRACE_MINUTES, Math.round(value)));
}

export function clampFineAmount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_FINE_AMOUNT;
  return Math.max(MIN_FINE_AMOUNT, Math.min(MAX_FINE_AMOUNT, Math.round(value)));
}

export function validateLabLocationInput(input: LabLocationInput): string | null {
  if (!input.nama.trim()) {
    return 'Nama laboratorium wajib diisi.';
  }
  if (!input.kode.trim()) {
    return 'Kode laboratorium wajib diisi (mis. LAB-K1).';
  }
  if (!input.gedung.trim()) {
    return 'Lokasi gedung laboratorium wajib diisi.';
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return 'Koordinat latitude tidak valid (harus berada di antara -90 dan 90).';
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return 'Koordinat longitude tidak valid (harus berada di antara -180 dan 180).';
  }
  if (
    !Number.isFinite(input.radiusMeter) ||
    input.radiusMeter < MIN_LAB_RADIUS_METER ||
    input.radiusMeter > MAX_LAB_RADIUS_METER
  ) {
    return `Radius validasi harus berada pada rentang ${MIN_LAB_RADIUS_METER} hingga ${MAX_LAB_RADIUS_METER} meter.`;
  }
  if (input.graceMinutes !== undefined) {
    if (
      !Number.isFinite(input.graceMinutes) ||
      !Number.isInteger(input.graceMinutes) ||
      input.graceMinutes < MIN_GRACE_MINUTES ||
      input.graceMinutes > MAX_GRACE_MINUTES
    ) {
      return `Masa tenggang (graceMinutes) harus bilangan bulat ${MIN_GRACE_MINUTES}-${MAX_GRACE_MINUTES} menit.`;
    }
  }
  if (input.fineAmount !== undefined) {
    if (
      !Number.isFinite(input.fineAmount) ||
      !Number.isInteger(input.fineAmount) ||
      input.fineAmount < MIN_FINE_AMOUNT ||
      input.fineAmount > MAX_FINE_AMOUNT
    ) {
      return `Nominal denda harus bilangan bulat Rp ${MIN_FINE_AMOUNT.toLocaleString('id-ID')} hingga Rp ${MAX_FINE_AMOUNT.toLocaleString('id-ID')}.`;
    }
  }
  if (input.kapasitas !== undefined) {
    if (
      !Number.isFinite(input.kapasitas) ||
      !Number.isInteger(input.kapasitas) ||
      input.kapasitas <= 0
    ) {
      return 'Kapasitas laboratorium harus bilangan bulat positif.';
    }
  }
  return null;
}

function mapLabSnapshot(id: string, raw: Record<string, unknown>): LabLocationDocument {
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);
  const radius = Number(raw.radiusMeter);
  const graceRaw =
    raw.graceMinutes !== undefined ? Number(raw.graceMinutes) : DEFAULT_GRACE_MINUTES;
  const fineRaw = raw.fineAmount !== undefined ? Number(raw.fineAmount) : DEFAULT_FINE_AMOUNT;
  const capacityRaw = raw.kapasitas !== undefined ? Number(raw.kapasitas) : undefined;

  return {
    id,
    courseId: String(raw.courseId ?? DEFAULT_COURSE_ID),
    courseNama: String(raw.courseNama ?? DEFAULT_COURSE_NAMA),
    nama: String(raw.nama ?? 'Laboratorium'),
    kode: String(raw.kode ?? 'LAB'),
    gedung: String(raw.gedung ?? 'Gedung E, FSM UNDIP'),
    latitude: Number.isFinite(lat) ? lat : -7.04912,
    longitude: Number.isFinite(lng) ? lng : 110.44082,
    radiusMeter: clampRadiusMeter(radius),
    graceMinutes: clampGraceMinutes(graceRaw),
    fineAmount: clampFineAmount(fineRaw),
    ...(capacityRaw !== undefined && Number.isFinite(capacityRaw) && capacityRaw > 0
      ? { kapasitas: Math.round(capacityRaw) }
      : {}),
    ...(raw.kelas ? { kelas: String(raw.kelas) } : {}),
    ...(raw.deskripsi ? { deskripsi: String(raw.deskripsi) } : {}),
    isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
    updatedBy: String(raw.updatedBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

/**
 * Listener real-time laboratorium untuk satu mata kuliah (memetakan lab Sprint 3 tanpa courseId ke course default).
 */
export function subscribeLabsByCourse(
  courseId: string | null,
  onData: (labs: LabLocationDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return subscribeLabs(
    (allLabs) => {
      if (!courseId) {
        onData(allLabs);
        return;
      }
      onData(allLabs.filter((lab) => (lab.courseId ?? DEFAULT_COURSE_ID) === courseId));
    },
    onError
  );
}

/**
 * Listener real-time koleksi /labs di Cloud Firestore.
 */
export function subscribeLabs(
  onData: (labs: LabLocationDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const labsRef = collection(db, LABS_COLLECTION);

  return onSnapshot(
    labsRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapLabSnapshot(d.id, d.data() as Record<string, unknown>)
      );
      items.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Mengambil seluruh daftar laboratorium dari Firestore secara satu kali.
 */
export async function getAllLabs(): Promise<LabLocationDocument[]> {
  const snap = await getDocs(collection(db, LABS_COLLECTION));
  const items = snap.docs.map((d) =>
    mapLabSnapshot(d.id, d.data() as Record<string, unknown>)
  );
  items.sort((a, b) => a.nama.localeCompare(b.nama));
  return items;
}

/**
 * Mengambil satu dokumen laboratorium berdasarkan ID.
 */
export async function getLabById(labId: string): Promise<LabLocationDocument | null> {
  if (!labId.trim()) return null;
  const snap = await getDoc(doc(db, LABS_COLLECTION, labId.trim()));
  if (!snap.exists()) return null;
  return mapLabSnapshot(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Menemukan data laboratorium acuan untuk sebuah sesi praktikum.
 * Prioritas:
 * 1. Pencarian langsung berdasarkan `session.labId` di Firestore /labs.
 * 2. Fallback pencocokan nama/kode berdasarkan `session.ruang` (kompatibel dengan sesi Sprint 2).
 * 3. Fallback ke daftar seed default jika /labs belum terisi atau dibatasi rule.
 */
export async function resolveLabForSession(
  session: Pick<SessionDocument, 'labId' | 'ruang'>,
  cachedLabs?: LabLocationDocument[]
): Promise<LabLocationDocument | null> {
  const normalizedRoom = (session.ruang ?? '').trim().toLowerCase();

  // 1. Coba cek labId langsung jika tersedia
  if (session.labId) {
    if (cachedLabs && cachedLabs.length > 0) {
      const foundCached = cachedLabs.find((l) => l.id === session.labId);
      if (foundCached) return foundCached;
    }
    try {
      const directLab = await getLabById(session.labId);
      if (directLab) return directLab;
    } catch {
      // Lanjut ke fallback
    }
  }

  // 2. Cocokkan terhadap daftar lab (cache atau Firestore)
  let pool: LabLocationDocument[] = cachedLabs ?? [];
  if (pool.length === 0) {
    try {
      pool = await getAllLabs();
    } catch {
      pool = [];
    }
  }

  if (pool.length === 0) {
    pool = buildFallbackDefaultLabs();
  }

  if (session.labId) {
    const byId = pool.find((l) => l.id === session.labId);
    if (byId) return byId;
  }

  if (normalizedRoom) {
    const exactMatch = pool.find(
      (l) =>
        l.nama.trim().toLowerCase() === normalizedRoom ||
        l.kode.trim().toLowerCase() === normalizedRoom
    );
    if (exactMatch) return exactMatch;

    const partialMatch = pool.find(
      (l) =>
        normalizedRoom.includes(l.nama.trim().toLowerCase()) ||
        l.nama.trim().toLowerCase().includes(normalizedRoom) ||
        normalizedRoom.includes(l.kode.trim().toLowerCase())
    );
    if (partialMatch) return partialMatch;
  }

  // Fallback terakhir: lab aktif pertama di daftar agar sesi lama tetap bisa divalidasi
  return pool.find((l) => l.isActive) ?? pool[0] ?? null;
}

/**
 * Menambahkan laboratorium baru ke Firestore koleksi /labs.
 */
export async function createLab(
  input: LabLocationInput,
  updatedBy: string
): Promise<LabLocationDocument> {
  const validationError = validateLabLocationInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const baseId = slugifyLabId(input.nama, input.kode);
  let targetId = baseId;

  const existing = await getDoc(doc(db, LABS_COLLECTION, targetId));
  if (existing.exists()) {
    targetId = `${baseId}-${Date.now().toString().slice(-4)}`;
  }

  const now = new Date().toISOString();
  const cleanDeskripsi = input.deskripsi?.trim();
  const cleanKelas = input.kelas?.trim();

  const labDoc: LabLocationDocument = {
    id: targetId,
    courseId: input.courseId?.trim() || DEFAULT_COURSE_ID,
    courseNama: input.courseNama?.trim() || DEFAULT_COURSE_NAMA,
    nama: input.nama.trim(),
    kode: input.kode.trim().toUpperCase(),
    gedung: input.gedung.trim(),
    latitude: Number(input.latitude.toFixed(6)),
    longitude: Number(input.longitude.toFixed(6)),
    radiusMeter: clampRadiusMeter(input.radiusMeter),
    graceMinutes: clampGraceMinutes(input.graceMinutes),
    fineAmount: clampFineAmount(input.fineAmount),
    ...(input.kapasitas !== undefined ? { kapasitas: Math.round(input.kapasitas) } : {}),
    ...(cleanKelas ? { kelas: cleanKelas } : {}),
    ...(cleanDeskripsi ? { deskripsi: cleanDeskripsi } : {}),
    isActive: input.isActive ?? true,
    updatedBy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, LABS_COLLECTION, targetId), labDoc);
  return labDoc;
}

/**
 * Memperbarui informasi lokasi, radius, grace period, dan denda laboratorium di /labs/{labId}.
 */
export async function updateLab(
  labId: string,
  updates: LabLocationUpdateInput,
  updatedBy: string
): Promise<void> {
  const current = await getLabById(labId);
  if (!current) {
    throw new Error('Data laboratorium tidak ditemukan di Firestore.');
  }

  const merged: LabLocationInput = {
    courseId: updates.courseId ?? current.courseId ?? DEFAULT_COURSE_ID,
    courseNama: updates.courseNama ?? current.courseNama ?? DEFAULT_COURSE_NAMA,
    nama: updates.nama ?? current.nama,
    kode: updates.kode ?? current.kode,
    gedung: updates.gedung ?? current.gedung,
    latitude: updates.latitude ?? current.latitude,
    longitude: updates.longitude ?? current.longitude,
    radiusMeter: updates.radiusMeter ?? current.radiusMeter,
    graceMinutes: updates.graceMinutes ?? current.graceMinutes ?? DEFAULT_GRACE_MINUTES,
    fineAmount: updates.fineAmount ?? current.fineAmount ?? DEFAULT_FINE_AMOUNT,
    kapasitas: updates.kapasitas ?? current.kapasitas,
    kelas: updates.kelas ?? current.kelas,
    deskripsi: updates.deskripsi ?? current.deskripsi,
    isActive: updates.isActive ?? current.isActive,
  };

  const validationError = validateLabLocationInput(merged);
  if (validationError) {
    throw new Error(validationError);
  }

  const cleanUpdates: Record<string, string | number | boolean> = {
    courseId: merged.courseId ?? DEFAULT_COURSE_ID,
    courseNama: merged.courseNama ?? DEFAULT_COURSE_NAMA,
    nama: merged.nama.trim(),
    kode: merged.kode.trim().toUpperCase(),
    gedung: merged.gedung.trim(),
    latitude: Number(merged.latitude.toFixed(6)),
    longitude: Number(merged.longitude.toFixed(6)),
    radiusMeter: clampRadiusMeter(merged.radiusMeter),
    graceMinutes: clampGraceMinutes(merged.graceMinutes),
    fineAmount: clampFineAmount(merged.fineAmount),
    isActive: Boolean(merged.isActive),
    updatedBy,
    updatedAt: new Date().toISOString(),
  };

  if (merged.kapasitas !== undefined) {
    cleanUpdates.kapasitas = Math.round(merged.kapasitas);
  }
  if (merged.kelas !== undefined) {
    cleanUpdates.kelas = merged.kelas.trim();
  }
  if (merged.deskripsi !== undefined) {
    cleanUpdates.deskripsi = merged.deskripsi.trim();
  }

  await updateDoc(doc(db, LABS_COLLECTION, labId), cleanUpdates);
}

/**
 * Mengecek apakah lab masih memiliki anggota aktif atau sesi sebelum dihapus permanen (FR-P1-02.4).
 */
export async function getLabActiveRelationCounts(labId: string): Promise<{
  activeMembers: number;
  sessionsCount: number;
}> {
  const [membersSnap, sessionsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'lab_members'),
        where('labId', '==', labId),
        where('status', '==', 'active')
      )
    ),
    getDocs(query(collection(db, 'sessions'), where('labId', '==', labId))),
  ]);

  return {
    activeMembers: membersSnap.size,
    sessionsCount: sessionsSnap.size,
  };
}

/**
 * Menghapus dokumen laboratorium secara aman; menolak bila masih memiliki anggota aktif atau sesi.
 */
export async function deleteLab(labId: string): Promise<void> {
  const counts = await getLabActiveRelationCounts(labId);
  if (counts.activeMembers > 0 || counts.sessionsCount > 0) {
    throw new Error(
      `Laboratorium masih memiliki ${counts.activeMembers} anggota aktif dan ${counts.sessionsCount} sesi terkait. Nonaktifkan lab agar histori presensi dan denda tetap aman.`
    );
  }
  await deleteDoc(doc(db, LABS_COLLECTION, labId));
}

/**
 * Mengisi data awal laboratorium Informatika UNDIP secara otomatis jika koleksi /labs masih kosong.
 */
export async function seedDefaultLabsIfEmpty(updatedBy: string): Promise<boolean> {
  const existingSnap = await getDocs(collection(db, LABS_COLLECTION));
  if (!existingSnap.empty) {
    return false;
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  DEFAULT_LAB_SEEDS.forEach((seed) => {
    const labDoc: LabLocationDocument = {
      ...seed,
      updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, LABS_COLLECTION, seed.id), labDoc);
  });

  await batch.commit();
  return true;
}
