import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { UNDIP_INFORMATIKA_COORDINATES } from '@/services/lab-activity-service';
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

interface WebMapNoticeState {
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
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapNotice, setMapNotice] = useState<WebMapNoticeState | null>(null);
  const [mapReloadKey, setMapReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Browser Geolocation API listener
  useEffect(() => {
    let watchId: number | null = null;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locState: UserLocationState = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserLocation(locState);
          if (onUserLocationChange) onUserLocationChange(locState);
        },
        () => {
          setGeoError('Izin lokasi browser belum diizinkan atau GPS nonaktif.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const locState: UserLocationState = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserLocation(locState);
          if (onUserLocationChange) onUserLocationChange(locState);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [onUserLocationChange]);

  const selectedActivity =
    activities.find((a) => a.lab.id === selectedLabId) ?? activities[0] ?? null;
  const mapTargetLat = selectedActivity?.lab.latitude ?? UNDIP_INFORMATIKA_COORDINATES.latitude;
  const mapTargetLng = selectedActivity?.lab.longitude ?? UNDIP_INFORMATIKA_COORDINATES.longitude;
  const selectedTargetId = selectedActivity?.lab.id ?? null;

  // Terima event klik marker & status engine/fallback dari iframe peta
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: 'SELECT_LAB'; labId?: string }
        | HybridMapStatusMessage
        | undefined;
      if (!data) return;

      if (data.type === 'SELECT_LAB' && typeof data.labId === 'string') {
        const found = activities.find((a) => a.lab.id === data.labId);
        if (found) onSelectLab(found);
        return;
      }

      if (data.type === 'MAP_STATUS') {
        if (data.status === 'error' || data.status === 'tile_error') {
          setMapNotice({ tone: 'error', message: data.message, canRetry: true });
        } else if (data.status === 'fallback') {
          setMapNotice({ tone: 'warning', message: data.message });
        } else if (data.status === 'ready' && data.tileProvider && data.tileProvider !== 'osm') {
          setMapNotice({ tone: 'info', message: data.message });
        } else if (data.status === 'ready' && data.engine === 'google') {
          setMapNotice(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activities, onSelectLab]);

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

  const syncMapOverlay = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'SYNC_MAP_STATE',
        labs: labsPayload,
        selectedLabId: selectedTargetId,
        target: { lat: mapTargetLat, lng: mapTargetLng },
        user: userLocation
          ? {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
              acc: userLocation.accuracy ?? 25,
            }
          : null,
      },
      '*'
    );
  }, [labsPayload, selectedTargetId, mapTargetLat, mapTargetLng, userLocation]);

  useEffect(() => {
    syncMapOverlay();
  }, [syncMapOverlay]);

  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_USE_GOOGLE_MAPS === 'false' ||
    process.env.EXPO_PUBLIC_WEB_USE_GOOGLE_MAPS === 'false'
      ? ''
      : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  // HTML dasar tetap stabil (daftar lab & status live dikirim via postMessage agar tidak reload iframe)
  const hybridSrcDoc = useMemo(
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
        showBuiltInControls: true,
      }),
    [accentColor, googleMapsApiKey]
  );

  const handleReloadMap = () => {
    setMapNotice(null);
    setMapReloadKey((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      {/* Web Simulation Banner */}
      <View style={styles.webNoticeBanner}>
        <View style={styles.webNoticeDot} />
        <Text style={styles.webNoticeText}>
          Peta Interaktif Aktif: Ketuk marker laboratorium pada peta atau pilih kartu di bawah untuk melihat aktivitas & radius.
        </Text>
      </View>

      {geoError && (
        <View style={styles.geoWarningBanner}>
          <View style={[styles.webNoticeDot, { backgroundColor: '#D97706' }]} />
          <Text style={styles.geoWarningText}>{geoError}</Text>
        </View>
      )}

      {mapNotice && (
        <View
          style={[
            styles.geoWarningBanner,
            mapNotice.tone === 'error'
              ? styles.mapErrorBanner
              : mapNotice.tone === 'info'
              ? styles.mapInfoBanner
              : undefined,
          ]}>
          <View
            style={[
              styles.webNoticeDot,
              {
                backgroundColor:
                  mapNotice.tone === 'error'
                    ? '#DC2626'
                    : mapNotice.tone === 'info'
                    ? '#2563EB'
                    : '#D97706',
              },
            ]}
          />
          <Text
            style={[
              styles.geoWarningText,
              mapNotice.tone === 'error'
                ? { color: '#991B1B' }
                : mapNotice.tone === 'info'
                ? { color: '#1E40AF' }
                : undefined,
            ]}>
            {mapNotice.message}
          </Text>
          {mapNotice.canRetry ? (
            <TouchableOpacity style={styles.retryBtn} onPress={handleReloadMap}>
              <Text style={styles.retryBtnText}>Muat Ulang Peta</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setMapNotice(null)} accessibilityLabel="Tutup info peta">
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Visual Spatial Campus Map Representation */}
      <View style={styles.mapCanvas}>
        <View style={styles.campusGridHeader}>
          <Text style={styles.campusTitle}>
            {selectedActivity ? selectedActivity.lab.nama.toUpperCase() : 'GEDUNG E & F — FSM UNDIP'}
          </Text>
          <Text style={styles.campusSubtitle}>
            Koordinat: {mapTargetLat.toFixed(5)}, {mapTargetLng.toFixed(5)}
          </Text>
        </View>

        {/* Hybrid Embedded Google Maps + Leaflet Auto-Fallback Canvas */}
        <View
          style={{
            height: 220,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            marginBottom: 12,
            backgroundColor: '#E2E8F0',
          }}>
          <iframe
            key={mapReloadKey}
            ref={iframeRef}
            onLoad={syncMapOverlay}
            title="Peta Laboratorium Informatika FSM UNDIP"
            srcDoc={hybridSrcDoc}
            style={{ width: '100%', height: '100%', border: 0 }}
            loading="lazy"
          />
        </View>

        {/* Floor 2 & 3 Schematics */}
        <ScrollView
          style={styles.labGridScroll}
          contentContainerStyle={styles.labGridContent}
          showsVerticalScrollIndicator={false}>
          {activities.map((item) => {
            const isSelected = item.lab.id === selectedLabId;
            const hasOngoing = Boolean(item.ongoingSession);

            return (
              <TouchableOpacity
                key={item.lab.id}
                style={[
                  styles.labSpatialCard,
                  isSelected && [
                    styles.labSpatialCardSelected,
                    { borderColor: accentColor },
                  ],
                ]}
                onPress={() => onSelectLab(item)}>
                <View style={styles.spatialCardHeader}>
                  <View style={styles.spatialLeft}>
                    <View
                      style={[
                        styles.markerPinCircle,
                        {
                          backgroundColor: hasOngoing
                            ? '#16A34A'
                            : isSelected
                            ? accentColor
                            : '#64748B',
                        },
                      ]}>
                      <Text style={styles.markerPinCode} numberOfLines={1}>{item.lab.kode}</Text>
                    </View>
                    <View style={styles.spatialTitleCol}>
                      <Text style={styles.spatialLabName}>{item.lab.nama}</Text>
                      <Text style={styles.spatialGedung}>{item.lab.gedung}</Text>
                    </View>
                  </View>

                  <View style={styles.spatialRight}>
                    {hasOngoing ? (
                      <View style={styles.ongoingBadge}>
                        <View style={styles.ongoingDot} />
                        <Text style={styles.ongoingBadgeText}>AKTIF</Text>
                      </View>
                    ) : (
                      <View style={styles.idleBadge}>
                        <Text style={styles.idleBadgeText}>IDLE</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Info row */}
                <View style={styles.spatialMetaRow}>
                  <Text style={styles.spatialMetaText}>
                    Radius: <Text style={styles.boldText}>{item.lab.radiusMeter}m</Text>
                  </Text>
                  <Text style={styles.spatialMetaText}>•</Text>
                  <Text style={styles.spatialMetaText}>
                    Koordinat: {item.lab.latitude.toFixed(5)}, {item.lab.longitude.toFixed(5)}
                  </Text>
                  {item.distanceMeters !== undefined && (
                    <>
                      <Text style={styles.spatialMetaText}>•</Text>
                      <Text
                        style={[
                          styles.spatialMetaText,
                          {
                            color: item.isUserInsideRadius ? '#15803D' : '#B91C1C',
                            fontWeight: '700',
                          },
                        ]}>
                        Jarak: {item.distanceMeters}m ({item.isUserInsideRadius ? 'Dalam Radius' : 'Luar Radius'})
                      </Text>
                    </>
                  )}
                </View>

                {/* Sesi info snippet */}
                {item.ongoingSession ? (
                  <View style={styles.spatialSessionSnippet}>
                    <Text style={styles.snippetLabel}>Praktikum Berlangsung:</Text>
                    <Text style={styles.snippetValue} numberOfLines={1}>
                      {item.ongoingSession.praktikum} ({item.ongoingSession.kelas}) • {item.ongoingSession.waktuMulai} - {item.ongoingSession.waktuSelesai}
                    </Text>
                  </View>
                ) : item.nextSession ? (
                  <View style={styles.spatialNextSnippet}>
                    <Text style={styles.snippetNextLabel}>Sesi Berikutnya:</Text>
                    <Text style={styles.snippetNextValue} numberOfLines={1}>
                      {item.nextSession.praktikum} ({item.nextSession.kelas}) • {item.nextSession.tanggal}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noSessionSnippet}>Tidak ada sesi terdaftar</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* User Location Bar */}
      {userLocation && (
        <View style={styles.userLocationBar}>
          <View style={styles.userDotPulse} />
          <Text style={styles.userLocationText}>
            Posisi Web Anda: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            {userLocation.accuracy ? ` (Akurasi ±${Math.round(userLocation.accuracy)}m)` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  webNoticeBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webNoticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  webNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  geoWarningBanner: {
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FCA5A5',
  },
  mapInfoBanner: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  geoWarningText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
  },
  retryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 4,
  },
  mapCanvas: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  campusGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  campusTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  campusSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  labGridScroll: {
    flex: 1,
  },
  labGridContent: {
    gap: 10,
    paddingBottom: 96,
  },
  labSpatialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  labSpatialCardSelected: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.1,
  },
  spatialCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spatialLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markerPinCircle: {
    minWidth: 58,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPinCode: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  spatialTitleCol: {
    flex: 1,
  },
  spatialLabName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  spatialGedung: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  spatialRight: {
    marginLeft: 8,
  },
  ongoingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  ongoingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  ongoingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  idleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  idleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  spatialMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  spatialMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  spatialSessionSnippet: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  snippetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  snippetValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  spatialNextSnippet: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  snippetNextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  snippetNextValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  noSessionSnippet: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  userLocationBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  userLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
});
