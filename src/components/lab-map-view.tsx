import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { UNDIP_INFORMATIKA_COORDINATES } from '@/services/lab-activity-service';
import { getRouteCoordinates, type RouteCoordinate } from '@/services/route-service';
import { LabWithActivity } from '@/types/praktikum';
import {
  buildHybridMapHtml,
  type HybridMapStatusMessage,
  type LeafletLabPayload,
} from '@/utils/leaflet-map-html';

export interface UserLocationState {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

interface LabMapViewProps {
  activities: LabWithActivity[];
  selectedLabId: string | null;
  onSelectLab: (activity: LabWithActivity) => void;
  accentColor?: string;
  onUserLocationChange?: (location: UserLocationState | null) => void;
}

interface MapNoticeState {
  tone: 'info' | 'warning' | 'error';
  message: string;
  canRetry?: boolean;
}

/** Zona poligon kawasan Gedung Teknik Informatika (Gedung E) FSM UNDIP */
const INFORMATIKA_ZONE_POLYGON = [
  { latitude: -7.0478, longitude: 110.4406 },
  { latitude: -7.0478, longitude: 110.44125 },
  { latitude: -7.04835, longitude: 110.44125 },
  { latitude: -7.04835, longitude: 110.4406 },
];

export function LabMapView({
  activities,
  selectedLabId,
  onSelectLab,
  accentColor = '#0D9488',
  onUserLocationChange,
}: LabMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapReloadKey, setMapReloadKey] = useState(0);
  const [mapNotice, setMapNotice] = useState<MapNoticeState | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<
    'loading' | 'granted' | 'denied' | 'disabled'
  >('loading');
  const [isLocating, setIsLocating] = useState(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [simPoint, setSimPoint] = useState<RouteCoordinate | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe live position watching selama halaman peta aktif
  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startLocationWatch = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isMounted) setPermissionStatus('disabled');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          if (isMounted) setPermissionStatus('denied');
          return;
        }

        if (isMounted) setPermissionStatus('granted');

        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 30000,
          });
          if (lastKnown && isMounted) {
            const quickState: UserLocationState = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
              accuracy: lastKnown.coords.accuracy,
            };
            setUserLocation(quickState);
            onUserLocationChange?.(quickState);
          }
        } catch {
          // Lanjut ke GPS presisi tinggi
        }

        try {
          const firstPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (isMounted) {
            const locState: UserLocationState = {
              latitude: firstPos.coords.latitude,
              longitude: firstPos.coords.longitude,
              accuracy: firstPos.coords.accuracy,
            };
            setUserLocation(locState);
            onUserLocationChange?.(locState);
          }
        } catch {
          // Fallback ke watchPositionAsync
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 2,
            timeInterval: 2000,
          },
          (loc) => {
            if (!isMounted) return;
            const updated: UserLocationState = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            };
            setUserLocation(updated);
            onUserLocationChange?.(updated);
          }
        );
      } catch {
        if (isMounted) setPermissionStatus('denied');
      }
    };

    void startLocationWatch();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [onUserLocationChange]);

  const selectedActivity = useMemo(
    () => activities.find((a) => a.lab.id === selectedLabId) ?? null,
    [activities, selectedLabId]
  );

  // Ambil koordinat rute Polyline dari posisi pengguna menuju lab yang dipilih
  useEffect(() => {
    let active = true;

    if (!userLocation || !selectedActivity) {
      return;
    }

    getRouteCoordinates(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: selectedActivity.lab.latitude, longitude: selectedActivity.lab.longitude }
    )
      .then((result) => {
        if (!active) return;
        setRouteCoords(result.coordinates);
      })
      .catch(() => {
        if (!active) return;
        setRouteCoords([]);
      });

    return () => {
      active = false;
    };
  }, [userLocation, selectedActivity]);

  const activeRouteCoords = useMemo(
    () => (userLocation && selectedActivity ? routeCoords : []),
    [userLocation, selectedActivity, routeCoords]
  );

  // Bersihkan timer simulasi rute saat unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    };
  }, []);

  const stopRouteSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsSimulatingRoute(false);
    setSimPoint(null);
  };

  const handleSimulateRoute = () => {
    if (activeRouteCoords.length < 2) return;
    if (isSimulatingRoute) {
      stopRouteSimulation();
      return;
    }

    setIsSimulatingRoute(true);
    let idx = 0;
    setSimPoint(activeRouteCoords[0]);

    simTimerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= activeRouteCoords.length) {
        stopRouteSimulation();
        return;
      }
      setSimPoint(activeRouteCoords[idx]);
    }, 500);
  };

  const labsPayload = useMemo<LeafletLabPayload[]>(
    () =>
      activities.map((item) => {
        const status = item.ongoingSession
          ? ('ongoing' as const)
          : item.nextSession
          ? ('upcoming' as const)
          : ('idle' as const);
        const statusLabel = item.ongoingSession
          ? `Sedang Berlangsung: ${item.ongoingSession.praktikum}`
          : item.nextSession
          ? `Berikutnya: ${item.nextSession.praktikum}`
          : 'Tidak ada sesi aktif';
        return {
          id: item.lab.id,
          kode: item.lab.kode || item.lab.nama,
          nama: item.lab.nama,
          gedung: item.lab.gedung,
          lat: item.lab.latitude,
          lng: item.lab.longitude,
          radius: item.lab.radiusMeter || 50,
          status,
          statusLabel,
        };
      }),
    [activities]
  );

  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_USE_GOOGLE_MAPS === 'false'
      ? ''
      : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  // HTML dasar tetap stabil (daftar lab & status live dikirim lewat __syncLabMapState agar tidak reload WebView)
  const mapHtml = useMemo(
    () =>
      buildHybridMapHtml({
        labs: [],
        defaultCenter: {
          lat: UNDIP_INFORMATIKA_COORDINATES.latitude,
          lng: UNDIP_INFORMATIKA_COORDINATES.longitude,
        },
        accentColor,
        zonePolygon: INFORMATIKA_ZONE_POLYGON,
        googleMapsApiKey,
        showBuiltInControls: false,
      }),
    [accentColor, googleMapsApiKey]
  );

  const syncWebViewState = useCallback(() => {
    if (!mapReady || !webViewRef.current) return;
    const target = selectedActivity
      ? { lat: selectedActivity.lab.latitude, lng: selectedActivity.lab.longitude }
      : null;
    const payload = {
      labs: labsPayload,
      selectedLabId: selectedActivity?.lab.id ?? null,
      target,
      user: userLocation
        ? {
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            acc: userLocation.accuracy ?? 25,
          }
        : null,
      routeCoords: activeRouteCoords,
      simPoint,
    };
    const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
    webViewRef.current.injectJavaScript(
      `window.__syncLabMapState && window.__syncLabMapState(${serialized}); true;`
    );
  }, [mapReady, labsPayload, selectedActivity, userLocation, activeRouteCoords, simPoint]);

  useEffect(() => {
    syncWebViewState();
  }, [syncWebViewState]);

  const handleReloadMap = () => {
    setMapReady(false);
    setMapNotice(null);
    setMapReloadKey((prev) => prev + 1);
  };

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const parsed = JSON.parse(event.nativeEvent.data) as
          | { type?: 'SELECT_LAB'; labId?: string }
          | HybridMapStatusMessage;

        if (parsed.type === 'SELECT_LAB' && parsed.labId) {
          const found = activities.find((a) => a.lab.id === parsed.labId);
          if (found) onSelectLab(found);
          return;
        }

        if (parsed.type === 'MAP_STATUS') {
          if (parsed.status === 'error' || parsed.status === 'tile_error') {
            setMapNotice({
              tone: 'error',
              message: parsed.message,
              canRetry: true,
            });
          } else if (parsed.status === 'fallback') {
            setMapNotice({
              tone: 'warning',
              message: parsed.message,
            });
          } else if (parsed.status === 'ready' && parsed.tileProvider && parsed.tileProvider !== 'osm') {
            setMapNotice({
              tone: 'info',
              message: parsed.message,
            });
          } else if (parsed.status === 'ready' && parsed.engine === 'google') {
            setMapNotice(null);
          }
        }
      } catch {
        // Abaikan pesan non-JSON
      }
    },
    [activities, onSelectLab]
  );

  const centerToUser = () => {
    if (!userLocation || !webViewRef.current) return;
    setIsLocating(true);
    webViewRef.current.injectJavaScript(
      `window.__focusUser && window.__focusUser(); true;`
    );
    setTimeout(() => setIsLocating(false), 450);
  };

  const centerToCampus = () => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.__focusLabs && window.__focusLabs(); true;`
    );
  };

  return (
    <View style={styles.container}>
      {/* Banner Status GPS / Fallback / Error Peta */}
      <View style={styles.bannerStack}>
        {permissionStatus === 'denied' && (
          <View style={styles.resilienceBanner}>
            <View style={styles.resilienceIconDot} />
            <Text style={styles.resilienceText}>
              Izin lokasi belum diberikan. Peta tetap menampilkan marker laboratorium.
            </Text>
            <TouchableOpacity
              style={styles.resilienceAction}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Linking.openSettings().catch(() => {});
                }
              }}>
              <Text style={styles.resilienceActionText}>Buka Pengaturan</Text>
            </TouchableOpacity>
          </View>
        )}

        {permissionStatus === 'disabled' && (
          <View style={[styles.resilienceBanner, styles.resilienceWarning]}>
            <View style={[styles.resilienceIconDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.resilienceText}>
              Layanan GPS perangkat nonaktif. Aktifkan lokasi untuk tracking posisi.
            </Text>
          </View>
        )}

        {mapNotice && (
          <View
            style={[
              styles.resilienceBanner,
              mapNotice.tone === 'warning'
                ? styles.resilienceWarning
                : mapNotice.tone === 'info'
                ? styles.resilienceInfo
                : undefined,
            ]}>
            <View
              style={[
                styles.resilienceIconDot,
                mapNotice.tone === 'warning'
                  ? { backgroundColor: '#D97706' }
                  : mapNotice.tone === 'info'
                  ? { backgroundColor: '#2563EB' }
                  : undefined,
              ]}
            />
            <Text style={styles.resilienceText}>{mapNotice.message}</Text>
            {mapNotice.canRetry ? (
              <TouchableOpacity style={styles.resilienceAction} onPress={handleReloadMap}>
                <Text style={styles.resilienceActionText}>Muat Ulang Peta</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resilienceDismiss}
                onPress={() => setMapNotice(null)}
                accessibilityLabel="Tutup info peta">
                <Text style={styles.resilienceDismissText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <WebView
        key={mapReloadKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml, baseUrl: 'https://ppk-labportal.app' }}
        applicationNameForUserAgent="PPKLabPortal/1.0"
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => {
          setMapReady(true);
          syncWebViewState();
        }}
        onError={() => {
          setMapNotice({
            tone: 'error',
            message: 'Tampilan peta WebView mengalami kendala jaringan.',
            canRetry: true,
          });
        }}
        onHttpError={() => {
          setMapNotice({
            tone: 'warning',
            message: 'Sebagian resource peta gagal diambil dari server.',
            canRetry: true,
          });
        }}
        onMessage={handleWebViewMessage}
      />

      {/* Floating Control Buttons */}
      <View style={styles.floatingControls}>
        {activeRouteCoords.length >= 2 && (
          <TouchableOpacity
            style={[styles.floatingBtn, isSimulatingRoute && styles.floatingBtnActive]}
            onPress={handleSimulateRoute}
            accessibilityLabel="Simulasi Pergerakan Rute">
            <Text style={[styles.routeBtnText, { color: accentColor }]}>
              {isSimulatingRoute ? 'STOP' : 'RUTE'}
            </Text>
          </TouchableOpacity>
        )}

        {userLocation && (
          <TouchableOpacity
            style={[styles.floatingBtn, isLocating && styles.floatingBtnActive]}
            onPress={centerToUser}
            accessibilityLabel="Pusatkan ke Lokasi Saya">
            {isLocating ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <View style={styles.locateIconOuter}>
                <View style={[styles.locateIconInner, { backgroundColor: accentColor }]} />
              </View>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={centerToCampus}
          accessibilityLabel="Pusatkan ke Kampus Informatika">
          <View style={styles.campusIcon}>
            <View style={[styles.campusIconBar, { height: 10 }]} />
            <View style={[styles.campusIconBar, { height: 14 }]} />
            <View style={[styles.campusIconBar, { height: 8 }]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  map: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  bannerStack: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    gap: 8,
  },
  resilienceBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  resilienceWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  resilienceInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  resilienceIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  resilienceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  resilienceAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resilienceActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  resilienceDismiss: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  resilienceDismissText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    bottom: 24,
    zIndex: 15,
    gap: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  floatingBtnActive: {
    backgroundColor: '#F8FAFC',
  },
  routeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  locateIconOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateIconInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  campusIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
  },
  campusIconBar: {
    width: 3.5,
    borderRadius: 1.5,
    backgroundColor: '#334155',
  },
});
