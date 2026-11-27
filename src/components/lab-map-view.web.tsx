import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

export function LabMapView({
  activities,
  selectedLabId,
  onSelectLab,
  accentColor = '#0D9488',
  onUserLocationChange,
}: LabMapViewProps) {
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  const selectedActivity = activities.find((a) => a.lab.id === selectedLabId) ?? activities[0] ?? null;
  const mapTargetLat = selectedActivity?.lab.latitude ?? -7.04912;
  const mapTargetLng = selectedActivity?.lab.longitude ?? 110.44089;
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  // Terima klik marker dari Leaflet iframe untuk memilih laboratorium
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SELECT_LAB' && typeof event.data.labId === 'string') {
        const found = activities.find((a) => a.lab.id === event.data.labId);
        if (found) onSelectLab(found);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activities, onSelectLab]);

  const selectedTargetId = selectedActivity?.lab.id ?? null;

  const syncMapOverlay = React.useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'SYNC_MAP_STATE',
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
  }, [selectedTargetId, mapTargetLat, mapTargetLng, userLocation]);

  useEffect(() => {
    syncMapOverlay();
  }, [syncMapOverlay]);

  const leafletSrcDoc = React.useMemo(() => {
    const labsPayload = activities.map((item) => {
      const status = item.ongoingSession
        ? 'ongoing'
        : item.nextSession
        ? 'upcoming'
        : 'idle';
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
    });

    const payloadJson = JSON.stringify({
      labs: labsPayload,
      defaultCenter: { lat: -7.0486, lng: 110.4409 },
      accent: accentColor,
    }).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F1F5F9; }
  .lab-pin { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 999px; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(15,23,42,0.28); white-space: nowrap; cursor: pointer; }
  .lab-pin.selected { outline: 3px solid rgba(15,23,42,0.35); transform: scale(1.06); }
  .user-dot { width: 16px; height: 16px; border-radius: 999px; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.28); }
  .leaflet-popup-content { margin: 10px 12px; font-size: 12px; line-height: 1.4; color: #0F172A; }
  .map-badge { position: absolute; left: 10px; bottom: 10px; z-index: 900; background: rgba(255,255,255,0.94); border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 700; color: #0F172A; pointer-events: none; }
  .map-controls { position: absolute; right: 10px; top: 10px; z-index: 900; display: flex; gap: 6px; }
  .map-ctrl-btn { background: #fff; border: 1px solid #CBD5E1; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; color: #0F172A; cursor: pointer; box-shadow: 0 1px 4px rgba(15,23,42,0.12); }
  .map-ctrl-btn:hover { background: #F8FAFC; }
</style>
</head>
<body>
<div id="map"></div>
<div class="map-controls">
  <button type="button" class="map-ctrl-btn" id="btn-focus-labs">Fokus Lab</button>
  <button type="button" class="map-ctrl-btn" id="btn-focus-user" style="display:none">Lokasi Saya</button>
</div>
<div class="map-badge">Peta Laboratorium Informatika FSM UNDIP</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const DATA = ${payloadJson};
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const firstLab = DATA.labs[0] || DATA.defaultCenter;
  const map = L.map('map', { zoomControl: true }).setView([firstLab.lat, firstLab.lng], 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const labBounds = [];
  const placed = [];
  const markersById = {};
  const circlesById = {};

  DATA.labs.forEach((lab) => {
    labBounds.push([lab.lat, lab.lng]);
    const color = lab.status === 'ongoing' ? '#16A34A' : lab.status === 'upcoming' ? '#D97706' : '#475569';
    const circle = L.circle([lab.lat, lab.lng], {
      radius: lab.radius,
      color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.1,
    }).addTo(map);
    circlesById[lab.id] = { circle, color, lab };

    let sameCount = 0;
    placed.forEach((p) => {
      if (Math.abs(p.lat - lab.lat) < 0.00008 && Math.abs(p.lng - lab.lng) < 0.00008) sameCount++;
    });
    placed.push(lab);
    const angle = sameCount * ((Math.PI * 2) / 5);
    const visualLat = sameCount > 0 ? lab.lat + Math.sin(angle) * 0.00018 : lab.lat;
    const visualLng = sameCount > 0 ? lab.lng + Math.cos(angle) * 0.00022 : lab.lng;
    labBounds.push([visualLat, visualLng]);

    const icon = L.divIcon({
      className: '',
      html: '<div class="lab-pin" style="background:' + color + '">' + esc(lab.kode) + '</div>',
      iconSize: [64, 28],
      iconAnchor: [32, 14]
    });
    const marker = L.marker([visualLat, visualLng], { icon }).addTo(map);
    marker.bindPopup('<strong>' + esc(lab.nama) + '</strong><br/>' + esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) + ' m<br/><span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span>');
    marker.on('click', () => {
      window.parent.postMessage({ type: 'SELECT_LAB', labId: lab.id }, '*');
    });
    markersById[lab.id] = { marker, color, lab };
  });

  function fitLabsView() {
    if (labBounds.length > 1) {
      map.fitBounds(labBounds, { padding: [45, 45], maxZoom: 18 });
    } else if (labBounds.length === 1) {
      map.setView(labBounds[0], 18);
    }
  }
  fitLabsView();
  document.getElementById('btn-focus-labs').addEventListener('click', fitLabsView);

  let userMarker = null;
  let userAccCircle = null;
  let routeLine = null;
  let lastUser = null;
  document.getElementById('btn-focus-user').addEventListener('click', () => {
    if (lastUser) map.setView([lastUser.lat, lastUser.lng], 17);
  });

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'SYNC_MAP_STATE') return;

    Object.keys(markersById).forEach((id) => {
      const entry = markersById[id];
      const cEntry = circlesById[id];
      const isSel = id === msg.selectedLabId;
      const bg = isSel ? DATA.accent : entry.color;
      entry.marker.setIcon(L.divIcon({
        className: '',
        html: '<div class="lab-pin ' + (isSel ? 'selected' : '') + '" style="background:' + bg + '">' + esc(entry.lab.kode) + '</div>',
        iconSize: [64, 28],
        iconAnchor: [32, 14]
      }));
      cEntry.circle.setStyle({
        color: isSel ? DATA.accent : cEntry.color,
        weight: isSel ? 2.5 : 1.5,
        fillColor: isSel ? DATA.accent : cEntry.color,
        fillOpacity: isSel ? 0.18 : 0.08,
      });
    });

    lastUser = msg.user || null;
    const btnUser = document.getElementById('btn-focus-user');
    if (msg.user) {
      btnUser.style.display = 'inline-block';
      if (!userMarker) {
        userAccCircle = L.circle([msg.user.lat, msg.user.lng], { radius: Math.min(msg.user.acc || 25, 100), color: '#2563EB', weight: 1, fillOpacity: 0.12 }).addTo(map);
        userMarker = L.marker([msg.user.lat, msg.user.lng], {
          icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
        }).addTo(map).bindPopup('Lokasi Perangkat Anda');
      } else {
        userMarker.setLatLng([msg.user.lat, msg.user.lng]);
        userAccCircle.setLatLng([msg.user.lat, msg.user.lng]);
        userAccCircle.setRadius(Math.min(msg.user.acc || 25, 100));
      }
      if (msg.target) {
        const pts = [[msg.user.lat, msg.user.lng], [msg.target.lat, msg.target.lng]];
        if (!routeLine) {
          routeLine = L.polyline(pts, { color: DATA.accent, weight: 2.5, dashArray: '6,6' }).addTo(map);
        } else {
          routeLine.setLatLngs(pts);
        }
      }
    } else {
      btnUser.style.display = 'none';
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (userAccCircle) { map.removeLayer(userAccCircle); userAccCircle = null; }
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    }
  });
</script>
</body>
</html>`;
  }, [activities, accentColor]);

  return (
    <View style={styles.container}>
      {/* Web Simulation Banner */}
      <View style={styles.webNoticeBanner}>
        <View style={styles.webNoticeDot} />
        <Text style={styles.webNoticeText}>
          Google Maps Aktif: Pilih kartu laboratorium di bawah untuk melihat lokasi dan rute pada peta.
        </Text>
      </View>

      {geoError && (
        <View style={styles.geoWarningBanner}>
          <View style={[styles.webNoticeDot, { backgroundColor: '#D97706' }]} />
          <Text style={styles.geoWarningText}>{geoError}</Text>
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

        {/* Live Embedded Google Maps Canvas untuk Web */}
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
            ref={iframeRef}
            onLoad={syncMapOverlay}
            title="Peta Laboratorium Informatika FSM UNDIP"
            srcDoc={leafletSrcDoc}
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
  geoWarningText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
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
    paddingBottom: 16,
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
