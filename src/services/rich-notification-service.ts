/**
 * PPK LabPortal — Rich Push Notification Service (FCM + react-native-notify-kit)
 * Implementasi lengkap Step 2–6:
 * - Step 2: Request Permission (iOS + Android 13+ POST_NOTIFICATIONS) & FCM Token sync
 * - Step 3: Android Notification Channels & iOS Action Categories
 * - Step 4: Display Rich Notification (BigPicture / BigText, Action Buttons, iOS Attachments)
 * - Step 5: Background & Killed-App Handlers (setBackgroundMessageHandler + onBackgroundEvent)
 * - Step 6: Deep Linking on Tap (onForegroundEvent + onNotificationOpenedApp + getInitialNotification)
 */

import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { PermissionsAndroid, Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  type Notification as NotifeeNotification,
} from 'react-native-notify-kit';

import { db, isFirebaseConfigured } from '@/lib/firebase';

export const DEFAULT_CHANNEL_ID = 'default';
export const PRAKTIKUM_CHANNEL_ID = 'praktikum-updates';
const IOS_ACTION_CATEGORY_ID = 'labportal-actions';

export type RichNotificationPermissionStatus = 'granted' | 'denied' | 'unsupported' | 'error';

export interface RichNotificationInitResult {
  enabled: boolean;
  status: RichNotificationPermissionStatus;
  fcmToken: string | null;
  errorMessage?: string;
}

let backgroundHandlersRegistered = false;

async function persistFcmTokenToFirestore(
  uid: string,
  fcmToken: string | null,
  enabled: boolean
): Promise<void> {
  if (!uid || !isFirebaseConfigured()) {
    return;
  }

  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'users', uid),
      {
        ...(fcmToken ? { fcmToken, fcmTokenUpdatedAt: now } : {}),
        notificationsEnabled: enabled,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[RichNotif] Gagal menyimpan FCM token ke Firestore:', error);
  }
}

async function requestAndroidRuntimeNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
  if (Number.isNaN(sdkInt) || sdkInt < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Step 3: Membuat Android Notification Channels (Android 8+) dan iOS Action Categories.
 */
export async function createNotificationChannels(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: DEFAULT_CHANNEL_ID,
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      await notifee.createChannel({
        id: PRAKTIKUM_CHANNEL_ID,
        name: 'Pembaruan Praktikum',
        description: 'Pemberitahuan sesi praktikum dibuka, perubahan jadwal, dan keputusan izin.',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }

    if (Platform.OS === 'ios') {
      await notifee.setNotificationCategories([
        {
          id: IOS_ACTION_CATEGORY_ID,
          actions: [
            { id: 'open', title: 'Buka', foreground: true },
            { id: 'dismiss', title: 'Tutup', destructive: true },
          ],
        },
      ]);
    }
  } catch (error) {
    console.warn('[RichNotif] Gagal membuat notification channel/category:', error);
  }
}

/**
 * Step 2: Meminta izin notifikasi (iOS + Android 13+), membuat channel,
 * mengambil FCM Token, lalu menyimpannya ke Firestore /users/{uid}.
 */
export async function requestRichNotificationPermission(
  uid?: string
): Promise<RichNotificationInitResult> {
  try {
    await createNotificationChannels();

    const androidGranted = await requestAndroidRuntimeNotificationPermission();
    if (!androidGranted) {
      if (uid) {
        await persistFcmTokenToFirestore(uid, null, false);
      }
      return {
        enabled: false,
        status: 'denied',
        fcmToken: null,
        errorMessage: 'Izin notifikasi Android 13+ ditolak oleh pengguna.',
      };
    }

    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      if (uid) {
        await persistFcmTokenToFirestore(uid, null, false);
      }
      return {
        enabled: false,
        status: 'denied',
        fcmToken: null,
        errorMessage: 'Izin notifikasi ditolak oleh pengguna.',
      };
    }

    const fcmToken = await getToken(messaging);
    console.log('FCM Token:', fcmToken);

    if (uid) {
      await persistFcmTokenToFirestore(uid, fcmToken, true);
    }

    return {
      enabled: true,
      status: 'granted',
      fcmToken,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Modul native FCM / react-native-notify-kit tidak tersedia.';
    console.warn('[RichNotif] Gagal inisialisasi izin/token FCM:', message);
    return {
      enabled: false,
      status: 'error',
      fcmToken: null,
      errorMessage: message,
    };
  }
}

function getStringField(
  data: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = data?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Step 4: Menampilkan Rich Notification (BigPicture / BigText + Action Buttons + iOS Attachment).
 */
export async function displayRichNotification(remoteMessage: RemoteMessage): Promise<void> {
  try {
    await createNotificationChannels();

    const data = remoteMessage.data as Record<string, string | object | number> | undefined;
    const title =
      remoteMessage.notification?.title ??
      getStringField(data, 'title') ??
      'Pemberitahuan LabPortal';
    const body =
      remoteMessage.notification?.body ??
      getStringField(data, 'body') ??
      'Ada pembaruan kegiatan praktikum.';
    const imageUrl = getStringField(data, 'imageUrl');
    const channelId = getStringField(data, 'channelId') ?? PRAKTIKUM_CHANNEL_ID;

    const notificationPayload: NotifeeNotification = {
      title,
      body,
      data,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        ...(imageUrl ? { largeIcon: imageUrl } : {}),
        style: imageUrl
          ? {
              type: AndroidStyle.BIGPICTURE,
              picture: imageUrl,
            }
          : {
              type: AndroidStyle.BIGTEXT,
              text: body,
            },
        pressAction: { id: 'default' },
        actions: [
          { title: 'Buka', pressAction: { id: 'open' } },
          { title: 'Tutup', pressAction: { id: 'dismiss' } },
        ],
      },
      ios: {
        attachments: imageUrl ? [{ url: imageUrl }] : [],
        categoryId: IOS_ACTION_CATEGORY_ID,
      },
    };

    await notifee.displayNotification(notificationPayload);
  } catch (error) {
    console.warn('[RichNotif] Gagal menampilkan rich notification:', error);
  }
}

/**
 * Step 5: Mendaftarkan Background & Killed-App Handlers di luar React component tree.
 * Wajib dipanggil sekali di top-level (mis. src/app/_layout.tsx).
 */
export function registerBackgroundRichNotificationHandlers(): void {
  if (backgroundHandlersRegistered) {
    return;
  }
  backgroundHandlersRegistered = true;

  try {
    const messaging = getMessaging();
    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      await displayRichNotification(remoteMessage);
    });
  } catch (error) {
    console.warn('[RichNotif] Gagal mendaftarkan FCM background handler:', error);
  }

  try {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const notificationId = detail.notification?.id;
      const actionId = detail.pressAction?.id;

      if (type === EventType.ACTION_PRESS && actionId === 'dismiss' && notificationId) {
        await notifee.cancelNotification(notificationId);
      }
    });
  } catch (error) {
    console.warn('[RichNotif] Gagal mendaftarkan notify-kit background event:', error);
  }
}

/**
 * Step 4 + Step 6: Mendaftarkan listener foreground FCM, refresh token, dan deep linking on tap
 * (baik saat foreground, dibuka dari background, maupun dibuka dari killed state).
 */
export function subscribeRichNotifications(
  uid: string | undefined,
  onNavigate: (data: Record<string, unknown> | undefined) => void
): () => void {
  const unsubscribers: (() => void)[] = [];

  try {
    const messaging = getMessaging();

    // Step 4: Tampilkan rich notification saat pesan FCM diterima di foreground
    unsubscribers.push(
      onMessage(messaging, async (remoteMessage) => {
        await displayRichNotification(remoteMessage);
      })
    );

    // Step 2: Sinkronkan ulang FCM token jika diperbarui oleh OS
    if (uid) {
      unsubscribers.push(
        onTokenRefresh(messaging, (newToken) => {
          console.log('FCM Token refreshed:', newToken);
          void persistFcmTokenToFirestore(uid, newToken, true);
        })
      );
    }

    // Step 6: Deep linking saat notifikasi FCM diketuk dari background state
    unsubscribers.push(
      onNotificationOpenedApp(messaging, (remoteMessage) => {
        onNavigate(remoteMessage.data as Record<string, unknown> | undefined);
      })
    );

    // Step 6: Deep linking saat aplikasi dibuka dari killed state via FCM
    getInitialNotification(messaging)
      .then((initialMessage) => {
        if (initialMessage) {
          onNavigate(initialMessage.data as Record<string, unknown> | undefined);
        }
      })
      .catch(() => {});
  } catch (error) {
    console.warn('[RichNotif] Gagal mendaftarkan listener FCM:', error);
  }

  try {
    // Step 6: Deep linking saat rich notification (react-native-notify-kit) diketuk di foreground
    unsubscribers.push(
      notifee.onForegroundEvent(({ type, detail }) => {
        const actionId = detail.pressAction?.id;
        const notificationId = detail.notification?.id;

        if (type === EventType.ACTION_PRESS && actionId === 'dismiss' && notificationId) {
          void notifee.cancelNotification(notificationId);
          return;
        }

        if (
          type === EventType.PRESS ||
          (type === EventType.ACTION_PRESS && actionId === 'open')
        ) {
          onNavigate(detail.notification?.data as Record<string, unknown> | undefined);
        }
      })
    );

    // Step 6: Deep linking saat aplikasi dibuka dari killed state via react-native-notify-kit
    notifee
      .getInitialNotification()
      .then((initialNotification) => {
        if (initialNotification?.notification?.data) {
          onNavigate(initialNotification.notification.data as Record<string, unknown>);
        }
      })
      .catch(() => {});
  } catch (error) {
    console.warn('[RichNotif] Gagal mendaftarkan listener foreground notify-kit:', error);
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Abaikan error cleanup
      }
    });
  };
}
