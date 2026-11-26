/**
 * ==============================================================================
 * PPK LabPortal — Dashboard Service (Sprint 4 / Programmer 2)
 * ==============================================================================
 * Berlangganan (onSnapshot) seluruh koleksi yang dipakai dashboard Aslab dan
 * mengagregasinya di sisi client. Koleksi fines/payments HANYA DIBACA (milik P3).
 */
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  buildAttendanceRoster,
  hitungStatistikRoster,
  type RosterStudent,
} from '@/services/attendance-admin-service';
import { subscribeAllAttendances } from '@/services/attendance-service';
import { subscribeSessions } from '@/services/session-service';
import type {
  DashboardFinanceSummary,
  DashboardHistoryItem,
  DashboardLabStatus,
  DashboardMetrics,
  DashboardPeriod,
  DashboardSessionItem,
  Sprint4AttendanceDocument,
  Sprint4FineDocument,
  Sprint4LabDocument,
  Sprint4MemberDocument,
  Sprint4PaymentDocument,
  Sprint4SessionDocument,
} from '@/types/sprint4-p2';
import {
  formatTanggalPendek,
  formatWib,
  getManagedCourseIds,
  shiftPeriod,
  startOfWibPeriod,
  toWibDateString,
} from '@/utils/sprint4-p2-helpers';

const LABS_COLLECTION = 'labs';
const MEMBERS_COLLECTION = 'lab_members';
const FINES_COLLECTION = 'fines';
const PAYMENTS_COLLECTION = 'payments';

export interface DashboardRawData {
  labs: Sprint4LabDocument[];
  members: Sprint4MemberDocument[];
  sessions: Sprint4SessionDocument[];
  attendances: Sprint4AttendanceDocument[];
  fines: Sprint4FineDocument[];
  payments: Sprint4PaymentDocument[];
}

export interface DashboardAggregate {
  metrics: DashboardMetrics;
  labStatuses: DashboardLabStatus[];
  ongoing: DashboardSessionItem[];
  upcoming: DashboardSessionItem[];
  history: DashboardHistoryItem[];
  finance: DashboardFinanceSummary;
  periodeLabel: string;
}

function emptyData(): DashboardRawData {
  return { labs: [], members: [], sessions: [], attendances: [], fines: [], payments: [] };
}

function mapDocs<T>(snapshot: { forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => void }): T[] {
  const items: T[] = [];
  snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as T));
  return items;
}

/**
 * Mendengarkan seluruh koleksi dashboard. Setiap perubahan pada koleksi mana pun
 * memicu emit data terbaru (real-time).
 */
export function subscribeDashboardData(
  onData: (data: DashboardRawData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const state = emptyData();
  const emit = () => onData({ ...state });

  const listen = <T,>(collectionName: string, key: keyof DashboardRawData) =>
    onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        (state[key] as T[]) = mapDocs<T>(snapshot);
        emit();
      },
      (error) => {
        console.warn(`Dashboard listener ${collectionName} gagal:`, error);
        onError?.(error);
      }
    );

  const unsubs = [
    listen<Sprint4LabDocument>(LABS_COLLECTION, 'labs'),
    listen<Sprint4MemberDocument>(MEMBERS_COLLECTION, 'members'),
    subscribeSessions((items) => {
      state.sessions = items as unknown as Sprint4SessionDocument[];
      emit();
    }, onError),
    subscribeAllAttendances((items) => {
      state.attendances = items as unknown as Sprint4AttendanceDocument[];
      emit();
    }, onError),
    listen<Sprint4FineDocument>(FINES_COLLECTION, 'fines'),
    listen<Sprint4PaymentDocument>(PAYMENTS_COLLECTION, 'payments'),
  ];

  return () => unsubs.forEach((unsub) => unsub());
}

function cocokCourse(item: { courseId?: string }, courseIds: string[]): boolean {
  if (courseIds.length === 0) return true;
  return !!item.courseId && courseIds.includes(item.courseId);
}

function dalamPeriode(tanggal: string, mulai: string, sampaiEksklusif: string): boolean {
  if (!tanggal) return false;
  const value = tanggal.slice(0, 10);
  return value >= mulai && value < sampaiEksklusif;
}

function labelPeriode(base: Date, period: DashboardPeriod): string {
  const wib = new Date(base.getTime() + 7 * 60 * 60 * 1000);
  if (period === 'hari') {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(base);
  }
  if (period === 'minggu') {
    const senin = startOfWibPeriod(base, 'minggu');
    const minggu = new Date(senin.getTime() + 6 * 86400000);
    return `${toWibDateString(senin)} s/d ${toWibDateString(minggu)}`;
  }
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    month: 'long',
    year: 'numeric',
  }).format(wib);
}

/** Menghitung seluruh angka & daftar dashboard dari data mentah. */
export function buildDashboardAggregate(
  raw: DashboardRawData,
  aslabUserDoc: unknown,
  period: DashboardPeriod,
  periodAnchor: Date = new Date()
): DashboardAggregate {
  const courseIds = getManagedCourseIds(aslabUserDoc);
  const labs = raw.labs.filter((lab) => cocokCourse(lab, courseIds));
  const labIds = new Set(labs.map((lab) => lab.id));
  const members = raw.members.filter(
    (member) => cocokCourse(member, courseIds) && (labIds.size === 0 || labIds.has(member.labId))
  );
  const sessions = raw.sessions.filter((session) => cocokCourse(session, courseIds));
  const fines = raw.fines.filter((fine) => cocokCourse(fine, courseIds));
  const payments = raw.payments.filter((payment) => cocokCourse(payment, courseIds));

  const mulai = toWibDateString(startOfWibPeriod(periodAnchor, period));
  const sampai = toWibDateString(startOfWibPeriod(shiftPeriod(periodAnchor, period, 1), period));

  const sesiPeriode = sessions.filter((s) => dalamPeriode(s.tanggal, mulai, sampai));
  const ongoing = sesiPeriode
    .filter((s) => s.status === 'dibuka')
    .map(toSessionItem);
  const upcoming = sessions
    .filter((s) => s.status === 'belum-dibuka' && s.tanggal >= toWibDateString(new Date()))
    .sort((a, b) => `${a.tanggal}${a.waktuMulai}`.localeCompare(`${b.tanggal}${b.waktuMulai}`))
    .slice(0, 5)
    .map(toSessionItem);

  const labStatuses: DashboardLabStatus[] = labs.map((lab) => {
    const labSessions = sesiPeriode.filter((s) => s.labId === lab.id);
    const berlangsung = labSessions.find((s) => s.status === 'dibuka');
    const terjadwal = labSessions.find((s) => s.status === 'belum-dibuka');
    const status: DashboardLabStatus['status'] = berlangsung
      ? 'berlangsung'
      : terjadwal
        ? 'terjadwal'
        : 'tidak-ada-kegiatan';
    const students: RosterStudent[] = members
      .filter((m) => m.labId === lab.id && m.role === 'praktikan' && m.status !== 'removed')
      .map((m) => ({ id: m.uid || m.id, nama: m.nama, nim: m.nim, kelas: lab.kelas }));
    const attendanceForLab = berlangsung
      ? raw.attendances.filter((a) => a.sessionId === berlangsung.id)
      : [];
    const stats = berlangsung
      ? hitungStatistikRoster(buildAttendanceRoster(students, attendanceForLab))
      : null;

    return {
      labId: lab.id,
      namaLab: lab.nama || lab.kode || 'Laboratorium',
      gedung: lab.gedung,
      status,
      waktu: berlangsung?.waktuMulai || terjadwal?.waktuMulai,
      totalPraktikan: students.length,
      totalAsprak: members.filter(
        (m) => m.labId === lab.id && m.role === 'asprak' && m.status !== 'removed'
      ).length,
      ...(stats
        ? {
            kehadiranSesiBerjalan: {
              hadir: stats.hadir + stats.terlambat,
              terlambat: stats.terlambat,
              total: stats.total,
            },
          }
        : {}),
    };
  });

  const history: DashboardHistoryItem[] = sesiPeriode
    .filter((s) => s.status === 'ditutup')
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .map((session) => {
      const attendanceForSession = raw.attendances.filter((a) => a.sessionId === session.id);
      const studentsInLab: RosterStudent[] = members
        .filter((m) => m.labId === session.labId && m.role === 'praktikan' && m.status !== 'removed')
        .map((m) => ({ id: m.uid || m.id, nama: m.nama, nim: m.nim, kelas: session.kelas }));
      const stats = hitungStatistikRoster(buildAttendanceRoster(studentsInLab, attendanceForSession));
      return {
        ...toSessionItem(session),
        hadir: stats.hadir + stats.terlambat,
        terlambat: stats.terlambat,
        izin: stats.izin,
        belumHadir: stats.belumHadir,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
      };
    });

  const diterbitkan = fines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const lunas = fines.filter((f) => f.status === 'paid');
  const menunggu = fines.filter((f) => f.status === 'pending');
  const transaksi = payments
    .filter((p) => p.status === 'success')
    .sort((a, b) => String(b.settledAt || b.createdAt || '').localeCompare(String(a.settledAt || a.createdAt || '')))
    .map((payment) => {
      const fine = fines.find((f) => f.id === payment.fineId);
      return {
        id: payment.id,
        studentName: fine?.studentName || 'Praktikan',
        praktikum: fine?.praktikum,
        amount: Number(payment.amount) || Number(fine?.amount) || 0,
        time: formatWib(payment.settledAt || payment.createdAt),
      };
    });

  return {
    metrics: {
      totalLab: labs.length,
      totalPraktikan: members.filter((m) => m.role === 'praktikan' && m.status !== 'removed').length,
      totalAsprak: members.filter((m) => m.role === 'asprak' && m.status !== 'removed').length,
      sesiBerlangsung: sessions.filter((s) => s.status === 'dibuka').length,
    },
    labStatuses,
    ongoing,
    upcoming,
    history,
    finance: {
      diterbitkan,
      terbayar: lunas.reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
      menunggu: menunggu.reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
      transaksi,
    },
    periodeLabel: labelPeriode(periodAnchor, period),
  };
}

function toSessionItem(session: Sprint4SessionDocument): DashboardSessionItem {
  const labName = session.praktikum || '';
  return {
    id: session.id,
    praktikum: labName,
    kelas: session.kelas,
    materi: session.materi,
    tanggal: formatTanggalPendek(session.tanggal),
    waktuMulai: session.waktuMulai,
    labId: session.labId,
    status: session.status,
  };
}
