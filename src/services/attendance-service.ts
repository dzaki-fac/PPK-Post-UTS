import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/lib/firebase';
import { clampRadiusMeter, resolveLabForSession } from '@/services/lab-service';
import {
  calculateDistanceMeters,
  formatDistanceMeters,
  verifyUserLocationForLab,
} from '@/services/location-service';
import { isSessionExpired } from '@/services/session-service';
import {
  AttendanceDocument,
  AttendanceLocationSnapshot,
  LabLocationDocument,
  LocationVerificationResult,
  SessionDocument,
  UserDocument,
} from '@/types/praktikum';
import { parseSessionQrPayload } from '@/utils/qr-payload';

const ATTENDANCES_COLLECTION = 'attendances';
const SESSIONS_COLLECTION = 'sessions';
const USERS_COLLECTION = 'users';
const MAX_LOCATION_AGE_MS = 90 * 1000;

export function normalizeClassCode(cls?: string): string {
  if (!cls) return '';
  return cls.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase();
}

export function buildAttendanceId(sessionId: string, studentId: string): string {
  return `${sessionId}_${studentId}`;
}

function formatWibTimestamp(date: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()] ?? 'Jan';
  const year = date.getFullYear();
  const jam = String(date.getHours()).padStart(2, '0');
  const menit = String(date.getMinutes()).padStart(2, '0');
  const detik = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year}, ${jam}:${menit}:${detik} WIB`;
}

function mapLocationSnapshot(raw: unknown): AttendanceLocationSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const lat = Number(obj.latitude);
  const lng = Number(obj.longitude);
  const dist = Number(obj.distanceMeters);
  const radius = Number(obj.allowedRadiusMeters);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  const acc = obj.accuracy !== undefined && obj.accuracy !== null ? Number(obj.accuracy) : undefined;

  return {
    latitude: lat,
    longitude: lng,
    ...(acc !== undefined && Number.isFinite(acc) ? { accuracy: acc } : {}),
    distanceMeters: Number.isFinite(dist) ? dist : 0,
    allowedRadiusMeters: Number.isFinite(radius) ? radius : 50,
    labId: String(obj.labId ?? ''),
    labName: String(obj.labName ?? ''),
    checkedAt: String(obj.checkedAt ?? ''),
  };
}

function mapAttendanceSnapshot(id: string, raw: Record<string, unknown>): AttendanceDocument {
  const locationSnapshot = mapLocationSnapshot(raw.locationSnapshot);
  return {
    id,
    sessionId: String(raw.sessionId ?? ''),
    studentId: String(raw.studentId ?? ''),
    studentName: String(raw.studentName ?? 'Praktikan'),
    studentNim: String(raw.studentNim ?? '-'),
    studentClass: raw.studentClass === 'B' ? 'B' : 'A',
    waktuKehadiran: String(raw.waktuKehadiran ?? ''),
    timestamp: Number(raw.timestamp ?? 0),
    ...(raw.catatan ? { catatan: String(raw.catatan) } : {}),
    ...(raw.deviceInfo ? { deviceInfo: String(raw.deviceInfo) } : {}),
    verifiedByCode: Boolean(raw.verifiedByCode),
    verifiedByLocation: Boolean(raw.verifiedByLocation),
    verificationMethod:
      raw.verificationMethod === 'qr-location' ? 'qr-location' : 'code-location',
    ...(locationSnapshot ? { locationSnapshot } : {}),
  };
}

/**
 * Listener real-time daftar hadir untuk satu sesi tertentu di /attendances.
 */
export function subscribeSessionAttendances(
  sessionId: string,
  onData: (attendances: AttendanceDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ATTENDANCES_COLLECTION),
    where('sessionId', '==', sessionId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapAttendanceSnapshot(d.id, d.data() as Record<string, unknown>)
      );
      items.sort((a, b) => b.timestamp - a.timestamp);
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time status presensi seorang mahasiswa pada satu sesi tertentu.
 */
export function subscribeStudentSessionAttendance(
  sessionId: string,
  studentId: string,
  onData: (attendance: AttendanceDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const attendanceRef = doc(
    db,
    ATTENDANCES_COLLECTION,
    buildAttendanceId(sessionId, studentId)
  );

  return onSnapshot(
    attendanceRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapAttendanceSnapshot(snapshot.id, snapshot.data() as Record<string, unknown>));
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Memeriksa apakah mahasiswa telah melakukan presensi pada sesi tertentu di Firestore.
 */
export async function checkStudentSessionAttendanceExists(
  sessionId: string,
  studentId: string
): Promise<boolean> {
  const attendanceRef = doc(
    db,
    ATTENDANCES_COLLECTION,
    buildAttendanceId(sessionId, studentId)
  );
  const docSnap = await getDoc(attendanceRef);
  return docSnap.exists();
}

/**
 * Listener real-time seluruh presensi milik satu mahasiswa.
 */
export function subscribeStudentAttendances(
  studentId: string,
  onData: (attendances: AttendanceDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ATTENDANCES_COLLECTION),
    where('studentId', '==', studentId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapAttendanceSnapshot(d.id, d.data() as Record<string, unknown>)
      );
      items.sort((a, b) => b.timestamp - a.timestamp);
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time seluruh dokumen /attendances untuk metrik ringkasan asisten.
 */
export function subscribeAllAttendances(
  onData: (attendances: AttendanceDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, ATTENDANCES_COLLECTION),
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapAttendanceSnapshot(d.id, d.data() as Record<string, unknown>)
      );
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time daftar seluruh mahasiswa (peran == 'praktikan') di /users.
 */
export function subscribePraktikanUsers(
  onData: (students: UserDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('peran', '==', 'praktikan')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as UserDocument),
        uid: d.id,
      }));
      items.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time daftar seluruh asisten laboratorium (peran == 'asisten') di /users.
 */
export function subscribeAsistenUsers(
  onData: (assistants: UserDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('peran', 'in', ['asprak', 'asisten'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as UserDocument),
        uid: d.id,
      }));
      items.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Menambahkan data asisten baru ke Firestore koleksi /users.
 */
export async function createAsistenUser(data: {
  nama: string;
  nim?: string;
  peranLab?: string;
  email?: string;
}): Promise<string> {
  const cleanNim =
    (data.nim ?? '').trim() ||
    `240601211${Math.floor(10000 + Math.random() * 90000)}`;
  const customId = `ast-${cleanNim}`;
  const now = new Date().toISOString();
  const userDoc: UserDocument = {
    uid: customId,
    email:
      data.email ||
      `${cleanNim}@alumni.undip.ac.id`,
    nama: data.nama.trim(),
    nim: cleanNim,
    peran: 'asisten',
    peranLab: data.peranLab?.trim() || 'Pengampu Lab Komputasi',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, USERS_COLLECTION, customId), userDoc);
  return customId;
}

/**
 * Memperbarui data asisten di Firestore /users.
 */
export async function updateAsistenUser(
  uid: string,
  data: Partial<Pick<UserDocument, 'nama' | 'peranLab' | 'nim'>>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Menghapus data asisten dari Firestore /users.
 */
export async function deleteAsistenUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

/**
 * Menambahkan data praktikan baru ke Firestore koleksi /users.
 */
export async function createPraktikanUser(data: {
  nama: string;
  nim: string;
  kelas: 'A' | 'B';
  email?: string;
}): Promise<string> {
  const cleanNim = data.nim.trim();
  const customId = `prak-${cleanNim}`;
  const now = new Date().toISOString();
  const userDoc: UserDocument = {
    uid: customId,
    email: data.email || `${cleanNim}@alumni.undip.ac.id`,
    nama: data.nama.trim(),
    peran: 'praktikan',
    nim: cleanNim,
    kelas: data.kelas,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, USERS_COLLECTION, customId), userDoc);
  return customId;
}

/**
 * Memperbarui data profil praktikan di Firestore /users.
 */
export async function updatePraktikanUser(
  uid: string,
  data: Partial<Pick<UserDocument, 'nama' | 'nim' | 'kelas'>>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Menghapus data praktikan dari Firestore /users.
 */
export async function deletePraktikanUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

export interface SubmitAttendanceParams {
  session: SessionDocument;
  student: UserDocument;
  kodeInput: string;
  catatan?: string;
  verificationMethod?: 'code-location' | 'qr-location';
  qrPayloadInput?: string;
  lab?: LabLocationDocument | null;
  locationResult?: LocationVerificationResult | null;
}

export interface SubmitAttendanceResponse {
  success: boolean;
  message: string;
  locationResult?: LocationVerificationResult;
}

/**
 * Pencatatan presensi dengan HARD-VALIDATION (FR-P1-04):
 * 1. Verifikasi status sesi terbaru langsung di Cloud Firestore ('dibuka' & belum kedaluwarsa).
 * 2. Verifikasi kesesuaian kelas praktikan vs sesi.
 * 3. Verifikasi 4 digit kode sesi atau payload QR Code resmi sesi.
 * 4. Verifikasi lokasi GPS (Haversine) <= radius laboratorium yang berlaku di Firestore /labs.
 * 5. Proteksi anti-duplikasi dokumen `${sessionId}_${studentId}`.
 */
export async function submitAttendance({
  session,
  student,
  kodeInput,
  catatan,
  verificationMethod = 'code-location',
  qrPayloadInput,
  lab,
  locationResult,
}: SubmitAttendanceParams): Promise<SubmitAttendanceResponse> {
  // 1. Ambil status sesi paling aktual langsung dari Firestore agar tidak mengandalkan state lama UI
  let activeSession: SessionDocument = session;
  try {
    const freshSnap = await getDoc(doc(db, SESSIONS_COLLECTION, session.id));
    if (!freshSnap.exists()) {
      return {
        success: false,
        message: 'Sesi praktikum tidak ditemukan atau telah dihapus oleh asisten.',
      };
    }
    const raw = freshSnap.data() as Record<string, unknown>;
    activeSession = {
      ...session,
      status:
        raw.status === 'dibuka' || raw.status === 'ditutup' ? raw.status : 'belum-dibuka',
      kodeSesi: String(raw.kodeSesi ?? session.kodeSesi ?? ''),
      kelas: raw.kelas === 'Kelas B' ? 'Kelas B' : 'Kelas A',
      ruang: String(raw.ruang ?? session.ruang ?? ''),
      ...(raw.labId ? { labId: String(raw.labId) } : {}),
      ...(raw.radiusOverride !== undefined && Number.isFinite(Number(raw.radiusOverride))
        ? { radiusOverride: Number(raw.radiusOverride) }
        : {}),
      ...(raw.openedAt ? { openedAt: String(raw.openedAt) } : {}),
    };
  } catch {
    // Jika gagal membaca freshSnap karena gangguan koneksi, kembalikan pesan yang jelas
    return {
      success: false,
      message:
        'Tidak dapat memverifikasi status sesi di server. Periksa koneksi internet Anda lalu coba lagi.',
    };
  }

  if (activeSession.status !== 'dibuka' || isSessionExpired(activeSession)) {
    return {
      success: false,
      message:
        activeSession.status === 'ditutup' || isSessionExpired(activeSession)
          ? 'Presensi ditolak. Sesi praktikum ini telah ditutup.'
          : 'Presensi ditolak. Sesi praktikum ini belum dibuka oleh asisten.',
    };
  }

  // 2. Validasi kesesuaian kelas
  const studentClass = normalizeClassCode(student.kelas);
  const sessionClass = normalizeClassCode(activeSession.kelas);

  if (studentClass && sessionClass && studentClass !== sessionClass) {
    return {
      success: false,
      message: `Presensi ditolak. Sesi ini khusus untuk Kelas ${sessionClass}, sedangkan Anda terdaftar di Kelas ${studentClass}.`,
    };
  }

  // 3. Validasi kode sesi 4 digit atau payload QR Code
  const cleanCode = kodeInput.trim();
  if (verificationMethod === 'qr-location') {
    const parsedQr = parseSessionQrPayload(qrPayloadInput ?? '');
    if (!parsedQr) {
      return {
        success: false,
        message: 'QR Code presensi tidak valid. Silakan pindai ulang QR Code resmi dari asisten.',
      };
    }
    if (parsedQr.sessionId !== activeSession.id) {
      return {
        success: false,
        message: 'QR Code yang dipindai bukan milik sesi praktikum ini.',
      };
    }
    if (activeSession.kodeSesi && parsedQr.kodeSesi !== activeSession.kodeSesi) {
      return {
        success: false,
        message: 'Kode sesi pada QR Code tidak cocok dengan sesi aktif saat ini.',
      };
    }
  } else if (activeSession.kodeSesi && cleanCode !== activeSession.kodeSesi) {
    return {
      success: false,
      message:
        'Kode sesi presensi tidak sesuai. Silakan masukkan 4 digit kode yang diberikan oleh asisten di ruang lab.',
    };
  }

  // 4. HARD-VALIDATION LOKASI & RADIUS (Geofencing)
  const resolvedLab = await resolveLabForSession(
    activeSession,
    lab ? [lab] : undefined
  );
  if (!resolvedLab) {
    return {
      success: false,
      message:
        'Data koordinat laboratorium belum dikonfigurasi oleh asisten. Hubungi asisten laboratorium.',
    };
  }

  const allowedRadiusMeters = clampRadiusMeter(
    activeSession.radiusOverride ?? resolvedLab.radiusMeter
  );

  // Periksa apakah locationResult masih segar dan berasal dari lab yang sama; jika tidak, ambil ulang langsung dari GPS
  const isFreshLocation =
    Boolean(locationResult) &&
    locationResult?.labId === resolvedLab.id &&
    locationResult?.latitude !== undefined &&
    locationResult?.longitude !== undefined &&
    Boolean(locationResult?.checkedAt) &&
    Date.now() - new Date(locationResult.checkedAt).getTime() <= MAX_LOCATION_AGE_MS;

  let verifiedLoc: LocationVerificationResult;
  if (isFreshLocation && locationResult) {
    // Hitung ulang jarak Haversine secara independen di level service (tidak mempercayai boolean UI)
    const recomputedDistance = calculateDistanceMeters(
      locationResult.latitude!,
      locationResult.longitude!,
      resolvedLab.latitude,
      resolvedLab.longitude
    );
    const within = recomputedDistance <= allowedRadiusMeters;
    verifiedLoc = {
      ...locationResult,
      distanceMeters: recomputedDistance,
      allowedRadiusMeters,
      isWithinRadius: within,
      status: within ? 'within_radius' : 'outside_radius',
      labId: resolvedLab.id,
      labName: resolvedLab.nama,
      message: within
        ? `Lokasi terverifikasi berada di dalam radius ${resolvedLab.nama}.`
        : `Presensi ditolak. Jarak Anda ${formatDistanceMeters(recomputedDistance)} dari ${resolvedLab.nama}, melebihi batas radius ${allowedRadiusMeters} meter.`,
    };
  } else {
    verifiedLoc = await verifyUserLocationForLab(resolvedLab, {
      radiusOverride: activeSession.radiusOverride,
      requestPermission: true,
    });
  }

  if (
    !verifiedLoc.isWithinRadius ||
    verifiedLoc.status !== 'within_radius' ||
    verifiedLoc.latitude === undefined ||
    verifiedLoc.longitude === undefined ||
    verifiedLoc.distanceMeters === undefined
  ) {
    return {
      success: false,
      message: verifiedLoc.message,
      locationResult: verifiedLoc,
    };
  }

  // 5. Proteksi anti-duplikasi dokumen `${sessionId}_${studentId}`
  const attendanceId = buildAttendanceId(activeSession.id, student.uid);
  const attendanceRef = doc(db, ATTENDANCES_COLLECTION, attendanceId);

  const existing = await getDoc(attendanceRef);
  if (existing.exists()) {
    return {
      success: false,
      message: 'Anda sudah melakukan presensi pada sesi ini.',
      locationResult: verifiedLoc,
    };
  }

  const now = new Date();
  const cleanCatatan = catatan?.trim();

  const locationSnapshot: AttendanceLocationSnapshot = {
    latitude: verifiedLoc.latitude,
    longitude: verifiedLoc.longitude,
    ...(verifiedLoc.accuracy !== undefined ? { accuracy: Math.round(verifiedLoc.accuracy) } : {}),
    distanceMeters: verifiedLoc.distanceMeters,
    allowedRadiusMeters: verifiedLoc.allowedRadiusMeters,
    labId: resolvedLab.id,
    labName: resolvedLab.nama,
    checkedAt: verifiedLoc.checkedAt,
  };

  const payload: AttendanceDocument = {
    id: attendanceId,
    sessionId: activeSession.id,
    studentId: student.uid,
    studentName: student.nama,
    studentNim: student.nim ?? '-',
    studentClass: studentClass === 'B' ? 'B' : 'A',
    waktuKehadiran: formatWibTimestamp(now),
    timestamp: now.getTime(),
    verifiedByCode: true,
    verifiedByLocation: true,
    verificationMethod,
    locationSnapshot,
    deviceInfo: Platform.OS,
    ...(cleanCatatan ? { catatan: cleanCatatan } : {}),
  };

  await setDoc(attendanceRef, payload);

  return {
    success: true,
    message: `Presensi berhasil dicatat! Lokasi terverifikasi (${formatDistanceMeters(verifiedLoc.distanceMeters)} dari ${resolvedLab.nama}).`,
    locationResult: verifiedLoc,
  };
}

