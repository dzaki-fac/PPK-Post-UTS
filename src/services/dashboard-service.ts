import {
  Unsubscribe,
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { DEFAULT_FINE_AMOUNT, DEFAULT_GRACE_MINUTES } from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import {
  AttendanceDocument,
  FineDocument,
  LabLocationDocument,
  LabMemberDocument,
  PaymentDocument,
  SessionDocument,
  UserDocument,
} from '@/types/praktikum';
import { normalizeRole } from '@/utils/role';
import {
  DashboardPeriodType,
  WibPeriodRange,
  getWibPeriodRange,
  parseWibDateTime,
} from '@/utils/wib';
import { clampRadiusMeter } from './lab-service';
import { mapSessionSnapshot } from './session-service';

export interface DashboardRawData {
  labs: LabLocationDocument[];
  members: LabMemberDocument[];
  users: UserDocument[];
  sessions: SessionDocument[];
  attendances: AttendanceDocument[];
  fines: FineDocument[];
  payments: PaymentDocument[];
}

export type LabActivityState = 'berlangsung' | 'terjadwal' | 'idle';

export interface LabStatusCardItem {
  lab: LabLocationDocument;
  state: LabActivityState;
  praktikanCount: number;
  asprakCount: number;
  activeSession: SessionDocument | null;
  nextSession: SessionDocument | null;
  attendanceProgress?: {
    presentCount: number;
    totalCount: number;
    percent: number;
  };
}

export interface SessionActivityHistoryItem {
  session: SessionDocument;
  labName: string;
  hadirCount: number;
  terlambatCount: number;
  izinCount: number;
  belumHadirCount: number;
  totalExpected: number;
}

export interface FinanceTransactionItem {
  paymentId: string;
  invoiceNumber: string;
  studentName: string;
  praktikum: string;
  amount: number;
  settledAt: string;
  paymentType?: string;
}

export interface DashboardComputedSnapshot {
  range: WibPeriodRange;
  metrics: {
    totalLabs: number;
    totalPraktikan: number;
    totalAsprak: number;
    ongoingSessionsCount: number;
  };
  labStatuses: LabStatusCardItem[];
  ongoingSessions: SessionDocument[];
  upcomingSessions: SessionDocument[];
  activityHistory: SessionActivityHistoryItem[];
  financeSummary: {
    issuedCount: number;
    issuedAmount: number;
    paidAmount: number;
    pendingAmount: number;
    transactions: FinanceTransactionItem[];
  };
}

function chunkIds(ids: string[], size = 30): string[][] {
  const clean = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  const out: string[][] = [];
  for (let i = 0; i < clean.length; i += size) {
    out.push(clean.slice(i, i + size));
  }
  return out;
}

function mapLabDoc(id: string, raw: Record<string, unknown>): LabLocationDocument {
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);
  const graceRaw = Number(raw.graceMinutes);
  const fineRaw = Number(raw.fineAmount);
  const capRaw = Number(raw.kapasitas);

  return {
    id,
    nama: String(raw.nama ?? 'Laboratorium'),
    kode: String(raw.kode ?? 'LAB'),
    gedung: String(raw.gedung ?? 'Gedung E, FSM UNDIP'),
    latitude: Number.isFinite(lat) ? lat : -7.04912,
    longitude: Number.isFinite(lng) ? lng : 110.44082,
    radiusMeter: clampRadiusMeter(Number(raw.radiusMeter)),
    ...(raw.deskripsi ? { deskripsi: String(raw.deskripsi) } : {}),
    isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
    updatedBy: String(raw.updatedBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    ...(raw.courseId ? { courseId: String(raw.courseId) } : {}),
    ...(raw.courseNama ? { courseNama: String(raw.courseNama) } : {}),
    ...(raw.kelas ? { kelas: String(raw.kelas) } : {}),
    ...(Number.isFinite(capRaw) && capRaw > 0 ? { kapasitas: capRaw } : {}),
    graceMinutes:
      Number.isFinite(graceRaw) && graceRaw >= 0 ? Math.round(graceRaw) : DEFAULT_GRACE_MINUTES,
    fineAmount:
      Number.isFinite(fineRaw) && fineRaw > 0 ? Math.round(fineRaw) : DEFAULT_FINE_AMOUNT,
  };
}

function mapMemberDoc(id: string, raw: Record<string, unknown>): LabMemberDocument {
  return {
    id,
    courseId: String(raw.courseId ?? ''),
    labId: String(raw.labId ?? ''),
    role: raw.role === 'asprak' ? 'asprak' : 'praktikan',
    ...(raw.nim ? { nim: String(raw.nim) } : {}),
    nama: String(raw.nama ?? ''),
    email: String(raw.email ?? ''),
    emailLower: String(raw.emailLower ?? '').toLowerCase(),
    uid: raw.uid ? String(raw.uid) : null,
    status: raw.status === 'removed' ? 'removed' : 'active',
    ...(raw.importBatchId ? { importBatchId: String(raw.importBatchId) } : {}),
    createdBy: String(raw.createdBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function mapAttendanceDoc(id: string, raw: Record<string, unknown>): AttendanceDocument {
  const statusRaw = raw.attendanceStatus;
  const attendanceStatus =
    statusRaw === 'terlambat' || statusRaw === 'izin' ? statusRaw : 'hadir';
  const methodRaw = raw.verificationMethod;
  const verificationMethod =
    methodRaw === 'qr-location' ||
    methodRaw === 'manual-asprak' ||
    methodRaw === 'leave-approved'
      ? methodRaw
      : 'code-location';

  return {
    id,
    sessionId: String(raw.sessionId ?? ''),
    studentId: String(raw.studentId ?? ''),
    studentName: String(raw.studentName ?? 'Praktikan'),
    studentNim: String(raw.studentNim ?? '-'),
    studentClass: raw.studentClass === 'B' ? 'B' : 'A',
    waktuKehadiran: String(raw.waktuKehadiran ?? ''),
    timestamp: Number(raw.timestamp ?? 0),
    verifiedByCode: Boolean(raw.verifiedByCode),
    verifiedByLocation: Boolean(raw.verifiedByLocation),
    verificationMethod,
    attendanceStatus,
    ...(raw.fineId ? { fineId: String(raw.fineId) } : {}),
    ...(raw.excusedByLeaveId ? { excusedByLeaveId: String(raw.excusedByLeaveId) } : {}),
  };
}

function mapFineDoc(id: string, raw: Record<string, unknown>): FineDocument {
  const statusRaw = raw.status;
  const status = statusRaw === 'paid' || statusRaw === 'pending' ? statusRaw : 'unpaid';
  return {
    id,
    invoiceNumber: String(raw.invoiceNumber ?? id),
    studentId: String(raw.studentId ?? ''),
    studentName: String(raw.studentName ?? 'Praktikan'),
    ...(raw.studentNim ? { studentNim: String(raw.studentNim) } : {}),
    sessionId: String(raw.sessionId ?? ''),
    attendanceId: String(raw.attendanceId ?? id),
    labId: String(raw.labId ?? ''),
    courseId: String(raw.courseId ?? ''),
    praktikum: String(raw.praktikum ?? 'Praktikum'),
    sessionDate: String(raw.sessionDate ?? ''),
    lateMinutes: Number(raw.lateMinutes ?? 0),
    graceMinutes: Number(raw.graceMinutes ?? DEFAULT_GRACE_MINUTES),
    amount: Number(raw.amount ?? DEFAULT_FINE_AMOUNT),
    currency: 'IDR',
    status,
    ...(raw.activePaymentId ? { activePaymentId: String(raw.activePaymentId) } : {}),
    paymentAttempts: Number(raw.paymentAttempts ?? 0),
    ...(raw.paidAt ? { paidAt: String(raw.paidAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function mapPaymentDoc(id: string, raw: Record<string, unknown>): PaymentDocument {
  const statusRaw = raw.status;
  const status = statusRaw === 'success' || statusRaw === 'failed' ? statusRaw : 'pending';
  return {
    id,
    fineId: String(raw.fineId ?? ''),
    invoiceNumber: String(raw.invoiceNumber ?? ''),
    attempt: Number(raw.attempt ?? 1),
    studentId: String(raw.studentId ?? ''),
    sessionId: String(raw.sessionId ?? ''),
    attendanceId: String(raw.attendanceId ?? ''),
    courseId: String(raw.courseId ?? ''),
    labId: String(raw.labId ?? ''),
    praktikum: String(raw.praktikum ?? 'Praktikum'),
    amount: Number(raw.amount ?? 0),
    status,
    ...(raw.midtransStatus ? { midtransStatus: String(raw.midtransStatus) } : {}),
    ...(raw.paymentType ? { paymentType: String(raw.paymentType) } : {}),
    snapToken: String(raw.snapToken ?? ''),
    redirectUrl: String(raw.redirectUrl ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
    ...(raw.settledAt ? { settledAt: String(raw.settledAt) } : {}),
    ...(raw.lastWebhookAt ? { lastWebhookAt: String(raw.lastWebhookAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function getSessionStartMs(session: SessionDocument): number | null {
  if (session.startAt) {
    const t = new Date(session.startAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const dt = parseWibDateTime(session.tanggal, session.waktuMulai);
  if (dt) return dt.getTime();
  if (session.createdAt) {
    const c = new Date(session.createdAt).getTime();
    if (!Number.isNaN(c)) return c;
  }
  return null;
}

function getIsoMs(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function matchSessionToLab(session: SessionDocument, lab: LabLocationDocument): boolean {
  if (session.labId && session.labId === lab.id) return true;
  const room = (session.ruang ?? '').trim().toLowerCase();
  if (!room) return false;
  return room === lab.nama.trim().toLowerCase() || room === lab.kode.trim().toLowerCase();
}

function subscribeChunkedCollection<T>(
  collectionName: string,
  courseIds: string[],
  mapper: (id: string, raw: Record<string, unknown>) => T,
  onUpdate: (items: T[]) => void,
  maxDocs = 500
): Unsubscribe {
  const chunks = chunkIds(courseIds, 30);
  if (chunks.length === 0) {
    const q = query(collection(db, collectionName), limit(maxDocs));
    return onSnapshot(
      q,
      (snap) => {
        onUpdate(snap.docs.map((d) => mapper(d.id, d.data() as Record<string, unknown>)));
      },
      () => {
        onUpdate([]);
      }
    );
  }

  const chunkMap = new Map<number, T[]>();
  const unsubs: Unsubscribe[] = [];
  const emit = () => {
    const combined: T[] = [];
    chunkMap.forEach((arr) => combined.push(...arr));
    onUpdate(combined);
  };

  chunks.forEach((chunk, idx) => {
    const q = query(
      collection(db, collectionName),
      where('courseId', 'in', chunk),
      limit(maxDocs)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        chunkMap.set(
          idx,
          snap.docs.map((d) => mapper(d.id, d.data() as Record<string, unknown>))
        );
        emit();
      },
      () => {
        chunkMap.set(idx, []);
        emit();
      }
    );
    unsubs.push(unsub);
  });

  return () => unsubs.forEach((u) => u());
}

/**
 * Berlangganan real-time seluruh data yang dibutuhkan Dashboard Aslab.
 * Koleksi keuangan (fines & payments) bersifat read-only dari client.
 */
export function subscribeAslabDashboardData(
  managedCourseIds: string[],
  onData: (raw: DashboardRawData) => void
): Unsubscribe {
  const state: DashboardRawData = {
    labs: [],
    members: [],
    users: [],
    sessions: [],
    attendances: [],
    fines: [],
    payments: [],
  };

  const emit = () => {
    onData({ ...state });
  };

  const unsubLabs = onSnapshot(
    query(collection(db, 'labs'), limit(500)),
    (snap) => {
      const allLabs = snap.docs.map((d) => mapLabDoc(d.id, d.data() as Record<string, unknown>));
      if (managedCourseIds.length > 0) {
        const courseSet = new Set(managedCourseIds);
        state.labs = allLabs.filter((l) => !l.courseId || courseSet.has(l.courseId));
      } else {
        state.labs = allLabs;
      }
      emit();
    },
    () => emit()
  );

  const unsubMembers = subscribeChunkedCollection(
    'lab_members',
    managedCourseIds,
    mapMemberDoc,
    (items) => {
      state.members = items.filter((m) => m.status === 'active');
      emit();
    },
    500
  );

  const unsubUsers = onSnapshot(
    query(collection(db, 'users'), limit(500)),
    (snap) => {
      state.users = snap.docs.map((d) => ({
        ...(d.data() as UserDocument),
        uid: d.id,
      }));
      emit();
    },
    () => emit()
  );

  const unsubSessions = onSnapshot(
    query(collection(db, 'sessions'), limit(500)),
    (snap) => {
      const allSessions = snap.docs.map((d) =>
        mapSessionSnapshot(d.id, d.data() as Record<string, unknown>)
      );
      if (managedCourseIds.length > 0) {
        const courseSet = new Set(managedCourseIds);
        state.sessions = allSessions.filter((s) => !s.courseId || courseSet.has(s.courseId));
      } else {
        state.sessions = allSessions;
      }
      emit();
    },
    () => emit()
  );

  const unsubAttendances = onSnapshot(
    query(collection(db, 'attendances'), limit(500)),
    (snap) => {
      state.attendances = snap.docs.map((d) =>
        mapAttendanceDoc(d.id, d.data() as Record<string, unknown>)
      );
      emit();
    },
    () => emit()
  );

  const unsubFines = subscribeChunkedCollection(
    'fines',
    managedCourseIds,
    mapFineDoc,
    (items) => {
      state.fines = items;
      emit();
    },
    500
  );

  const unsubPayments = subscribeChunkedCollection(
    'payments',
    managedCourseIds,
    mapPaymentDoc,
    (items) => {
      state.payments = items;
      emit();
    },
    500
  );

  return () => {
    unsubLabs();
    unsubMembers();
    unsubUsers();
    unsubSessions();
    unsubAttendances();
    unsubFines();
    unsubPayments();
  };
}

/**
 * Mengolah data mentah Firestore menjadi metrik & daftar terstruktur sesuai filter Hari/Minggu/Bulan.
 */
export function buildDashboardSnapshot(
  raw: DashboardRawData,
  period: DashboardPeriodType,
  anchorDate: Date
): DashboardComputedSnapshot {
  const range = getWibPeriodRange(period, anchorDate);
  const nowMs = Date.now();

  const activeLabs = raw.labs.filter((l) => l.isActive);
  const activeLabIds = new Set(activeLabs.map((l) => l.id));

  // Filter sesi yang termasuk dalam lab yang dikelola
  const scopedSessions =
    activeLabIds.size > 0
      ? raw.sessions.filter((s) => !s.labId || activeLabIds.has(s.labId) || activeLabs.some((l) => matchSessionToLab(s, l)))
      : raw.sessions;

  // Hitung jumlah praktikan & asprak (prioritas /lab_members, fallback /users bila /lab_members belum diimpor)
  const memberPraktikan = raw.members.filter((m) => m.role === 'praktikan');
  const memberAsprak = raw.members.filter((m) => m.role === 'asprak');

  const userPraktikan = raw.users.filter((u) => normalizeRole(u.peran) === 'praktikan');
  const userAsprak = raw.users.filter((u) => normalizeRole(u.peran) === 'asprak');

  const uniquePraktikanKeys = new Set<string>(
    memberPraktikan.length > 0
      ? memberPraktikan.map((m) => m.uid || m.emailLower || m.nim || m.id)
      : userPraktikan.map((u) => u.uid)
  );

  const uniqueAsprakKeys = new Set<string>(
    memberAsprak.length > 0
      ? memberAsprak.map((m) => m.uid || m.emailLower || m.id)
      : userAsprak.map((u) => u.uid)
  );

  // Indeks presensi per sessionId
  const attBySession = new Map<string, AttendanceDocument[]>();
  raw.attendances.forEach((a) => {
    const list = attBySession.get(a.sessionId) ?? [];
    list.push(a);
    attBySession.set(a.sessionId, list);
  });

  // Status per laboratorium
  const labStatuses: LabStatusCardItem[] = activeLabs.map((lab) => {
    const labSessions = scopedSessions.filter((s) => matchSessionToLab(s, lab));
    const activeSession = labSessions.find((s) => s.status === 'dibuka') ?? null;

    const scheduledSessions = labSessions
      .filter((s) => s.status === 'belum-dibuka')
      .sort((a, b) => (getSessionStartMs(a) ?? Number.MAX_SAFE_INTEGER) - (getSessionStartMs(b) ?? Number.MAX_SAFE_INTEGER));
    const nextSession = scheduledSessions[0] ?? null;

    const labPraktikanCount =
      memberPraktikan.length > 0
        ? memberPraktikan.filter((m) => m.labId === lab.id).length
        : userPraktikan.filter((u) => !u.labId || u.labId === lab.id).length;

    const labAsprakCount =
      memberAsprak.length > 0
        ? memberAsprak.filter((m) => m.labId === lab.id).length
        : userAsprak.filter((u) => u.labIds?.includes(lab.id)).length;

    let attendanceProgress: LabStatusCardItem['attendanceProgress'];
    if (activeSession) {
      const sessionAtts = attBySession.get(activeSession.id) ?? [];
      const presentCount = sessionAtts.filter(
        (a) => a.attendanceStatus !== 'izin'
      ).length;
      const totalCount = Math.max(labPraktikanCount, presentCount);
      attendanceProgress = {
        presentCount,
        totalCount,
        percent: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0,
      };
    }

    const state: LabActivityState = activeSession
      ? 'berlangsung'
      : nextSession
      ? 'terjadwal'
      : 'idle';

    return {
      lab,
      state,
      praktikanCount: labPraktikanCount,
      asprakCount: labAsprakCount,
      activeSession,
      nextSession,
      attendanceProgress,
    };
  });

  // Sesi berlangsung & akan datang
  const ongoingSessions = scopedSessions
    .filter((s) => s.status === 'dibuka')
    .sort((a, b) => (getSessionStartMs(a) ?? 0) - (getSessionStartMs(b) ?? 0));

  const allUpcoming = scopedSessions
    .filter((s) => s.status === 'belum-dibuka')
    .sort((a, b) => (getSessionStartMs(a) ?? Number.MAX_SAFE_INTEGER) - (getSessionStartMs(b) ?? Number.MAX_SAFE_INTEGER));

  const upcomingInPeriod = allUpcoming.filter((s) => {
    const startMs = getSessionStartMs(s);
    if (startMs === null) return false;
    return startMs >= range.startMs && startMs <= range.endMs && startMs >= nowMs - 3600000;
  });

  const upcomingSessions =
    upcomingInPeriod.length > 0 ? upcomingInPeriod : allUpcoming.slice(0, 5);

  // Riwayat kegiatan laboratorium (sesi ditutup pada periode terpilih)
  const closedInPeriod = scopedSessions.filter((s) => {
    if (s.status !== 'ditutup') return false;
    const refMs = getIsoMs(s.closedAt) ?? getSessionStartMs(s) ?? getIsoMs(s.updatedAt);
    if (refMs === null) return false;
    return refMs >= range.startMs && refMs <= range.endMs;
  });

  const activityHistory: SessionActivityHistoryItem[] = closedInPeriod
    .sort((a, b) => (getIsoMs(b.closedAt) ?? 0) - (getIsoMs(a.closedAt) ?? 0))
    .map((session) => {
      const matchedLab = activeLabs.find((l) => matchSessionToLab(session, l));
      const sessionAtts = attBySession.get(session.id) ?? [];
      const hadirCount = sessionAtts.filter((a) => (a.attendanceStatus ?? 'hadir') === 'hadir').length;
      const terlambatCount = sessionAtts.filter((a) => a.attendanceStatus === 'terlambat').length;
      const izinCount = sessionAtts.filter((a) => a.attendanceStatus === 'izin').length;

      const labPraktikanTotal = matchedLab
        ? memberPraktikan.length > 0
          ? memberPraktikan.filter((m) => m.labId === matchedLab.id).length
          : userPraktikan.filter((u) => !u.labId || u.labId === matchedLab.id).length
        : sessionAtts.length;

      const totalExpected = Math.max(labPraktikanTotal, sessionAtts.length);
      const belumHadirCount = Math.max(0, totalExpected - sessionAtts.length);

      return {
        session,
        labName: matchedLab?.nama || session.ruang || 'Laboratorium',
        hadirCount,
        terlambatCount,
        izinCount,
        belumHadirCount,
        totalExpected,
      };
    });

  // Riwayat keuangan hasil denda praktikum (pada periode terpilih)
  const userMap = new Map<string, UserDocument>();
  raw.users.forEach((u) => userMap.set(u.uid, u));
  const fineMap = new Map<string, FineDocument>();
  raw.fines.forEach((f) => fineMap.set(f.id, f));

  const finesInPeriod = raw.fines.filter((f) => {
    const refMs = getIsoMs(f.createdAt) ?? getIsoMs(f.updatedAt);
    if (refMs === null) return false;
    return refMs >= range.startMs && refMs <= range.endMs;
  });

  const issuedAmount = finesInPeriod.reduce((sum, f) => sum + f.amount, 0);
  const paidAmount = finesInPeriod
    .filter((f) => f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0);
  const pendingAmount = finesInPeriod
    .filter((f) => f.status !== 'paid')
    .reduce((sum, f) => sum + f.amount, 0);

  const transactions: FinanceTransactionItem[] = raw.payments
    .filter((p) => {
      if (p.status !== 'success') return false;
      const refMs = getIsoMs(p.settledAt) ?? getIsoMs(p.updatedAt) ?? getIsoMs(p.createdAt);
      if (refMs === null) return false;
      return refMs >= range.startMs && refMs <= range.endMs;
    })
    .sort((a, b) => (getIsoMs(b.settledAt) ?? 0) - (getIsoMs(a.settledAt) ?? 0))
    .map((p) => {
      const fine = fineMap.get(p.fineId);
      const student = userMap.get(p.studentId);
      return {
        paymentId: p.id,
        invoiceNumber: p.invoiceNumber || p.id,
        studentName: fine?.studentName || student?.nama || 'Praktikan',
        praktikum: p.praktikum || fine?.praktikum || 'Praktikum',
        amount: p.amount,
        settledAt: p.settledAt || p.updatedAt || p.createdAt,
        paymentType: p.paymentType,
      };
    });

  return {
    range,
    metrics: {
      totalLabs: activeLabs.length,
      totalPraktikan: uniquePraktikanKeys.size,
      totalAsprak: uniqueAsprakKeys.size,
      ongoingSessionsCount: ongoingSessions.length,
    },
    labStatuses,
    ongoingSessions,
    upcomingSessions,
    activityHistory,
    financeSummary: {
      issuedCount: finesInPeriod.length,
      issuedAmount,
      paidAmount,
      pendingAmount,
      transactions,
    },
  };
}
