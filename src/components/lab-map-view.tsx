import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
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
  AnimatedRegion,
  Circle,
  Marker,
  MarkerAnimated,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
} from 'react-native-maps';

import {
  UNDIP_INFORMATIKA_COORDINATES,
} from '@/services/lab-activity-service';
import { getRouteCoordinates, type RouteCoordinate } from '@/services/route-service';
import { LabWithActivity } from '@/types/praktikum';

/** Zona poligon kawasan Gedung E & F Departemen Informatika FSM UNDIP */
const INFORMATIKA_ZONE_POLYGON: LatLng[] = [
  { latitude: -7.0489, longitude: 110.4400 },
  { latitude: -7.0489, longitude: 110.4414 },
  { latitude: -7.0503, longitude: 110.4414 },
  { latitude: -7.0503, longitude: 110.4400 },
];

function animateAlongPath(
  path: RouteCoordinate[],
  coord: AnimatedRegion,
  onDone?: () => void
) {
  let index = 0;
  const step = () => {
    if (index >= path.length) {
      onDone?.();
      return;
    }
    coord
      .timing({
        latitude: path[index].latitude,
        longitude: path[index].longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 180,
        useNativeDriver: false,
        toValue: 0,
      })
      .start(({ finished }) => {
        if (finished) {
          index += 1;
          step();
        } else {
          onDone?.();
        }
      });
  };
  step();
}

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

export function LabMapView({
  activities,
  selectedLabId,
  onSelectLab,
  accentColor = '#0D9488',
  onUserLocationChange,
}: LabMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [isFallbackDirectLine, setIsFallbackDirectLine] = useState<boolean>(false);
  const hasAnimatedUserOnce = useRef<boolean>(false);
  const [userAnimatedCoord] = useState(
    () =>
      new AnimatedRegion({
        latitude: UNDIP_INFORMATIKA_COORDINATES.latitude,
        longitude: UNDIP_INFORMATIKA_COORDINATES.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      })
  );
  const [permissionStatus, setPermissionStatus] = useState<
    'loading' | 'granted' | 'denied' | 'disabled'
  >('loading');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState<boolean>(false);

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

        // Ambil lokasi instan pertama kali
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
            if (onUserLocationChange) onUserLocationChange(locState);
          }
        } catch {
          // Non-fatal fallback ke watchPosition
        }

        // Live tracking baterai-efisien (jarak minimal 5m atau interval 3s)
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
            if (onUserLocationChange) onUserLocationChange(updated);
          }
        );
      } catch {
        if (isMounted) setPermissionStatus('denied');
      }
    };

    startLocationWatch();

    // Wajib cleanup listener saat layar unmount
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [onUserLocationChange]);

  const selectedActivity = activities.find((a) => a.lab.id === selectedLabId);

  // Animasi halus pergerakan marker pengguna pada sisi native (AnimatedRegion)
  useEffect(() => {
    if (!userLocation) return;

    if (!hasAnimatedUserOnce.current) {
      hasAnimatedUserOnce.current = true;
      userAnimatedCoord.setValue({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
      return;
    }

    userAnimatedCoord
      .timing({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 700,
        useNativeDriver: false,
        toValue: 0,
      })
      .start();
  }, [userLocation, userAnimatedCoord]);

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

  const activeRouteCoords = userLocation && selectedActivity ? routeCoords : [];

  const centerToUser = () => {
    if (!userLocation || !mapRef.current) return;
    setIsLocating(true);
    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      800
    );
    setTimeout(() => setIsLocating(false), 800);
  };

  const centerToCampus = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: UNDIP_INFORMATIKA_COORDINATES.latitude,
        longitude: UNDIP_INFORMATIKA_COORDINATES.longitude,
        latitudeDelta: UNDIP_INFORMATIKA_COORDINATES.latitudeDelta,
        longitudeDelta: UNDIP_INFORMATIKA_COORDINATES.longitudeDelta,
      },
      800
    );
  };

  const centerToLab = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.0018,
        longitudeDelta: 0.0018,
      },
      600
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

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={UNDIP_INFORMATIKA_COORDINATES}
        showsUserLocation={false}
        showsCompass
        showsScale
        loadingEnabled>
        {/* Polygon Zona Kawasan Departemen Informatika FSM UNDIP */}
        <Polygon
          coordinates={INFORMATIKA_ZONE_POLYGON}
          fillColor={
            accentColor === '#EA580C'
              ? 'rgba(234, 88, 12, 0.08)'
              : 'rgba(13, 148, 136, 0.08)'
          }
          strokeColor={accentColor}
          strokeWidth={1.5}
        />

        {/* Lingkaran Area Radius Lab yang sedang dipilih */}
        {selectedActivity && (
          <Circle
            center={{
              latitude: selectedActivity.lab.latitude,
              longitude: selectedActivity.lab.longitude,
            }}
            radius={selectedActivity.lab.radiusMeter}
            strokeWidth={2}
            strokeColor={accentColor}
            fillColor={
              accentColor === '#EA580C'
                ? 'rgba(234, 88, 12, 0.16)'
                : 'rgba(13, 148, 136, 0.16)'
            }
          />
        )}

        {/* Marker Laboratorium Informatika */}
        {activities.map((item) => {
          const isSelected = item.lab.id === selectedLabId;
          const hasOngoing = Boolean(item.ongoingSession);

          // Warna marker semantik
          const markerColor = hasOngoing
            ? '#16A34A' // Sedang berlangsung
            : isSelected
            ? accentColor
            : '#475569'; // Idle

          return (
            <Marker
              key={item.lab.id}
              coordinate={{
                latitude: item.lab.latitude,
                longitude: item.lab.longitude,
              }}
              title={item.lab.nama}
              description={
                hasOngoing
                  ? `[Sedang Aktif] ${item.ongoingSession?.praktikum}`
                  : `Radius: ${item.lab.radiusMeter}m`
              }
              onPress={() => {
                onSelectLab(item);
                centerToLab(item.lab.latitude, item.lab.longitude);
              }}>
              <View
                style={[
                  styles.customMarkerWrap,
                  isSelected && styles.customMarkerSelected,
                ]}>
                <View
                  style={[
                    styles.customMarkerPin,
                    { backgroundColor: markerColor },
                    isSelected && { borderColor: '#FFFFFF', borderWidth: 2 },
                  ]}>
                  <Text style={styles.markerCodeText}>{item.lab.kode}</Text>
                </View>
                {/* Pin Tip */}
                <View
                  style={[
                    styles.pinTip,
                    { borderTopColor: markerColor },
                  ]}
                />
                {/* Ongoing Pulse Dot */}
                {hasOngoing && (
                  <View style={styles.ongoingIndicator}>
                    <View style={styles.ongoingPulseDot} />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}

        {/* Polyline Rute dari Posisi Pengguna menuju Lab yang Dipilih */}
        {activeRouteCoords.length >= 2 && (
          <Polyline
            coordinates={activeRouteCoords}
            strokeColor={accentColor}
            strokeWidth={4}
            lineDashPattern={isFallbackDirectLine ? [8, 6] : undefined}
          />
        )}

        {/* Marker Lokasi Pengguna (Live AnimatedMarker) */}
        {userLocation && (
          <>
            {userLocation.accuracy && userLocation.accuracy <= 50 ? (
              <Circle
                center={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                radius={Math.min(userLocation.accuracy, 40)}
                strokeWidth={1}
                strokeColor="rgba(37, 99, 235, 0.5)"
                fillColor="rgba(37, 99, 235, 0.12)"
              />
            ) : null}
            <MarkerAnimated
              coordinate={userAnimatedCoord as unknown as LatLng}
              title="Posisi Anda"
              description="Lokasi perangkat saat ini">
              <View style={styles.userLocationMarker}>
                <View style={styles.userLocationOuterPulse}>
                  <View style={styles.userLocationInnerDot} />
                </View>
              </View>
            </MarkerAnimated>
          </>
        )}
      </MapView>

      {/* Floating Control Buttons */}
      <View style={styles.floatingControls}>
        {activeRouteCoords.length >= 2 && (
          <TouchableOpacity
            style={[styles.floatingBtn, isSimulatingRoute && styles.floatingBtnActive]}
            onPress={() => {
              if (isSimulatingRoute) return;
              setIsSimulatingRoute(true);
              animateAlongPath(activeRouteCoords, userAnimatedCoord, () => {
                setIsSimulatingRoute(false);
              });
            }}
            accessibilityLabel="Simulasi Pergerakan Rute">
            <Text style={[{ fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: accentColor }]}>
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
          accessibilityLabel="Pusatkan ke Kampus Informatika FSM">
          <View style={styles.campusIconOuter}>
            <View style={[styles.campusIconLine, { backgroundColor: '#475569' }]} />
            <View style={[styles.campusIconLine, { backgroundColor: '#475569', height: 7 }]} />
            <View style={[styles.campusIconLine, { backgroundColor: '#475569' }]} />
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
    backgroundColor: '#F8FAFC',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  resilienceBanner: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  resilienceWarning: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  resilienceIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  resilienceText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  resilienceAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  resilienceActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  customMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarkerSelected: {
    transform: [{ scale: 1.12 }],
  },
  customMarkerPin: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  markerCodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  pinTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
  ongoingIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  ongoingPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  userLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationOuterPulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userLocationInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    bottom: 24,
    gap: 10,
    zIndex: 10,
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
    elevation: 4,
  },
  floatingBtnActive: {
    backgroundColor: '#F8FAFC',
  },
  locateIconOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateIconInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  campusIconOuter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
    height: 14,
  },
  campusIconLine: {
    width: 3.5,
    height: 12,
    borderRadius: 1,
  },
});
