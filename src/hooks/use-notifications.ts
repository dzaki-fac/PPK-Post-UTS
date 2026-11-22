/** Registrasi token, listener notifikasi, dan navigasi saat notifikasi diketuk. */

import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import {
  NotificationPermissionState,
  cancelSessionStartRemindersAsync,
  getNotificationPermissionState,
  presentInstantPhoneNotificationAsync,
  registerForPushNotificationsAsync,
  subscribeUserNotifications,
  syncSessionStartRemindersAsync,
} from '@/services/notification-service';
import {
  requestRichNotificationPermission,
  subscribeRichNotifications,
} from '@/services/rich-notification-service';
import { subscribeSessions } from '@/services/session-service';

const ALLOWED_ROUTES = [
  '/praktikan/jadwal',
  '/praktikan/presensi',
  '/praktikan/peta-lab',
  '/praktikan/pengajuan-izin',
  '/notifikasi',
];

function resolveRoute(data: Record<string, unknown> | undefined): Href | null {
  const candidate = typeof data?.url === 'string' ? data.url : data?.screen;
  if (typeof candidate !== 'string' || !ALLOWED_ROUTES.includes(candidate)) return null;
  return candidate as Href;
}

export function useNotifications() {
  const { user, userDoc, role } = useAuth();
  const isPraktikan = role === 'praktikan';
  const [permission, setPermission] = useState<NotificationPermissionState>('unavailable');
  const lastHandledId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    // Push notification hanya ditujukan untuk role mahasiswa (praktikan)
    if (!user?.uid || !isPraktikan) {
      void cancelSessionStartRemindersAsync();
      return;
    }

    // Step 2 & 3: Inisialisasi izin & FCM Token (react-native-firebase + react-native-notify-kit)
    void requestRichNotificationPermission(user.uid);

    // Sinkronisasi Expo Push Token + status izin untuk UI Pusat Notifikasi
    registerForPushNotificationsAsync(user.uid)
      .then((state) => {
        if (active) setPermission(state);
      })
      .catch(() => {
        if (active) setPermission('unavailable');
      });

    return () => {
      active = false;
    };
  }, [user?.uid, isPraktikan]);

  // Sinkronisasi otomatis pengingat lokal tepat saat jam praktikum dimulai (khusus praktikan)
  useEffect(() => {
    if (Platform.OS === 'web' || !user?.uid || !isPraktikan) {
      return;
    }

    const unsubscribeSessions = subscribeSessions((sessions) => {
      void syncSessionStartRemindersAsync(sessions, userDoc?.kelas);
    });

    return () => {
      unsubscribeSessions();
    };
  }, [user?.uid, isPraktikan, userDoc?.kelas]);

  // Munculkan pop-up heads-up banner di HP seperti WhatsApp secara instan saat ada notifikasi baru
  useEffect(() => {
    if (Platform.OS === 'web' || !user?.uid || !isPraktikan) {
      return;
    }

    let isInitialSnapshot = true;
    const seenIds = new Set<string>();

    const unsubscribeUserNotifs = subscribeUserNotifications(user.uid, (items) => {
      if (isInitialSnapshot) {
        items.forEach((item) => seenIds.add(item.id));
        isInitialSnapshot = false;
        return;
      }

      for (const item of items) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        if (item.isRead) continue;

        const targetUrl =
          item.eventType === 'session_opened' || item.eventType === 'session_started'
            ? '/praktikan/presensi'
            : item.eventType === 'schedule_updated'
            ? '/praktikan/jadwal'
            : '/praktikan/pengajuan-izin';

        void presentInstantPhoneNotificationAsync({
          title: item.title,
          body: item.body,
          data: {
            url: targetUrl,
            eventType: item.eventType,
            ...(item.relatedSessionId ? { relatedSessionId: item.relatedSessionId } : {}),
            ...(item.relatedLeaveId ? { relatedLeaveId: item.relatedLeaveId } : {}),
          },
        });
      }
    });

    return () => {
      unsubscribeUserNotifs();
    };
  }, [user?.uid, isPraktikan]);

  useEffect(() => {
    if (Platform.OS === 'web' || !user?.uid || !isPraktikan) {
      return;
    }

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const identifier = response.notification.request.identifier;
      if (lastHandledId.current === identifier) return;
      lastHandledId.current = identifier;
      const route = resolveRoute(response.notification.request.content.data);
      if (route) router.push(route);
    };

    try {
      handleResponse(Notifications.getLastNotificationResponse());
    } catch {
      // Tidak tersedia pada platform tertentu
    }

    const received = Notifications.addNotificationReceivedListener(() => {
      // Log in-app ditulis service; listener ini hanya penanda notifikasi masuk saat foreground.
    });

    const respond = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    // Step 4 & Step 6: Listener foreground FCM (Rich Notification) & Deep Linking on Tap
    const unsubscribeRich = subscribeRichNotifications(user.uid, (data) => {
      const route = resolveRoute(data);
      if (route) router.push(route);
    });

    return () => {
      received.remove();
      respond.remove();
      unsubscribeRich();
    };
  }, [user?.uid, isPraktikan]);

  const refreshPermission = async () => {
    if (!isPraktikan) {
      setPermission('unavailable');
      return;
    }
    setPermission(await getNotificationPermissionState());
  };

  return { permission: user?.uid && isPraktikan ? permission : 'unavailable', refreshPermission };
}
