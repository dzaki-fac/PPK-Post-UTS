import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { AttendanceDocument, SessionDocument } from '@/types/praktikum';

export interface ManualAttendanceInput {
  session: SessionDocument;
  studentId: string;
  studentName: string;
  studentNim: string;
  studentClass: 'A' | 'B';
  asprakUid: string;
  note: string;
}

function formatWibNow(): string {
  const now = new Date();
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
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()] ?? 'Jan';
  const year = now.getFullYear();
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year}, ${jam}:${menit}:${detik} WIB`;
}

/**
 * Mencatat presensi manual oleh Asprak bagi praktikan yang belum memiliki catatan presensi.
 * Menggunakan verificationMethod: 'manual-asprak', attendanceStatus: 'hadir', dan tidak pernah menerbitkan denda.
 */
export async function recordManualAttendance(
  input: ManualAttendanceInput
): Promise<AttendanceDocument> {
  const cleanNote = input.note.trim();
  if (cleanNote.length < 3) {
    throw new Error('Catatan alasan presensi manual wajib diisi minimal 3 karakter.');
  }
  if (!input.asprakUid.trim()) {
    throw new Error('Identitas Asprak tidak valid.');
  }

  const attendanceId = `${input.session.id}_${input.studentId}`;
  const attRef = doc(db, 'attendances', attendanceId);
  const existing = await getDoc(attRef);
  if (existing.exists()) {
    throw new Error(
      'Mahasiswa ini sudah memiliki catatan kehadiran atau izin pada sesi ini dan tidak dapat ditimpa.'
    );
  }

  const nowIso = new Date().toISOString();
  const timestamp = Date.now();
  const waktuKehadiran = formatWibNow();

  const firestoreDoc: Record<string, unknown> = {
    id: attendanceId,
    sessionId: input.session.id,
    studentId: input.studentId,
    studentName: input.studentName,
    studentNim: input.studentNim,
    studentClass: input.studentClass,
    waktuKehadiran,
    timestamp,
    catatan: cleanNote,
    verifiedByCode: false,
    verifiedByLocation: false,
    verificationMethod: 'manual-asprak',
    attendanceStatus: 'hadir',
    checkedInAt: serverTimestamp(),
    manualEntry: {
      by: input.asprakUid,
      note: cleanNote,
      at: nowIso,
    },
  };

  await setDoc(attRef, firestoreDoc);

  return {
    id: attendanceId,
    sessionId: input.session.id,
    studentId: input.studentId,
    studentName: input.studentName,
    studentNim: input.studentNim,
    studentClass: input.studentClass,
    waktuKehadiran,
    timestamp,
    catatan: cleanNote,
    verifiedByCode: false,
    verifiedByLocation: false,
    verificationMethod: 'manual-asprak',
    attendanceStatus: 'hadir',
    manualEntry: {
      by: input.asprakUid,
      note: cleanNote,
      at: nowIso,
    },
  };
}
