/** Registrasi token, listener notifikasi, dan navigasi saat notifikasi diketuk. */

import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import {
  NotificationPermissionState,
  getNotificationPermissionState,
  registerForPushNotificationsAsync,
} from '@/services/notification-service';
import {
  requestRichNotificationPermission,
  subscribeRichNotifications,
} from '@/services/rich-notification-service';

const ALLOWED_ROUTES = [
  '/praktikan/jadwal',
  '/praktikan/presensi',
  '/praktikan/peta-lab',
  '/praktikan/pengajuan-izin',
  '/asisten/jadwal',
  '/asisten/moderasi-izin',
  '/asisten/peta-lab',
  '/notifikasi',
];

function resolveRoute(data: Record<string, unknown> | undefined): Href | null {
  const candidate = typeof data?.url === 'string' ? data.url : data?.screen;
  if (typeof candidate !== 'string' || !ALLOWED_ROUTES.includes(candidate)) return null;
  return candidate as Href;
}

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('unavailable');
  const lastHandledId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
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
  }, [user?.uid]);

  useEffect(() => {
    if (Platform.OS === 'web') {
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
    const unsubscribeRich = subscribeRichNotifications(user?.uid, (data) => {
      const route = resolveRoute(data);
      if (route) router.push(route);
    });

    return () => {
      received.remove();
      respond.remove();
      unsubscribeRich();
    };
  }, [user?.uid]);

  const refreshPermission = async () => {
    setPermission(await getNotificationPermissionState());
  };

  return { permission: user?.uid ? permission : 'unavailable', refreshPermission };
}
