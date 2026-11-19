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

const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';
export const NOTIFICATION_CHANNEL_ID = 'praktikum-updates';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export type NotificationPermissionState = 'granted' | 'denied' | 'unavailable';

/** Handler notifikasi foreground (SDK 57 memakai shouldShowBanner / shouldShowList). */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Channel Android harus dibuat sebelum token diminta (Android 13+). */
export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Pembaruan Praktikum',
      description: 'Pemberitahuan sesi praktikum, perubahan jadwal, dan keputusan izin.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EA580C',
    });
  } catch (error) {
    console.warn('Gagal menyiapkan channel notifikasi:', error);
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
    try {
      await updateUserPushFields(uid, { notificationsEnabled: false });
    } catch {
      // Abaikan: pengguna masih memakai Pusat Notifikasi in-app.
    }
    return 'unavailable';
  }
}

async function updateUserPushFields(uid: string, fields: Partial<UserDocument>): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/** Kirim ke Expo Push Service. Mengembalikan status pengiriman, tidak pernah melempar. */
async function sendPushMessagesAsync(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<NotificationDeliveryStatus> {
  if (tokens.length === 0 || Platform.OS === 'web') return 'in_app_only';

  try {
    const messages = [];
    for (let i = 0; i < tokens.length; i += 100) {
      messages.push(
        ...tokens.slice(i, i + 100).map((to) => ({
          to,
          title,
          body,
          sound: 'default' as const,
          channelId: NOTIFICATION_CHANNEL_ID,
          data,
        }))
      );
    }

    if (messages.length === 0) return 'in_app_only';

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) return 'failed';
    const result = (await response.json()) as { data?: { status?: string }[] };
    const tickets = result.data ?? [];
    return tickets.some((ticket) => ticket.status === 'ok') ? 'sent' : 'failed';
  } catch (error) {
    console.warn('Pengiriman push notification gagal:', error);
    return 'failed';
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
}

async function getPraktikanTargets(kelas?: string): Promise<PushTarget[]> {
  try {
    const snap = await getDocs(
      query(collection(db, USERS_COLLECTION), where('peran', '==', 'praktikan'))
    );
    const users = snap.docs.map(
      (item) => ({ uid: item.id, ...item.data() }) as PushTarget & UserDocument
    );
    const wantedClass = kelas?.replace('Kelas ', '').trim();
    return wantedClass ? users.filter((user) => user.kelas === wantedClass) : users;
  } catch (error) {
    console.warn('Gagal mengambil target notifikasi:', error);
    return [];
  }
}

async function getTargetByUid(uid: string): Promise<PushTarget | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return { uid };
    const data = snap.data() as UserDocument;
    return { uid, expoPushToken: data.expoPushToken };
  } catch {
    return { uid };
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
      .map((target) => target.expoPushToken)
      .filter((token): token is string => Boolean(token));
    const deliveryStatus = await sendPushMessagesAsync(tokens, input.title, input.body, input.data);

    await Promise.all(
      input.targets.map((target) =>
        writeNotificationLog({
          targetUserId: target.uid,
          targetRole: input.targetRole,
          eventType: input.eventType,
          title: input.title,
          body: input.body,
          deliveryStatus: tokens.includes(target.expoPushToken ?? '')
            ? deliveryStatus
            : 'in_app_only',
          relatedSessionId: input.relatedSessionId,
          relatedLeaveId: input.relatedLeaveId,
        }).catch((error) => console.warn('Gagal menulis log notifikasi:', error))
      )
    );
  } catch (error) {
    console.warn('Dispatcher notifikasi dilewati:', error);
  }
}

/** Peristiwa 1 — sesi praktikum dibuka. Target: praktikan pada kelas terkait. */
export async function notifySessionOpened(session: SessionDocument): Promise<void> {
  await dispatchAsync({
    targets: await getPraktikanTargets(session.kelas),
    targetRole: 'praktikan',
    eventType: 'session_opened',
    title: 'Sesi Praktikum Dibuka',
    body: `${session.praktikum} • ${session.kelas} di ${session.ruang || 'laboratorium'} sudah dibuka. Buka halaman presensi untuk mencatat kehadiran.`,
    data: {
      url: '/praktikan/jadwal',
      eventType: 'session_opened',
      relatedSessionId: session.id,
    },
    relatedSessionId: session.id,
  });
}

/** Peristiwa 2 — jadwal sesi diubah. Target: praktikan pada kelas terkait. */
export async function notifyScheduleChanged(
  session: SessionDocument,
  summary: string
): Promise<void> {
  await dispatchAsync({
    targets: await getPraktikanTargets(session.kelas),
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
