import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type LatLng,
} from 'react-native-maps';

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
const INFORMATIKA_ZONE_POLYGON: LatLng[] = [
  { latitude: -7.0489, longitude: 110.44 },
  { latitude: -7.0489, longitude: 110.4414 },
  { latitude: -7.0503, longitude: 110.4414 },
  { latitude: -7.0503, longitude: 110.44 },
];

export function LabMapView({
  activities,
  selectedLabId,
  onSelectLab,
  accentColor = '#0D9488',
  onUserLocationChange,
}: LabMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [isFallbackDirectLine, setIsFallbackDirectLine] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'loading' | 'granted' | 'denied' | 'disabled'
  >('loading');
  const [isLocating, setIsLocating] = useState(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [simPoint, setSimPoint] = useState<RouteCoordinate | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  const zoneFillColor =
    accentColor === '#EA580C'
      ? 'rgba(234, 88, 12, 0.08)'
      : accentColor === '#4F46E5'
      ? 'rgba(79, 70, 229, 0.08)'
      : 'rgba(13, 148, 136, 0.08)';

  const radiusFillColor =
    accentColor === '#EA580C'
      ? 'rgba(234, 88, 12, 0.14)'
      : accentColor === '#4F46E5'
      ? 'rgba(79, 70, 229, 0.14)'
      : 'rgba(13, 148, 136, 0.14)';

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

  // Pusatkan kamera ke laboratorium saat dipilih
  useEffect(() => {
    if (!mapReady || !selectedActivity || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: selectedActivity.lab.latitude,
        longitude: selectedActivity.lab.longitude,
        latitudeDelta: 0.0022,
        longitudeDelta: 0.0022,
      },
      450
    );
  }, [mapReady, selectedActivity]);

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

  const centerToUser = () => {
    if (!userLocation || !mapRef.current) return;
    setIsLocating(true);
    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0022,
        longitudeDelta: 0.0022,
      },
      450
    );
    setTimeout(() => setIsLocating(false), 500);
  };

  const centerToCampus = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(UNDIP_INFORMATIKA_COORDINATES, 450);
  };

  return (
    <View style={styles.container}>
      {/* Banner Resilience GPS / Permission */}
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

      <MapView
        ref={mapRef}
        provider={mapProvider}
        style={styles.map}
        initialRegion={UNDIP_INFORMATIKA_COORDINATES}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={permissionStatus === 'granted'}
        showsCompass
        showsScale
        toolbarEnabled={false}
        showsMyLocationButton={false}>
        {/* Zona Poligon Kawasan Departemen Informatika FSM UNDIP */}
        <Polygon
          coordinates={INFORMATIKA_ZONE_POLYGON}
          strokeColor={accentColor}
          strokeWidth={1.5}
          fillColor={zoneFillColor}
        />

        {/* Lingkaran Radius Laboratorium Terpilih */}
        {selectedActivity ? (
          <Circle
            key={`lab-circle-${selectedActivity.lab.id}-${selectedActivity.lab.radiusMeter || 50}`}
            center={{
              latitude: selectedActivity.lab.latitude,
              longitude: selectedActivity.lab.longitude,
            }}
            radius={selectedActivity.lab.radiusMeter || 50}
            strokeColor={accentColor}
            strokeWidth={2}
            fillColor={radiusFillColor}
            zIndex={2}
          />
        ) : null}

        {/* Rute Jalan Kaki Menuju Lab Terpilih */}
        {activeRouteCoords.length >= 2 ? (
          <Polyline
            coordinates={activeRouteCoords}
            strokeColor={accentColor}
            strokeWidth={4}
            geodesic
            lineDashPattern={isFallbackDirectLine ? [8, 6] : undefined}
          />
        ) : null}

        {/* Marker Laboratorium Aktif */}
        {activities.map((item) => {
          const isSelected = item.lab.id === selectedLabId;
          const hasOngoing = Boolean(item.ongoingSession);
          const badgeBg = isSelected
            ? accentColor
            : hasOngoing
            ? '#16A34A'
            : '#475569';

          return (
            <Marker
              key={`${item.lab.id}-${isSelected ? 'sel' : 'idle'}-${hasOngoing ? 'on' : 'off'}`}
              coordinate={{
                latitude: item.lab.latitude,
                longitude: item.lab.longitude,
              }}
              onPress={() => onSelectLab(item)}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}>
              <View style={styles.labPinWrap}>
                <View
                  style={[
                    styles.labPinBadge,
                    { backgroundColor: badgeBg },
                    isSelected && styles.labPinSelected,
                  ]}>
                  {hasOngoing ? <View style={styles.labOngoingDot} /> : null}
                  <Text style={styles.labPinText}>{item.lab.kode}</Text>
                </View>
                <View style={[styles.labPinTip, { borderTopColor: badgeBg }]} />
              </View>
            </Marker>
          );
        })}

        {/* Marker Simulasi Pergerakan Rute */}
        {simPoint ? (
          <Marker coordinate={simPoint} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[styles.simMarker, { borderColor: accentColor }]} />
          </Marker>
        ) : null}
      </MapView>

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
  labPinWrap: {
    alignItems: 'center',
  },
  labPinBadge: {
    position: 'relative',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  labPinSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
  },
  labPinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labPinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  labOngoingDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  simMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
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
