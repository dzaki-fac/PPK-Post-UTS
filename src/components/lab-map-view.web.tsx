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
  const mapTargetLat = selectedActivity?.lab.latitude ?? -7.048036;
  const mapTargetLng = selectedActivity?.lab.longitude ?? 110.440912;
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
      defaultCenter: { lat: -7.048036, lng: 110.440912 },
      accent: accentColor,
      googleMapsApiKey:
        process.env.EXPO_PUBLIC_WEB_USE_GOOGLE_MAPS === 'true'
          ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
          : '',
    }).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F1F5F9; overflow: hidden; }
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
<div class="map-badge" id="map-badge">Peta Laboratorium Informatika FSM UNDIP</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const DATA = ${payloadJson};
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const firstLab = DATA.labs[0] || DATA.defaultCenter;
  let activeEngine = null; // 'google' | 'leaflet'
  let latestSyncMsg = null;

  function computeSpreadPositions() {
    const placed = [];
    return DATA.labs.map((lab) => {
      let sameCount = 0;
      placed.forEach((p) => {
        if (Math.abs(p.lat - lab.lat) < 0.00008 && Math.abs(p.lng - lab.lng) < 0.00008) sameCount++;
      });
      placed.push(lab);
      const angle = sameCount * ((Math.PI * 2) / 5);
      const visualLat = sameCount > 0 ? lab.lat + Math.sin(angle) * 0.00018 : lab.lat;
      const visualLng = sameCount > 0 ? lab.lng + Math.cos(angle) * 0.00022 : lab.lng;
      const color = lab.status === 'ongoing' ? '#16A34A' : lab.status === 'upcoming' ? '#D97706' : '#475569';
      return { lab, visualLat, visualLng, color };
    });
  }
  const SPREAD_LABS = computeSpreadPositions();

  // ---- ENGINE 1: Leaflet + OpenStreetMap (juga fallback otomatis bila Google Maps JS API dibatasi) ----
  let lMap = null;
  let lApplySync = null;
  function startLeafletEngine() {
    if (activeEngine === 'leaflet') return;
    activeEngine = 'leaflet';
    document.getElementById('map-badge').textContent = 'Peta Lab (OpenStreetMap)';
    const mapEl = document.getElementById('map');
    mapEl.innerHTML = '';
    lMap = L.map('map', { zoomControl: true }).setView([firstLab.lat, firstLab.lng], 18);
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap'
    });
    const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      attribution: '&copy; Esri Satellite'
    });
    streetLayer.addTo(lMap);
    L.control.layers({ 'Peta Jalan': streetLayer, 'Satelit': satLayer }, {}, { position: 'topleft' }).addTo(lMap);

    const labBounds = [];
    const markersById = {};
    const circlesById = {};

    SPREAD_LABS.forEach(({ lab, visualLat, visualLng, color }) => {
      labBounds.push([lab.lat, lab.lng]);
      labBounds.push([visualLat, visualLng]);
      const circle = L.circle([lab.lat, lab.lng], {
        radius: lab.radius,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.1,
      }).addTo(lMap);
      circlesById[lab.id] = { circle, color, lab };

      const icon = L.divIcon({
        className: '',
        html: '<div class="lab-pin" style="background:' + color + '">' + esc(lab.kode) + '</div>',
        iconSize: [64, 28],
        iconAnchor: [32, 14]
      });
      const marker = L.marker([visualLat, visualLng], { icon }).addTo(lMap);
      marker.bindPopup('<strong>' + esc(lab.nama) + '</strong><br/>' + esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) + ' m<br/><span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span>');
      marker.on('click', () => {
        window.parent.postMessage({ type: 'SELECT_LAB', labId: lab.id }, '*');
      });
      markersById[lab.id] = { marker, color, lab };
    });

    function fitLabsView() {
      if (labBounds.length > 1) lMap.fitBounds(labBounds, { padding: [45, 45], maxZoom: 18 });
      else if (labBounds.length === 1) lMap.setView(labBounds[0], 18);
    }
    fitLabsView();

    let userMarker = null, userAccCircle = null, routeLine = null, lastUser = null;
    document.getElementById('btn-focus-labs').onclick = fitLabsView;
    document.getElementById('btn-focus-user').onclick = () => { if (lastUser) lMap.setView([lastUser.lat, lastUser.lng], 17); };

    lApplySync = (msg) => {
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
          userAccCircle = L.circle([msg.user.lat, msg.user.lng], { radius: Math.min(msg.user.acc || 25, 100), color: '#2563EB', weight: 1, fillOpacity: 0.12 }).addTo(lMap);
          userMarker = L.marker([msg.user.lat, msg.user.lng], {
            icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
          }).addTo(lMap).bindPopup('Lokasi Perangkat Anda');
        } else {
          userMarker.setLatLng([msg.user.lat, msg.user.lng]);
          userAccCircle.setLatLng([msg.user.lat, msg.user.lng]);
          userAccCircle.setRadius(Math.min(msg.user.acc || 25, 100));
        }
        if (msg.target) {
          const pts = [[msg.user.lat, msg.user.lng], [msg.target.lat, msg.target.lng]];
          if (!routeLine) routeLine = L.polyline(pts, { color: DATA.accent, weight: 2.5, dashArray: '6,6' }).addTo(lMap);
          else routeLine.setLatLngs(pts);
        }
      } else {
        btnUser.style.display = 'none';
        if (userMarker) { lMap.removeLayer(userMarker); userMarker = null; }
        if (userAccCircle) { lMap.removeLayer(userAccCircle); userAccCircle = null; }
        if (routeLine) { lMap.removeLayer(routeLine); routeLine = null; }
      }
    };
    if (latestSyncMsg) lApplySync(latestSyncMsg);
  }

  // ---- ENGINE 2: Google Maps JS API (Utama bila API key aktif & valid) ----
  let gApplySync = null;
  function makeSvgPin(code, bg, isSelected) {
    const stroke = isSelected ? '#0F172A' : '#FFFFFF';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="76" height="30" viewBox="0 0 76 30"><rect x="2" y="2" width="72" height="24" rx="12" fill="' + bg + '" stroke="' + stroke + '" stroke-width="2.5"/><text x="38" y="18" text-anchor="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="11" font-weight="800">' + esc(code) + '</text></svg>';
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(76, 30),
      anchor: new google.maps.Point(38, 15),
    };
  }

  window.__onGoogleMapsReady = function() {
    if (activeEngine === 'leaflet' || !window.google || !window.google.maps) return;
    activeEngine = 'google';
    document.getElementById('map-badge').textContent = 'Google Maps — Lab FSM UNDIP';
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: firstLab.lat, lng: firstLab.lng },
      zoom: 18,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const infoWin = new google.maps.InfoWindow();
    const bounds = new google.maps.LatLngBounds();
    const gMarkers = {};
    const gCircles = {};

    SPREAD_LABS.forEach(({ lab, visualLat, visualLng, color }) => {
      bounds.extend({ lat: lab.lat, lng: lab.lng });
      bounds.extend({ lat: visualLat, lng: visualLng });
      const circle = new google.maps.Circle({
        map,
        center: { lat: lab.lat, lng: lab.lng },
        radius: lab.radius,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.12,
      });
      gCircles[lab.id] = { circle, color, lab };

      const marker = new google.maps.Marker({
        map,
        position: { lat: visualLat, lng: visualLng },
        title: lab.nama,
        icon: makeSvgPin(lab.kode, color, false),
      });
      marker.addListener('click', () => {
        infoWin.setContent('<div style="font-family:sans-serif;font-size:12px;line-height:1.4;color:#0F172A"><strong>' + esc(lab.nama) + '</strong><br/>' + esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) + ' m<br/><span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span></div>');
        infoWin.open(map, marker);
        window.parent.postMessage({ type: 'SELECT_LAB', labId: lab.id }, '*');
      });
      gMarkers[lab.id] = { marker, color, lab };
    });

    function fitLabsView() {
      if (SPREAD_LABS.length > 1) {
        map.fitBounds(bounds, 40);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (map.getZoom() > 18) map.setZoom(18);
        });
      } else {
        map.setCenter({ lat: firstLab.lat, lng: firstLab.lng });
        map.setZoom(18);
      }
    }
    fitLabsView();

    let gUserMarker = null, gUserCircle = null, gRouteLine = null, lastUser = null;
    document.getElementById('btn-focus-labs').onclick = fitLabsView;
    document.getElementById('btn-focus-user').onclick = () => {
      if (lastUser) {
        map.panTo({ lat: lastUser.lat, lng: lastUser.lng });
        map.setZoom(17);
      }
    };

    gApplySync = (msg) => {
      if (activeEngine !== 'google') return;
      Object.keys(gMarkers).forEach((id) => {
        const m = gMarkers[id];
        const c = gCircles[id];
        const isSel = id === msg.selectedLabId;
        const bg = isSel ? DATA.accent : m.color;
        m.marker.setIcon(makeSvgPin(m.lab.kode, bg, isSel));
        c.circle.setOptions({
          strokeColor: isSel ? DATA.accent : c.color,
          strokeWeight: isSel ? 2.5 : 1.5,
          fillColor: isSel ? DATA.accent : c.color,
          fillOpacity: isSel ? 0.18 : 0.1,
        });
      });

      lastUser = msg.user || null;
      const btnUser = document.getElementById('btn-focus-user');
      if (msg.user) {
        btnUser.style.display = 'inline-block';
        const pos = { lat: msg.user.lat, lng: msg.user.lng };
        if (!gUserMarker) {
          gUserCircle = new google.maps.Circle({
            map,
            center: pos,
            radius: Math.min(msg.user.acc || 25, 100),
            strokeColor: '#2563EB',
            strokeWeight: 1,
            fillColor: '#2563EB',
            fillOpacity: 0.12,
          });
          gUserMarker = new google.maps.Marker({
            map,
            position: pos,
            title: 'Lokasi Perangkat Anda',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#2563EB',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2.5,
            },
          });
        } else {
          gUserMarker.setPosition(pos);
          gUserCircle.setCenter(pos);
          gUserCircle.setRadius(Math.min(msg.user.acc || 25, 100));
        }
        if (msg.target) {
          const path = [pos, { lat: msg.target.lat, lng: msg.target.lng }];
          if (!gRouteLine) {
            gRouteLine = new google.maps.Polyline({
              map,
              path,
              strokeColor: DATA.accent,
              strokeOpacity: 0,
              icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 3 }, offset: '0', repeat: '12px' }],
            });
          } else {
            gRouteLine.setPath(path);
          }
        }
      } else {
        btnUser.style.display = 'none';
        if (gUserMarker) { gUserMarker.setMap(null); gUserMarker = null; }
        if (gUserCircle) { gUserCircle.setMap(null); gUserCircle = null; }
        if (gRouteLine) { gRouteLine.setMap(null); gRouteLine = null; }
      }
    };
    if (latestSyncMsg) gApplySync(latestSyncMsg);
  };

  window.gm_authFailure = function() {
    startLeafletEngine();
  };

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'SYNC_MAP_STATE') return;
    latestSyncMsg = msg;
    if (activeEngine === 'google' && gApplySync) gApplySync(msg);
    else if (activeEngine === 'leaflet' && lApplySync) lApplySync(msg);
  });

  if (DATA.googleMapsApiKey) {
    const gs = document.createElement('script');
    gs.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(DATA.googleMapsApiKey) + '&loading=async&callback=__onGoogleMapsReady';
    gs.async = true;
    gs.defer = true;
    gs.onerror = () => startLeafletEngine();
    document.head.appendChild(gs);
    setTimeout(() => { if (!activeEngine) startLeafletEngine(); }, 4500);
  } else {
    startLeafletEngine();
  }
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
          Peta Interaktif Aktif: Ketuk marker laboratorium pada peta atau pilih kartu di bawah untuk melihat aktivitas & radius.
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
