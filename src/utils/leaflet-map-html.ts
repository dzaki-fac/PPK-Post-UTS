/**
 * Generator HTML Leaflet interaktif (Peta Jalan OpenStreetMap + Satelit Esri)
 * Digunakan bersama oleh peta Web (<iframe srcDoc>) dan Android/iOS (<WebView>).
 */

export interface LeafletLabPayload {
  id: string;
  kode: string;
  nama: string;
  gedung: string;
  lat: number;
  lng: number;
  radius: number;
  status: 'ongoing' | 'upcoming' | 'idle';
  statusLabel: string;
}

export interface LeafletMapSyncState {
  selectedLabId: string | null;
  target: { lat: number; lng: number } | null;
  user: { lat: number; lng: number; acc?: number } | null;
  routeCoords?: { latitude: number; longitude: number }[];
  simPoint?: { latitude: number; longitude: number } | null;
}

export function buildLeafletMapHtml(params: {
  labs: LeafletLabPayload[];
  defaultCenter: { lat: number; lng: number };
  accentColor: string;
  zonePolygon?: { latitude: number; longitude: number }[];
}): string {
  const payloadJson = JSON.stringify({
    labs: params.labs,
    defaultCenter: params.defaultCenter,
    accent: params.accentColor,
    zonePolygon: (params.zonePolygon ?? []).map((p) => [p.latitude, p.longitude]),
  }).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #E2E8F0; overflow: hidden; }
  .lab-pin { display: inline-flex; align-items: center; justify-content: center; padding: 4px 8px; border-radius: 999px; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(15,23,42,0.28); white-space: nowrap; cursor: pointer; }
  .lab-pin.selected { outline: 3px solid rgba(15,23,42,0.35); transform: scale(1.06); }
  .user-dot { width: 16px; height: 16px; border-radius: 999px; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 0 5px rgba(37,99,235,0.28); }
  .sim-dot { width: 14px; height: 14px; border-radius: 999px; background: #fff; border: 3px solid #0D9488; box-shadow: 0 2px 6px rgba(15,23,42,0.35); }
  .leaflet-popup-content { margin: 10px 12px; font-size: 12px; line-height: 1.4; color: #0F172A; }
  .map-badge { position: absolute; left: 10px; bottom: 10px; z-index: 900; background: rgba(255,255,255,0.94); border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 700; color: #0F172A; pointer-events: none; }
</style>
</head>
<body>
<div id="map"></div>
<div class="map-badge">Peta Lab FSM UNDIP</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const DATA = ${payloadJson};
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function postToHost(msg) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }

  const firstLab = DATA.labs[0] || DATA.defaultCenter;
  const map = L.map('map', { zoomControl: true }).setView([firstLab.lat, firstLab.lng], 18);
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  });
  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: '&copy; Esri Satellite'
  });
  streetLayer.addTo(map);
  L.control.layers({ 'Peta Jalan': streetLayer, 'Satelit': satLayer }, {}, { position: 'topleft' }).addTo(map);

  if (DATA.zonePolygon && DATA.zonePolygon.length >= 3) {
    L.polygon(DATA.zonePolygon, {
      color: DATA.accent,
      weight: 1.5,
      fillColor: DATA.accent,
      fillOpacity: 0.08,
    }).addTo(map);
  }

  const labBounds = [];
  const placed = [];
  const markersById = {};
  const circlesById = {};

  DATA.labs.forEach((lab) => {
    let sameCount = 0;
    placed.forEach((p) => {
      if (Math.abs(p.lat - lab.lat) < 0.00008 && Math.abs(p.lng - lab.lng) < 0.00008) sameCount++;
    });
    placed.push(lab);
    const angle = sameCount * ((Math.PI * 2) / 5);
    const visualLat = sameCount > 0 ? lab.lat + Math.sin(angle) * 0.00018 : lab.lat;
    const visualLng = sameCount > 0 ? lab.lng + Math.cos(angle) * 0.00022 : lab.lng;
    const color = lab.status === 'ongoing' ? '#16A34A' : lab.status === 'upcoming' ? '#D97706' : '#475569';

    labBounds.push([lab.lat, lab.lng]);
    labBounds.push([visualLat, visualLng]);

    const circle = L.circle([lab.lat, lab.lng], {
      radius: lab.radius,
      color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.1,
    }).addTo(map);
    circlesById[lab.id] = { circle, color, lab };

    const icon = L.divIcon({
      className: '',
      html: '<div class="lab-pin" style="background:' + color + '">' + esc(lab.kode) + '</div>',
      iconSize: [64, 28],
      iconAnchor: [32, 14],
    });
    const marker = L.marker([visualLat, visualLng], { icon }).addTo(map);
    marker.bindPopup('<strong>' + esc(lab.nama) + '</strong><br/>' + esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) + ' m<br/><span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span>');
    marker.on('click', () => {
      postToHost({ type: 'SELECT_LAB', labId: lab.id });
    });
    markersById[lab.id] = { marker, color, lab };
  });

  window.__focusLabs = function() {
    if (labBounds.length > 1) map.fitBounds(labBounds, { padding: [45, 45], maxZoom: 18 });
    else if (labBounds.length === 1) map.setView(labBounds[0], 18);
  };
  window.__focusLabs();

  let userMarker = null;
  let userAccCircle = null;
  let routeLine = null;
  let simMarker = null;
  let lastUser = null;

  window.__focusUser = function() {
    if (lastUser) map.setView([lastUser.lat, lastUser.lng], 17);
  };

  window.__syncLabMapState = function(msg) {
    if (!msg) return;
    Object.keys(markersById).forEach((id) => {
      const entry = markersById[id];
      const cEntry = circlesById[id];
      const isSel = id === msg.selectedLabId;
      const bg = isSel ? DATA.accent : entry.color;
      entry.marker.setIcon(L.divIcon({
        className: '',
        html: '<div class="lab-pin ' + (isSel ? 'selected' : '') + '" style="background:' + bg + '">' + esc(entry.lab.kode) + '</div>',
        iconSize: [64, 28],
        iconAnchor: [32, 14],
      }));
      cEntry.circle.setStyle({
        color: isSel ? DATA.accent : cEntry.color,
        weight: isSel ? 2.5 : 1.5,
        fillColor: isSel ? DATA.accent : cEntry.color,
        fillOpacity: isSel ? 0.18 : 0.08,
      });
    });

    lastUser = msg.user || null;
    if (msg.user) {
      if (!userMarker) {
        userAccCircle = L.circle([msg.user.lat, msg.user.lng], {
          radius: Math.min(msg.user.acc || 25, 100),
          color: '#2563EB',
          weight: 1,
          fillOpacity: 0.15,
        }).addTo(map);
        userMarker = L.marker([msg.user.lat, msg.user.lng], {
          icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        }).addTo(map).bindPopup('Lokasi Perangkat Anda');
      } else {
        userMarker.setLatLng([msg.user.lat, msg.user.lng]);
        userAccCircle.setLatLng([msg.user.lat, msg.user.lng]);
        userAccCircle.setRadius(Math.min(msg.user.acc || 25, 100));
      }
    } else {
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (userAccCircle) { map.removeLayer(userAccCircle); userAccCircle = null; }
    }

    const pts = Array.isArray(msg.routeCoords) && msg.routeCoords.length >= 2
      ? msg.routeCoords.map((p) => [p.latitude, p.longitude])
      : msg.user && msg.target
      ? [[msg.user.lat, msg.user.lng], [msg.target.lat, msg.target.lng]]
      : [];

    if (pts.length >= 2) {
      if (!routeLine) routeLine = L.polyline(pts, { color: DATA.accent, weight: 3, dashArray: '6,6' }).addTo(map);
      else routeLine.setLatLngs(pts);
    } else if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    if (msg.simPoint) {
      const sp = [msg.simPoint.latitude, msg.simPoint.longitude];
      if (!simMarker) {
        simMarker = L.marker(sp, {
          icon: L.divIcon({ className: '', html: '<div class="sim-dot" style="border-color:' + DATA.accent + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
        }).addTo(map);
      } else {
        simMarker.setLatLng(sp);
      }
    } else if (simMarker) {
      map.removeLayer(simMarker);
      simMarker = null;
    }
  };

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'SYNC_MAP_STATE') window.__syncLabMapState(msg);
  });
</script>
</body>
</html>`;
}
