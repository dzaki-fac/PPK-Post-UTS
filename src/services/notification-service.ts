/**
 * PPK LabPortal — Push Notification Service (Sprint 3 / Programmer 3)
 * Mengelola token perangkat, dispatcher peristiwa, dan log notifikasi di Firestore.
 * Semua fungsi pengiriman bersifat non-blocking: kegagalan push tidak boleh
 * menggagalkan aksi utama asisten (buka sesi, ubah jadwal, moderasi izin).
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  Unsubscribe,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  NotificationDeliveryStatus,
  NotificationDocument,
  NotificationEventType,
  SessionDocument,
  UserDocument,
  UserRole,
} from '@/types/praktikum';
import type { LeaveRequestDocument, LeaveStatus } from './leave-service';
import { displayLocalRichNotification } from './rich-notification-service';

const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';
export const NOTIFICATION_CHANNEL_ID = 'praktikum-updates';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export type NotificationPermissionState = 'granted' | 'denied' | 'unavailable';

/** Handler notifikasi foreground:
 * - Tampilkan banner heads-up & suara seperti WhatsApp untuk notifikasi lokal (instant & terjadwal).
 * - Untuk remote FCM yang sudah ditangani rich-notification-service, cegah banner ganda.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const trigger = notification.request.trigger as { type?: string } | null;
      const isRemotePush = trigger?.type === 'push';
      return {
        shouldShowBanner: !isRemotePush,
        shouldShowList: true,
        shouldPlaySound: !isRemotePush,
        shouldSetBadge: false,
      };
    },
  });
}

/** Channel Android (MAX importance agar muncul pop-up heads-up di atas layar seperti WhatsApp). */
export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Pembaruan Praktikum',
      description: 'Pemberitahuan sesi praktikum, perubahan jadwal, dan keputusan izin.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#EA580C',
    });
  } catch (error) {
    console.warn('Gagal menyiapkan channel notifikasi:', error);
  }
}

/**
 * Memunculkan Rich Notification pop-up sistem (heads-up banner + tombol aksi Buka/Tutup + suara + getar)
 * langsung di HP Android/iOS menggunakan react-native-notify-kit (fallback ke expo-notifications).
 */
export async function presentInstantPhoneNotificationAsync(input: {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    const displayedByNotifyKit = await displayLocalRichNotification({
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl,
      channelId: NOTIFICATION_CHANNEL_ID,
      data: input.data,
    });
    if (displayedByNotifyKit) return;

    await configureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: input.data ?? {},
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Gagal memunculkan notifikasi pop-up HP:', error);
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Meminta izin notifikasi, mengambil Expo Push Token, lalu menyimpannya ke /users/{uid}.
 * Tidak melempar error: kegagalan (simulator, web, offline) dikembalikan sebagai status.
 */
export async function registerForPushNotificationsAsync(
  uid: string
): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web' || !uid) return 'unavailable';

  try {
    await configureNotificationChannel();

    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) {
      await updateUserPushFields(uid, { notificationsEnabled: false });
      return 'denied';
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await updateUserPushFields(uid, {
      expoPushToken: token,
      notificationsEnabled: true,
      pushTokenUpdatedAt: new Date().toISOString(),
    });
    return 'granted';
  } catch (error) {
    console.warn('Registrasi push token dilewati:', error);
    return 'unavailable';
  }
}

async function updateUserPushFields(uid: string, fields: Partial<UserDocument>): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/** Kirim ke Expo Push Service. Mengembalikan status pengiriman per token, tidak pernah melempar. */
async function sendPushMessagesAsync(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<Map<string, NotificationDeliveryStatus>> {
  const statusByToken = new Map<string, NotificationDeliveryStatus>();
  const uniqueTokens = Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
  if (uniqueTokens.length === 0 || Platform.OS === 'web') {
    return statusByToken;
  }

  try {
    for (let i = 0; i < uniqueTokens.length; i += 100) {
      const chunk = uniqueTokens.slice(i, i + 100);
      const messages = chunk.map((to) => ({
        to,
        title,
        body,
        sound: 'default' as const,
        priority: 'high' as const,
        channelId: NOTIFICATION_CHANNEL_ID,
        data,
      }));

      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        chunk.forEach((t) => statusByToken.set(t, 'failed'));
        continue;
      }

      const result = (await response.json()) as { data?: { status?: string }[] };
      const tickets = result.data ?? [];
      chunk.forEach((t, idx) => {
        statusByToken.set(t, tickets[idx]?.status === 'ok' ? 'sent' : 'failed');
      });
    }

    return statusByToken;
  } catch (error) {
    console.warn('Pengiriman push notification gagal:', error);
    uniqueTokens.forEach((t) => {
      if (!statusByToken.has(t)) statusByToken.set(t, 'failed');
    });
    return statusByToken;
  }
}

interface LogInput {
  targetUserId: string;
  targetRole: UserRole;
  eventType: NotificationEventType;
  title: string;
  body: string;
  deliveryStatus: NotificationDeliveryStatus;
  relatedSessionId?: string;
  relatedLeaveId?: string;
}

async function writeNotificationLog(input: LogInput): Promise<void> {
  const payload: Omit<NotificationDocument, 'id'> = {
    targetUserId: input.targetUserId,
    targetRole: input.targetRole,
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    isRead: false,
    deliveryStatus: input.deliveryStatus,
    createdAt: new Date().toISOString(),
    ...(input.relatedSessionId ? { relatedSessionId: input.relatedSessionId } : {}),
    ...(input.relatedLeaveId ? { relatedLeaveId: input.relatedLeaveId } : {}),
  };
  await addDoc(collection(db, NOTIFICATIONS_COLLECTION), payload);
}

interface PushTarget {
  uid: string;
  expoPushToken?: string;
  notificationsEnabled?: boolean;
}

async function getPraktikanTargets(kelas?: string, labId?: string): Promise<PushTarget[]> {
  try {
    const snap = await getDocs(
      query(collection(db, USERS_COLLECTION), where('peran', '==', 'praktikan'))
    );
    const users = snap.docs.map(
      (item) => ({ uid: item.id, ...item.data() }) as PushTarget & UserDocument
    );
    const normalizeClass = (value?: string) =>
      value ? value.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase() : '';
    const wantedClass = normalizeClass(kelas);
    const cleanLabId = labId?.trim();

    return users.filter((user) => {
      const userClass = normalizeClass(user.kelas);
      const classMatch = !wantedClass || !userClass || userClass === wantedClass;
      const labMatch = !cleanLabId || !user.labId || user.labId === cleanLabId;
      return classMatch && labMatch;
    });
  } catch (error) {
    console.warn('Gagal mengambil target notifikasi:', error);
    return [];
  }
}

async function getTargetByUid(uid: string): Promise<PushTarget | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data() as UserDocument;
    // Pastikan push notification hanya ditujukan ke role mahasiswa (praktikan)
    if (data.peran !== 'praktikan') return null;
    return {
      uid,
      expoPushToken: data.expoPushToken,
      notificationsEnabled: data.notificationsEnabled,
    };
  } catch {
    return null;
  }
}

/**
 * Mengirim notifikasi ke banyak target sekaligus dan mencatat log per pengguna.
 * Dipakai ketiga dispatcher di bawah; seluruh error ditelan dengan aman.
 */
async function dispatchAsync(input: {
  targets: PushTarget[];
  targetRole: UserRole;
  eventType: NotificationEventType;
  title: string;
  body: string;
  data: Record<string, string>;
  relatedSessionId?: string;
  relatedLeaveId?: string;
}): Promise<void> {
  try {
    const tokens = input.targets
      .filter((target) => target.notificationsEnabled !== false)
      .map((target) => target.expoPushToken?.trim())
      .filter((token): token is string => Boolean(token));
    const statusByToken = await sendPushMessagesAsync(tokens, input.title, input.body, input.data);

    await Promise.all(
      input.targets.map((target) => {
        const token = target.notificationsEnabled !== false ? target.expoPushToken?.trim() : '';
        const deliveryStatus: NotificationDeliveryStatus = token
          ? (statusByToken.get(token) ?? 'in_app_only')
          : 'in_app_only';
        return writeNotificationLog({
          targetUserId: target.uid,
          targetRole: input.targetRole,
          eventType: input.eventType,
          title: input.title,
          body: input.body,
          deliveryStatus,
          relatedSessionId: input.relatedSessionId,
          relatedLeaveId: input.relatedLeaveId,
        }).catch((error) => console.warn('Gagal menulis log notifikasi:', error));
      })
    );
  } catch (error) {
    console.warn('Dispatcher notifikasi dilewati:', error);
  }
}

/** Peristiwa 1 — sesi praktikum dibuka. Target: praktikan pada lab/kelas terkait. */
export async function notifySessionOpened(session: SessionDocument): Promise<void> {
  await dispatchAsync({
    targets: await getPraktikanTargets(session.kelas, session.labId),
    targetRole: 'praktikan',
    eventType: 'session_opened',
    title: 'Sesi Praktikum Dibuka',
    body: `${session.praktikum} • ${session.kelas} di ${session.ruang || 'laboratorium'} sudah dibuka. Buka halaman presensi untuk mencatat kehadiran.`,
    data: {
      url: '/praktikan/presensi',
      eventType: 'session_opened',
      relatedSessionId: session.id,
    },
    relatedSessionId: session.id,
  });
}

/** Peristiwa 2 — jadwal sesi diubah. Target: praktikan pada lab/kelas terkait. */
export async function notifyScheduleChanged(
  session: SessionDocument,
  summary: string
): Promise<void> {
  await dispatchAsync({
    targets: await getPraktikanTargets(session.kelas, session.labId),
    targetRole: 'praktikan',
    eventType: 'schedule_updated',
    title: 'Jadwal Praktikum Diubah',
    body: `${session.praktikum} • ${session.kelas}. ${summary || 'Periksa jadwal terbaru pada aplikasi.'}`,
    data: {
      url: '/praktikan/jadwal',
      eventType: 'schedule_updated',
      relatedSessionId: session.id,
    },
    relatedSessionId: session.id,
  });
}

/** Peristiwa 3 — keputusan izin. Target: hanya praktikan pemohon. */
export async function notifyLeaveDecision(
  leaveRequest: Pick<LeaveRequestDocument, 'id' | 'studentId' | 'sessionName' | 'reviewNotes'>,
  decision: Extract<LeaveStatus, 'disetujui' | 'ditolak'>,
  reviewNotes?: string
): Promise<void> {
  const isApproved = decision === 'disetujui';
  const notes = reviewNotes ?? leaveRequest.reviewNotes;
  const body =
    `${leaveRequest.sessionName} — ${isApproved ? 'Izin Disetujui' : 'Izin Ditolak'}.` +
    (notes ? ` Catatan asisten: ${notes}` : '');

  await dispatchAsync({
    targets: [await getTargetByUid(leaveRequest.studentId)].filter(
      (target): target is PushTarget => target !== null
    ),
    targetRole: 'praktikan',
    eventType: isApproved ? 'leave_approved' : 'leave_rejected',
    title: isApproved ? 'Izin Disetujui' : 'Izin Ditolak',
    body,
    data: {
      url: '/praktikan/pengajuan-izin',
      eventType: isApproved ? 'leave_approved' : 'leave_rejected',
      relatedLeaveId: leaveRequest.id,
    },
    relatedLeaveId: leaveRequest.id,
  });
}

/** Listener real-time log notifikasi milik pengguna yang sedang login. */
export function subscribeUserNotifications(
  uid: string,
  callback: (items: NotificationDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('targetUserId', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() } as NotificationDocument)
      );
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(items);
    },
    (error) => onError?.(error)
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { isRead: true });
}

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  january: 0,
  feb: 1,
  februari: 1,
  february: 1,
  mar: 2,
  maret: 2,
  march: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  june: 5,
  jul: 6,
  juli: 6,
  july: 6,
  agu: 7,
  agt: 7,
  agustus: 7,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
  december: 11,
};

/**
 * Mengurai kombinasi tanggal ('22 Nov 2026' atau '2026-11-22') dan waktuMulai ('07.30' / '07:30')
 * menjadi objek Date lokal perangkat untuk penjadwalan notifikasi otomatis.
 */
export function parseSessionStartDate(tanggal?: string, waktuMulai?: string): Date | null {
  if (!tanggal || !waktuMulai) return null;

  const cleanTime = waktuMulai.replace('.', ':').trim();
  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const cleanDate = tanggal.trim();

  // Format ISO: YYYY-MM-DD
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const d = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Format lokal: "22 Nov 2026" atau "22 November 2026"
  const humanMatch = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (humanMatch) {
    const day = Number(humanMatch[1]);
    const monthKey = humanMatch[2].toLowerCase();
    const year = Number(humanMatch[3]);
    const month = MONTH_INDEX_MAP[monthKey];
    if (month !== undefined) {
      const d = new Date(year, month, day, hour, minute, 0, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  // Fallback parser standar JS
  const parsed = new Date(cleanDate);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(hour, minute, 0, 0);
  return parsed;
}

/**
 * Membatalkan seluruh pengingat jadwal mulai praktikum yang pernah dijadwalkan di perangkat.
 */
export async function cancelSessionStartRemindersAsync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const classReminders = scheduled.filter(
      (item) => item.content.data?.eventType === 'session_started'
    );
    await Promise.all(
      classReminders.map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})
      )
    );
  } catch {
    // Abaikan jika modul tidak tersedia
  }
}

/**
 * Menjadwalkan notifikasi otomatis tepat pada jam mulai praktikum (waktuMulai)
 * khusus untuk mahasiswa (praktikan) pada kelas yang sesuai.
 * Berjalan penuh meski aplikasi sedang di background atau tertutup.
 */
export async function syncSessionStartRemindersAsync(
  sessions: SessionDocument[],
  studentClass?: 'A' | 'B',
  studentLabId?: string
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    await configureNotificationChannel();
    await cancelSessionStartRemindersAsync();

    const nowMs = Date.now();
    const normalizedStudentClass = studentClass?.trim().toUpperCase();
    const cleanStudentLabId = studentLabId?.trim();

    const upcomingSessions = sessions.filter((session) => {
      if (session.status === 'ditutup') return false;
      if (cleanStudentLabId && session.labId) {
        if (session.labId !== cleanStudentLabId) return false;
      } else {
        const sessionClass = session.kelas.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase();
        if (normalizedStudentClass && sessionClass && sessionClass !== normalizedStudentClass) {
          return false;
        }
      }
      const startDate = parseSessionStartDate(session.tanggal, session.waktuMulai);
      return startDate !== null && startDate.getTime() > nowMs;
    });

    await Promise.all(
      upcomingSessions.map(async (session) => {
        const startDate = parseSessionStartDate(session.tanggal, session.waktuMulai);
        if (!startDate) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Kelas Praktikum Dimulai',
            body: `${session.praktikum} • ${session.kelas} (${session.waktuMulai} WIB) di ${session.ruang || 'laboratorium'} sudah dimulai. Segera masuk dan lakukan presensi.`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              url: '/praktikan/presensi',
              eventType: 'session_started',
              relatedSessionId: session.id,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: startDate,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        });
      })
    );
  } catch (error) {
    console.warn('Gagal menyinkronkan jadwal pengingat mulai kelas:', error);
  }
}
