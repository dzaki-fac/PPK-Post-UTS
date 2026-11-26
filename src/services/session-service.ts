import {
  Unsubscribe,
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { SessionDocument, SessionStatus } from '@/types/praktikum';
import { parseWibDateTime } from '@/utils/sprint4-p2-helpers';
import { buildSessionQrPayload } from '@/utils/qr-payload';
import { notifyScheduleChanged, notifySessionOpened } from './notification-service';

const SESSIONS_COLLECTION = 'sessions';
const ATTENDANCES_COLLECTION = 'attendances';

export interface CreateSessionInput {
  praktikum: string;
  kelas: 'Kelas A' | 'Kelas B';
  materi: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  ruang: string;
  createdBy: string;
  status?: SessionStatus;
  kodeSesi?: string;
  labId?: string;
  radiusOverride?: number;
  /** Sprint 4: relasi mata kuliah (wajib untuk sesi baru). */
  courseId?: string;
  /** Sprint 4: toleransi khusus sesi yang menimpa lab.graceMinutes. */
  graceMinutesOverride?: number;
}

export type UpdateSessionInput = Partial<
  Pick<
    SessionDocument,
    | 'praktikum'
    | 'kelas'
    | 'materi'
    | 'tanggal'
    | 'waktuMulai'
    | 'waktuSelesai'
    | 'ruang'
    | 'labId'
  >
> & {
  radiusOverride?: number | null;
  courseId?: string;
  graceMinutesOverride?: number | null;
};

/**
 * Menghasilkan 4 digit kode numerik acak (1000 - 9999) untuk presensi sesi.
 */
export function generateSessionCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Memeriksa apakah sesi praktikum yang berstatus 'dibuka' telah melewati batas waktu 2 jam atau
 * jam praktikum telah usai sehingga harus ditutup secara otomatis.
 */
export function isSessionExpired(session: {
  status?: string;
  openedAt?: string;
  tanggal?: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  createdAt?: string;
  updatedAt?: string;
}): boolean {
  if (session.status !== 'dibuka') {
    return false;
  }

  const now = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 jam praktikum = 7.200.000 ms

  // 1. Cek durasi sejak sesi dibuka (openedAt)
  if (session.openedAt) {
    const openedTime = new Date(session.openedAt).getTime();
    if (!isNaN(openedTime) && now - openedTime >= TWO_HOURS_MS) {
      return true;
    }
  }

  // 2. Cek apakah jam selesai praktikum (waktuSelesai) telah terlampaui
  if (session.waktuSelesai) {
    try {
      const cleanTime = session.waktuSelesai.replace('.', ':').trim();
      const parts = cleanTime.split(':');
      if (parts.length >= 2) {
        const endHour = parseInt(parts[0], 10);
        const endMin = parseInt(parts[1], 10);

        if (!isNaN(endHour) && !isNaN(endMin)) {
          if (session.tanggal) {
            const parsedDate = new Date(session.tanggal);
            if (!isNaN(parsedDate.getTime())) {
              parsedDate.setHours(endHour, endMin, 0, 0);
              if (now >= parsedDate.getTime()) {
                return true;
              }
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback jika dibuka tanpa openedAt: periksa updatedAt/createdAt
  const refTime = session.openedAt || session.updatedAt || session.createdAt;
  if (refTime) {
    const t = new Date(refTime).getTime();
    if (!isNaN(t) && now - t >= TWO_HOURS_MS) {
      return true;
    }
  }

  return false;
}

function mapSessionSnapshot(id: string, raw: Record<string, unknown>): SessionDocument {
  const radiusRaw =
    raw.radiusOverride !== undefined && raw.radiusOverride !== null
      ? Number(raw.radiusOverride)
      : undefined;

  return {
    id,
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
    ...(raw.openedAt ? { openedAt: String(raw.openedAt) } : {}),
    ...(raw.closedAt ? { closedAt: String(raw.closedAt) } : {}),
    ...(raw.labId ? { labId: String(raw.labId) } : {}),
    ...(radiusRaw !== undefined && Number.isFinite(radiusRaw)
      ? { radiusOverride: radiusRaw }
      : {}),
    ...(raw.qrPayload ? { qrPayload: String(raw.qrPayload) } : {}),
    // Sprint 4 (dibaca dengan toleransi untuk dokumen lama)
    ...(raw.courseId ? { courseId: String(raw.courseId) } : {}),
    ...(raw.startAt ? { startAt: String(raw.startAt) } : {}),
    ...(raw.startedAt ? { startedAt: String(raw.startedAt) } : {}),
    ...(raw.graceMinutesOverride !== undefined && raw.graceMinutesOverride !== null &&
    Number.isFinite(Number(raw.graceMinutesOverride))
      ? { graceMinutesOverride: Number(raw.graceMinutesOverride) }
      : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

/**
 * Listener real-time seluruh dokumen pada koleksi /sessions.
 * Otomatis menutup sesi yang telah berjalan lebih dari 2 jam.
 */
export function subscribeSessions(
  onData: (sessions: SessionDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);

  return onSnapshot(
    sessionsRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const item = mapSessionSnapshot(d.id, d.data() as Record<string, unknown>);
        if (item.status === 'dibuka' && isSessionExpired(item)) {
          // Tutup sesi otomatis di Cloud Firestore
          updateSessionStatus(item.id, 'ditutup').catch(() => {});
          item.status = 'ditutup';
        }
        return item;
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time untuk satu dokumen sesi pada /sessions/{sessionId}.
 * Otomatis menutup sesi jika telah berjalan lebih dari 2 jam.
 */
export function subscribeSessionById(
  sessionId: string,
  onData: (session: SessionDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);

  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const item = mapSessionSnapshot(snapshot.id, snapshot.data() as Record<string, unknown>);
      if (item.status === 'dibuka' && isSessionExpired(item)) {
        updateSessionStatus(item.id, 'ditutup').catch(() => {});
        item.status = 'ditutup';
      }
      onData(item);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Membuat sesi praktikum baru di koleksi /sessions dengan kode 4 digit otomatis.
 */
export async function createSession(input: CreateSessionInput): Promise<SessionDocument> {
  const now = new Date().toISOString();
  const status: SessionStatus = input.status ?? 'belum-dibuka';
  const kodeSesi = input.kodeSesi?.trim() || generateSessionCode();
  const cleanLabId = input.labId?.trim();
  const hasRadiusOverride =
    input.radiusOverride !== undefined && Number.isFinite(input.radiusOverride);
  // Sprint 4 FR-P2-02.2: startAt (ISO UTC) dihitung dari tanggal + waktuMulai WIB.
  const startAtDate = parseWibDateTime(input.tanggal, input.waktuMulai);

  const payload: Omit<SessionDocument, 'id'> = {
    praktikum: input.praktikum.trim() || 'Praktikum PPK',
    kelas: input.kelas,
    materi: input.materi.trim(),
    tanggal: input.tanggal.trim(),
    waktuMulai: input.waktuMulai.trim(),
    waktuSelesai: input.waktuSelesai.trim(),
    ruang: input.ruang.trim() || 'Lab Komputasi 1',
    status,
    kodeSesi,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    ...(status === 'dibuka' ? { openedAt: now } : {}),
    ...(cleanLabId ? { labId: cleanLabId } : {}),
    ...(hasRadiusOverride ? { radiusOverride: Math.round(input.radiusOverride!) } : {}),
  };

  const extraSprint4: Record<string, unknown> = {};
  if (startAtDate) extraSprint4.startAt = startAtDate.toISOString();
  if (input.courseId?.trim()) extraSprint4.courseId = input.courseId.trim();
  if (
    input.graceMinutesOverride !== undefined &&
    Number.isFinite(input.graceMinutesOverride)
  ) {
    extraSprint4.graceMinutesOverride = Math.round(input.graceMinutesOverride);
  }
  Object.assign(payload, extraSprint4);

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), payload);
  const qrPayload = buildSessionQrPayload(docRef.id, kodeSesi);
  await updateDoc(docRef, { qrPayload }).catch(() => {});

  const created: SessionDocument = { id: docRef.id, ...payload, qrPayload };
  if (status === 'dibuka') {
    void notifySessionOpened(created);
  }
  return created;
}

/**
 * Memperbarui informasi metadata sesi praktikum di Firestore.
 */
export async function updateSession(
  sessionId: string,
  updates: UpdateSessionInput
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const cleanUpdates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.praktikum !== undefined) cleanUpdates.praktikum = updates.praktikum.trim();
  if (updates.kelas !== undefined) cleanUpdates.kelas = updates.kelas;
  if (updates.materi !== undefined) cleanUpdates.materi = updates.materi.trim();
  if (updates.tanggal !== undefined) cleanUpdates.tanggal = updates.tanggal.trim();
  if (updates.waktuMulai !== undefined) cleanUpdates.waktuMulai = updates.waktuMulai.trim();
  if (updates.waktuSelesai !== undefined) cleanUpdates.waktuSelesai = updates.waktuSelesai.trim();
  if (updates.ruang !== undefined) cleanUpdates.ruang = updates.ruang.trim();
  if (updates.labId !== undefined && updates.labId.trim()) {
    cleanUpdates.labId = updates.labId.trim();
  }
  if (updates.radiusOverride === null) {
    cleanUpdates.radiusOverride = deleteField();
  } else if (updates.radiusOverride !== undefined && Number.isFinite(updates.radiusOverride)) {
    cleanUpdates.radiusOverride = Math.round(updates.radiusOverride);
  }
  if (updates.courseId !== undefined && updates.courseId.trim()) {
    cleanUpdates.courseId = updates.courseId.trim();
  }
  if (updates.graceMinutesOverride === null) {
    cleanUpdates.graceMinutesOverride = deleteField();
  } else if (
    updates.graceMinutesOverride !== undefined &&
    Number.isFinite(updates.graceMinutesOverride)
  ) {
    cleanUpdates.graceMinutesOverride = Math.round(updates.graceMinutesOverride);
  }

  // Sprint 4 FR-P2-02.2: hitung ulang startAt bila tanggal/jam berubah.
  if (updates.tanggal !== undefined || updates.waktuMulai !== undefined) {
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const raw = snap.data();
      const tanggalBaru = String(updates.tanggal ?? raw.tanggal ?? '');
      const jamBaru = String(updates.waktuMulai ?? raw.waktuMulai ?? '');
      const startAtBaru = parseWibDateTime(tanggalBaru, jamBaru);
      if (startAtBaru) cleanUpdates.startAt = startAtBaru.toISOString();
    }
  }

  await updateDoc(sessionRef, cleanUpdates);

  // Peristiwa 2: jadwal diubah. Notifikasi non-blocking, tidak menggagalkan update Firestore.
  const scheduleChanges: string[] = [];
  if (updates.tanggal !== undefined) scheduleChanges.push(`Tanggal: ${updates.tanggal}`);
  if (updates.waktuMulai !== undefined || updates.waktuSelesai !== undefined) {
    scheduleChanges.push(
      `Jam: ${updates.waktuMulai ?? '(lama)'} - ${updates.waktuSelesai ?? '(lama)'}`
    );
  }
  if (updates.materi !== undefined) scheduleChanges.push(`Materi: ${updates.materi.trim()}`);
  if (updates.ruang !== undefined) scheduleChanges.push(`Ruang: ${updates.ruang.trim()}`);
  if (scheduleChanges.length > 0) {
    getDoc(sessionRef)
      .then((snap) => {
        if (snap.exists()) {
          void notifyScheduleChanged(
            mapSessionSnapshot(snap.id, snap.data() as Record<string, unknown>),
            scheduleChanges.join(' • ')
          );
        }
      })
      .catch((error) => console.warn('Gagal menyiapkan notifikasi perubahan jadwal:', error));
  }
}

/**
 * Mengubah status siklus hidup sesi ('belum-dibuka' | 'dibuka' | 'ditutup').
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const now = new Date().toISOString();
  const payload: Record<string, string> = {
    status,
    updatedAt: now,
  };

  if (status === 'dibuka') {
    payload.openedAt = now;
    const snap = await getDoc(sessionRef);
    // Sprint 4 FR-P2-03.2: startedAt diisi SEKALI saat sesi pertama dibuka.
    // "Buka Kembali" tidak boleh menimpanya (dipakai untuk baseline keterlambatan).
    if (snap.exists() && !snap.data()?.startedAt) {
      payload.startedAt = now;
    }
    const existingCode = snap.exists() ? String(snap.data()?.kodeSesi ?? '').trim() : '';
    const activeCode = existingCode || generateSessionCode();
    if (!existingCode) {
      payload.kodeSesi = activeCode;
    }
    payload.qrPayload = buildSessionQrPayload(sessionId, activeCode);
  } else if (status === 'ditutup') {
    payload.closedAt = now;
  }

  await updateDoc(sessionRef, payload);

  // Peristiwa 1: sesi dibuka. Kirim ke praktikan kelas terkait tanpa menahan operasi utama.
  if (status === 'dibuka') {
    getDoc(sessionRef)
      .then((snap) => {
        if (snap.exists()) {
          void notifySessionOpened(mapSessionSnapshot(snap.id, snap.data() as Record<string, unknown>));
        }
      })
      .catch((error) => console.warn('Gagal menyiapkan notifikasi sesi dibuka:', error));
  }
}

/**
 * Menghapus sesi beserta seluruh dokumen presensi terkait di koleksi /attendances.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const batch = writeBatch(db);
  const attendancesQuery = query(
    collection(db, ATTENDANCES_COLLECTION),
    where('sessionId', '==', sessionId)
  );
  const attendancesSnap = await getDocs(attendancesQuery);

  attendancesSnap.forEach((attDoc) => {
    batch.delete(attDoc.ref);
  });

  batch.delete(doc(db, SESSIONS_COLLECTION, sessionId));
  await batch.commit();
}

