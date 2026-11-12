import {
  Unsubscribe,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/lib/firebase';
import { AttendanceDocument, SessionDocument, UserDocument } from '@/types/praktikum';

const ATTENDANCES_COLLECTION = 'attendances';
const USERS_COLLECTION = 'users';

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

function mapAttendanceSnapshot(id: string, raw: Record<string, unknown>): AttendanceDocument {
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

export interface SubmitAttendanceParams {
  session: SessionDocument;
  student: UserDocument;
  kodeInput: string;
  catatan?: string;
}

export async function submitAttendance({
  session,
  student,
  kodeInput,
  catatan,
}: SubmitAttendanceParams): Promise<{ success: boolean; message: string }> {
  if (session.status !== 'dibuka') {
    return {
      success: false,
      message:
        session.status === 'ditutup'
          ? 'Sesi praktikum ini telah ditutup.'
          : 'Sesi praktikum ini belum dibuka oleh asisten.',
    };
  }

  const studentClass = normalizeClassCode(student.kelas);
  const sessionClass = normalizeClassCode(session.kelas);

  if (studentClass && sessionClass && studentClass !== sessionClass) {
    return {
      success: false,
      message: `Presensi ditolak. Sesi ini khusus untuk Kelas ${sessionClass}, sedangkan Anda terdaftar di Kelas ${studentClass}.`,
    };
  }

  const cleanCode = kodeInput.trim();
  if (session.kodeSesi && cleanCode !== session.kodeSesi) {
    return {
      success: false,
      message:
        'Kode sesi presensi tidak sesuai. Silakan masukkan 4 digit kode yang diberikan oleh asisten di ruang lab.',
    };
  }

  const attendanceId = buildAttendanceId(session.id, student.uid);
  const attendanceRef = doc(db, ATTENDANCES_COLLECTION, attendanceId);

  const existing = await getDoc(attendanceRef);
  if (existing.exists()) {
    return {
      success: false,
      message: 'Anda sudah melakukan presensi pada sesi ini.',
    };
  }

  const now = new Date();
  const cleanCatatan = catatan?.trim();

  const payload: AttendanceDocument = {
    id: attendanceId,
    sessionId: session.id,
    studentId: student.uid,
    studentName: student.nama,
    studentNim: student.nim ?? '-',
    studentClass: studentClass === 'B' ? 'B' : 'A',
    waktuKehadiran: formatWibTimestamp(now),
    timestamp: now.getTime(),
    verifiedByCode: true,
    deviceInfo: Platform.OS,
    ...(cleanCatatan ? { catatan: cleanCatatan } : {}),
  };

  await setDoc(attendanceRef, payload);

  return {
    success: true,
    message: 'Presensi berhasil dicatat! Kehadiran Anda telah terverifikasi.',
  };
}

