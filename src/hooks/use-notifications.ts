/** Registrasi token, listener notifikasi, dan navigasi saat notifikasi diketuk. */

import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  NotificationPermissionState,
  getNotificationPermissionState,
  registerForPushNotificationsAsync,
} from '@/services/notification-service';

const ALLOWED_ROUTES = ['/praktikan/jadwal', '/praktikan/pengajuan-izin', '/notifikasi'];

function resolveRoute(data: Record<string, unknown> | undefined): Href | null {
  const url = data?.url;
  if (typeof url !== 'string' || !ALLOWED_ROUTES.includes(url)) return null;
  return url as Href;
}

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('unavailable');
  const lastHandledId = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      return;
    }

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
    const received = Notifications.addNotificationReceivedListener(() => {
      // Log in-app ditulis service; listener ini hanya penanda notifikasi masuk saat foreground.
    });

    const respond = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = resolveRoute(response.notification.request.content.data);
      if (route) router.push(route);
    });

    return () => {
      received.remove();
      respond.remove();
    };
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    const identifier = lastResponse.notification.request.identifier;
    if (lastHandledId.current === identifier) return;
    lastHandledId.current = identifier;
    const route = resolveRoute(lastResponse.notification.request.content.data);
    if (route) router.push(route);
  }, [lastResponse]);

  const refreshPermission = async () => {
    setPermission(await getNotificationPermissionState());
  };

  return { permission: user?.uid ? permission : 'unavailable', refreshPermission };
}
