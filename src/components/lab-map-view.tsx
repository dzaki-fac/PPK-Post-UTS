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

/** Zona poligon kawasan Gedung E & F Departemen Informatika FSM UNDIP */
const INFORMATIKA_ZONE_POLYGON: [number, number][] = [
  [-7.0489, 110.44],
  [-7.0489, 110.4414],
  [-7.0503, 110.4414],
  [-7.0503, 110.44],
];

function buildLeafletHtml(initialLat: number, initialLng: number, accentColor: string): string {
  const polygonJson = JSON.stringify(INFORMATIKA_ZONE_POLYGON);
  const fillRgba =
    accentColor === '#EA580C' ? 'rgba(234, 88, 12, 0.10)' : 'rgba(13, 148, 136, 0.10)';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255,255,255,0.85) !important;
    }
    .lab-pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    }
    .lab-pin-badge {
      position: relative;
      padding: 4px 8px;
      border-radius: 8px;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.4px;
      white-space: nowrap;
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.28);
      border: 1.5px solid rgba(255,255,255,0.9);
    }
    .lab-pin-selected {
      transform: scale(1.12);
      border-width: 2.5px;
    }
    .lab-pin-tip {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #475569;
      margin-top: -1px;
    }
    .lab-ongoing-dot {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #22C55E;
      border: 2px solid #FFFFFF;
    }
    .user-marker-outer {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.24);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
    }
    .user-marker-inner {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #2563EB;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.5);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', {
      center: [${initialLat}, ${initialLng}],
      zoom: 18,
      zoomControl: false,
      maxZoom: 20,
      minZoom: 14,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Zona Kawasan Gedung E & F Departemen Informatika FSM UNDIP
    L.polygon(${polygonJson}, {
      color: '${accentColor}',
      weight: 1.5,
      fillColor: '${fillRgba}',
      fillOpacity: 1
    }).addTo(map);

    const labMarkersLayer = L.layerGroup().addTo(map);
    let labRadiusCircle = null;
    let routePolyline = null;
    let userMarker = null;
    let userAccuracyCircle = null;
    let currentUserLatLng = null;
    let routeAnimTimer = null;

    function renderLabs(labs, selectedId, accent) {
      labMarkersLayer.clearLayers();
      if (labRadiusCircle) {
        map.removeLayer(labRadiusCircle);
        labRadiusCircle = null;
      }

      labs.forEach((item) => {
        const isSelected = item.id === selectedId;
        const color = item.hasOngoing ? '#16A34A' : isSelected ? accent : '#475569';
        const iconHtml =
          '<div class="lab-pin-wrap">' +
            '<div class="lab-pin-badge ' + (isSelected ? 'lab-pin-selected' : '') + '" style="background:' + color + ';">' +
              item.kode +
              (item.hasOngoing ? '<span class="lab-ongoing-dot"></span>' : '') +
            '</div>' +
            '<div class="lab-pin-tip" style="border-top-color:' + color + ';"></div>' +
          '</div>';

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [0, 0],
        });

        const marker = L.marker([item.latitude, item.longitude], { icon }).addTo(labMarkersLayer);
        marker.on('click', () => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select_lab', labId: item.id }));
          }
        });

        if (isSelected) {
          labRadiusCircle = L.circle([item.latitude, item.longitude], {
            radius: item.radiusMeter,
            color: accent,
            weight: 2,
            fillColor: accent,
            fillOpacity: 0.16,
          }).addTo(map);
        }
      });
    }

    function updateUserLocation(lat, lng, accuracy) {
      const target = [lat, lng];

      if (!userMarker) {
        const userIcon = L.divIcon({
          html: '<div class="user-marker-outer"><div class="user-marker-inner"></div></div>',
          className: '',
          iconSize: [0, 0],
        });
        userMarker = L.marker(target, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        currentUserLatLng = target;
      } else {
        // Animasi perpindahan halus (smooth glide)
        const start = currentUserLatLng || target;
        const steps = 14;
        let step = 0;
        const dLat = (lat - start[0]) / steps;
        const dLng = (lng - start[1]) / steps;
        const anim = setInterval(() => {
          step += 1;
          const nextLat = step >= steps ? lat : start[0] + dLat * step;
          const nextLng = step >= steps ? lng : start[1] + dLng * step;
          userMarker.setLatLng([nextLat, nextLng]);
          currentUserLatLng = [nextLat, nextLng];
          if (step >= steps) clearInterval(anim);
        }, 40);
      }

      if (userAccuracyCircle) {
        map.removeLayer(userAccuracyCircle);
        userAccuracyCircle = null;
      }
      if (accuracy && accuracy <= 50) {
        userAccuracyCircle = L.circle(target, {
          radius: Math.min(accuracy, 40),
          color: 'rgba(37, 99, 235, 0.5)',
          weight: 1,
          fillColor: '#2563EB',
          fillOpacity: 0.12,
        }).addTo(map);
      }
    }

    function renderRoute(coords, accent, isDashed) {
      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }
      if (!coords || coords.length < 2) return;
      const latlngs = coords.map((c) => [c.latitude, c.longitude]);
      routePolyline = L.polyline(latlngs, {
        color: accent,
        weight: 4,
        dashArray: isDashed ? '8, 6' : undefined,
      }).addTo(map);
    }

    function flyToCoord(lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 18, { duration: 0.65 });
    }

    function simulateRoute(coords) {
      if (!coords || coords.length < 2 || !userMarker) return;
      if (routeAnimTimer) clearInterval(routeAnimTimer);
      let idx = 0;
      routeAnimTimer = setInterval(() => {
        if (idx >= coords.length) {
          clearInterval(routeAnimTimer);
          routeAnimTimer = null;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route_done' }));
          }
          return;
        }
        const pt = [coords[idx].latitude, coords[idx].longitude];
        userMarker.setLatLng(pt);
        currentUserLatLng = pt;
        idx += 1;
      }, 180);
    }

    window.labMapApi = {
      renderLabs,
      updateUserLocation,
      renderRoute,
      flyToCoord,
      simulateRoute,
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
    }
  </script>
</body>
</html>`;
}

export function LabMapView({
  activities,
  selectedLabId,
  onSelectLab,
  accentColor = '#0D9488',
  onUserLocationChange,
}: LabMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [isFallbackDirectLine, setIsFallbackDirectLine] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'loading' | 'granted' | 'denied' | 'disabled'
  >('loading');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState<boolean>(false);

  // HTML statis dibuat sekali agar WebView tidak reload saat GPS / pilihan lab berubah
  const mapHtml = useMemo(
    () =>
      buildLeafletHtml(
        UNDIP_INFORMATIKA_COORDINATES.latitude,
        UNDIP_INFORMATIKA_COORDINATES.longitude,
        accentColor
      ),
    [accentColor]
  );

  // Subscribe live position watching
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
          const firstPos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
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
          // Fallback ke watchPosition
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000,
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

  const selectedActivity = activities.find((a) => a.lab.id === selectedLabId);

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
        setIsFallbackDirectLine(result.isFallbackDirectLine);
      })
      .catch(() => {
        if (!active) return;
        setRouteCoords([]);
        setIsFallbackDirectLine(false);
      });

    return () => {
      active = false;
    };
  }, [userLocation, selectedActivity]);

  const activeRouteCoords = useMemo(
    () => (userLocation && selectedActivity ? routeCoords : []),
    [userLocation, selectedActivity, routeCoords]
  );

  // Sinkronkan marker lab & lingkaran radius ke Leaflet
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = activities.map((item) => ({
      id: item.lab.id,
      kode: item.lab.kode,
      nama: item.lab.nama,
      latitude: item.lab.latitude,
      longitude: item.lab.longitude,
      radiusMeter: item.lab.radiusMeter,
      hasOngoing: Boolean(item.ongoingSession),
    }));
    webViewRef.current.injectJavaScript(
      `window.labMapApi && window.labMapApi.renderLabs(${JSON.stringify(payload)}, ${JSON.stringify(selectedLabId)}, ${JSON.stringify(accentColor)}); true;`
    );
  }, [mapReady, activities, selectedLabId, accentColor]);

  // Pusatkan kamera saat lab dipilih
  useEffect(() => {
    if (!mapReady || !selectedActivity || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.labMapApi && window.labMapApi.flyToCoord(${selectedActivity.lab.latitude}, ${selectedActivity.lab.longitude}, 18); true;`
    );
  }, [mapReady, selectedActivity]);

  // Sinkronkan posisi GPS pengguna live ke Leaflet
  useEffect(() => {
    if (!mapReady || !userLocation || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.labMapApi && window.labMapApi.updateUserLocation(${userLocation.latitude}, ${userLocation.longitude}, ${userLocation.accuracy ?? 0}); true;`
    );
  }, [mapReady, userLocation]);

  // Sinkronkan Polyline rute ke Leaflet
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.labMapApi && window.labMapApi.renderRoute(${JSON.stringify(activeRouteCoords)}, ${JSON.stringify(accentColor)}, ${JSON.stringify(isFallbackDirectLine)}); true;`
    );
  }, [mapReady, activeRouteCoords, accentColor, isFallbackDirectLine]);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data) as { type?: string; labId?: string };
        if (msg.type === 'map_ready') {
          setMapReady(true);
        } else if (msg.type === 'select_lab' && msg.labId) {
          const found = activities.find((a) => a.lab.id === msg.labId);
          if (found) onSelectLab(found);
        } else if (msg.type === 'route_done') {
          setIsSimulatingRoute(false);
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
      `window.labMapApi && window.labMapApi.flyToCoord(${userLocation.latitude}, ${userLocation.longitude}, 18); true;`
    );
    setTimeout(() => setIsLocating(false), 700);
  };

  const centerToCampus = () => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.labMapApi && window.labMapApi.flyToCoord(${UNDIP_INFORMATIKA_COORDINATES.latitude}, ${UNDIP_INFORMATIKA_COORDINATES.longitude}, 18); true;`
    );
  };

  return (
    <View style={styles.container}>
      {/* Banner Resilience GPS / Permission */}
      {permissionStatus === 'denied' && (
        <View style={styles.resilienceBanner}>
          <View style={styles.resilienceIconDot} />
          <Text style={styles.resilienceText}>
            Izin lokasi belum diberikan. Peta tetap menampilkan marker lab.
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

      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleWebViewMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.mapLoadingText}>Memuat peta laboratorium...</Text>
          </View>
        )}
      />

      {/* Floating Control Buttons */}
      <View style={styles.floatingControls}>
        {activeRouteCoords.length >= 2 && (
          <TouchableOpacity
            style={[styles.floatingBtn, isSimulatingRoute && styles.floatingBtnActive]}
            onPress={() => {
              if (isSimulatingRoute || !webViewRef.current) return;
              setIsSimulatingRoute(true);
              webViewRef.current.injectJavaScript(
                `window.labMapApi && window.labMapApi.simulateRoute(${JSON.stringify(activeRouteCoords)}); true;`
              );
            }}
            accessibilityLabel="Simulasi Pergerakan Rute">
            <Text style={[styles.routeBtnText, { color: accentColor }]}>
              {isSimulatingRoute ? '...' : 'RUTE'}
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
  mapLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  resilienceBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
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
