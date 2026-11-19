/** Deteksi terpadu kondisi perangkat & izin yang memengaruhi presensi dan notifikasi. */

import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { getNotificationPermissionState } from '@/services/notification-service';

export type DeviceStatusType =
  | 'offline'
  | 'location_denied'
  | 'gps_off'
  | 'notification_denied'
  | 'location_unavailable';

export interface DeviceResilienceState {
  isOnline: boolean;
  statuses: DeviceStatusType[];
  refresh: () => Promise<void>;
  refreshedAt: number;
}

export function useDeviceResilience(options?: {
  checkLocation?: boolean;
  locationUnavailable?: boolean;
}): DeviceResilienceState {
  const checkLocation = options?.checkLocation ?? true;
  const locationUnavailable = options?.locationUnavailable ?? false;
  const [isOnline, setIsOnline] = useState(true);
  const [statuses, setStatuses] = useState<DeviceStatusType[]>([]);
  const [refreshedAt, setRefreshedAt] = useState(0);

  const refresh = useCallback(async () => {
    const found: DeviceStatusType[] = [];

    try {
      const netState = await NetInfo.fetch();
      const online = netState.isConnected !== false;
      setIsOnline(online);
      if (!online) found.push('offline');
    } catch {
      setIsOnline(true);
    }

    if (Platform.OS !== 'web') {
      const notificationState = await getNotificationPermissionState();
      if (notificationState === 'denied') found.push('notification_denied');

      if (checkLocation) {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted) {
            found.push('location_denied');
          } else {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) found.push('gps_off');
          }
        } catch {
          found.push('location_unavailable');
        }
      }
    }

    if (locationUnavailable) found.push('location_unavailable');
    setStatuses(found);
    setRefreshedAt(Date.now());
  }, [checkLocation, locationUnavailable]);

  useEffect(() => {
    // Pemeriksaan awal async: state diperbarui setelah await, bukan sinkron di body effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false);
      setStatuses((prev) => {
        const withoutOffline = prev.filter((item) => item !== 'offline');
        return state.isConnected === false ? [...withoutOffline, 'offline'] : withoutOffline;
      });
    });
    return () => unsubscribe();
  }, [refresh]);

  return { isOnline, statuses, refresh, refreshedAt };
}
