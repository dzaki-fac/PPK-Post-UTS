/**
 * Generator HTML peta hybrid: mencoba Google Maps JS API (bila API key aktif),
 * lalu otomatis fallback ke Leaflet (multi-CDN & multi-tile: OpenStreetMap -> CARTO Voyager -> Satelit Esri).
 * Digunakan bersama oleh peta Android/iOS (<WebView>) dan Web (<iframe srcDoc>).
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
  labs?: LeafletLabPayload[];
  selectedLabId: string | null;
  target: { lat: number; lng: number } | null;
  user: { lat: number; lng: number; acc?: number } | null;
  routeCoords?: { latitude: number; longitude: number }[];
  simPoint?: { latitude: number; longitude: number } | null;
}

export interface HybridMapStatusMessage {
  type: 'MAP_STATUS';
  status: 'ready' | 'fallback' | 'tile_error' | 'error';
  engine: 'google' | 'leaflet' | 'none';
  tileProvider?: 'osm' | 'carto' | 'esri';
  fallbackFrom?: 'google';
  reason?: string;
  message: string;
}

export interface BuildHybridMapHtmlParams {
  labs: LeafletLabPayload[];
  defaultCenter: { lat: number; lng: number };
  accentColor: string;
  zonePolygon?: { latitude: number; longitude: number }[];
  googleMapsApiKey?: string;
  showBuiltInControls?: boolean;
}

export function buildHybridMapHtml(params: BuildHybridMapHtmlParams): string {
  const payloadJson = JSON.stringify({
    labs: params.labs,
    defaultCenter: params.defaultCenter,
    accent: params.accentColor,
    zonePolygon: (params.zonePolygon ?? []).map((p) => [p.latitude, p.longitude]),
    googleMapsApiKey: params.googleMapsApiKey?.trim() ?? '',
    showBuiltInControls: Boolean(params.showBuiltInControls),
  }).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #E2E8F0; overflow: hidden; }
  .lab-pin { display: inline-flex; align-items: center; justify-content: center; padding: 4px 8px; border-radius: 999px; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(15,23,42,0.28); white-space: nowrap; cursor: pointer; }
  .lab-pin.selected { outline: 3px solid rgba(15,23,42,0.35); transform: scale(1.06); }
  .user-dot { width: 16px; height: 16px; border-radius: 999px; background: #2563EB; border: 3px solid #fff; box-shadow: 0 0 0 5px rgba(37,99,235,0.28); }
  .sim-dot { width: 14px; height: 14px; border-radius: 999px; background: #fff; border: 3px solid #0D9488; box-shadow: 0 2px 6px rgba(15,23,42,0.35); }
  .leaflet-popup-content { margin: 10px 12px; font-size: 12px; line-height: 1.4; color: #0F172A; }
  .map-badge { position: absolute; left: 10px; bottom: 10px; z-index: 900; background: rgba(255,255,255,0.94); border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 700; color: #0F172A; pointer-events: none; box-shadow: 0 1px 4px rgba(15,23,42,0.1); }
  .map-controls { position: absolute; right: 10px; top: 10px; z-index: 900; display: flex; gap: 6px; }
  .map-ctrl-btn { background: #fff; border: 1px solid #CBD5E1; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; color: #0F172A; cursor: pointer; box-shadow: 0 1px 4px rgba(15,23,42,0.12); }
  .map-ctrl-btn:hover { background: #F8FAFC; }
</style>
</head>
<body>
<div id="map"></div>
<div class="map-controls" id="builtin-controls" style="display:none">
  <button type="button" class="map-ctrl-btn" id="btn-focus-labs">Fokus Lab</button>
  <button type="button" class="map-ctrl-btn" id="btn-focus-user" style="display:none">Lokasi Saya</button>
</div>
<div class="map-badge" id="map-badge">Memuat peta laboratorium...</div>
<script>
  const DATA = ${payloadJson};
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  if (DATA.showBuiltInControls) {
    document.getElementById('builtin-controls').style.display = 'flex';
  }

  function postToHost(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (_) {}
  }

  function setBadge(text) {
    const el = document.getElementById('map-badge');
    if (el) el.textContent = text;
  }

  function computeSpreadLabs(rawLabs) {
    const list = Array.isArray(rawLabs) ? rawLabs : [];
    const placed = [];
    return list.map((lab) => {
      let sameCount = 0;
      placed.forEach((p) => {
        if (Math.abs(p.lat - lab.lat) < 0.00012 && Math.abs(p.lng - lab.lng) < 0.00012) sameCount++;
      });
      placed.push(lab);
      const angle = (sameCount - 1) * ((Math.PI * 2) / 4);
      const visualLat = sameCount > 0 ? lab.lat + Math.sin(angle) * 0.00032 : lab.lat;
      const visualLng = sameCount > 0 ? lab.lng + Math.cos(angle) * 0.00042 : lab.lng;
      const color = lab.status === 'ongoing' ? '#16A34A' : lab.status === 'upcoming' ? '#D97706' : '#475569';
      return { lab, visualLat, visualLng, color };
    });
  }

  const LEAFLET_CDNS = [
    {
      css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    },
    {
      css: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'.replace('.js', '.css'),
      js: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    },
    {
      css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
      js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    },
  ];

  let leafletLoadPromise = null;
  function ensureLeafletLoaded() {
    if (window.L && typeof window.L.map === 'function') {
      return Promise.resolve(window.L);
    }
    if (leafletLoadPromise) return leafletLoadPromise;

    leafletLoadPromise = new Promise((resolve, reject) => {
      let idx = 0;
      function tryNextCdn() {
        if (window.L && typeof window.L.map === 'function') {
          resolve(window.L);
          return;
        }
        if (idx >= LEAFLET_CDNS.length) {
          reject(new Error('ALL_LEAFLET_CDNS_FAILED'));
          return;
        }
        const cdn = LEAFLET_CDNS[idx++];
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cdn.css;
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = cdn.js;
        script.async = true;
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          tryNextCdn();
        }, 6000);
        script.onload = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (window.L && typeof window.L.map === 'function') resolve(window.L);
          else tryNextCdn();
        };
        script.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          tryNextCdn();
        };
        document.head.appendChild(script);
      }
      tryNextCdn();
    });
    return leafletLoadPromise;
  }

  let activeEngine = null; // 'google' | 'leaflet'
  let latestSyncMsg = {
    labs: DATA.labs,
    selectedLabId: null,
    target: null,
    user: null,
    routeCoords: [],
    simPoint: null,
  };
  let googleObserver = null;
  let googleBootTimer = null;
  let googleRecheckTimers = [];
  let leafletStarterRunning = false;

  function clearGoogleWatchdogs() {
    if (googleBootTimer) {
      clearTimeout(googleBootTimer);
      googleBootTimer = null;
    }
    googleRecheckTimers.forEach((t) => clearTimeout(t));
    googleRecheckTimers = [];
    if (googleObserver) {
      googleObserver.disconnect();
      googleObserver = null;
    }
  }

  window.__focusLabs = function() {};
  window.__focusUser = function() {};

  // ---- ENGINE 2: Leaflet dengan Multi-CDN & Auto-Fallback Tile (OSM -> CARTO -> Esri Satelit) ----
  let lMap = null;
  let lApplySync = null;

  function startLeafletEngine(fallbackMeta) {
    if (activeEngine === 'leaflet' || leafletStarterRunning) return;
    leafletStarterRunning = true;
    clearGoogleWatchdogs();
    activeEngine = 'leaflet';

    const oldMapEl = document.getElementById('map');
    if (oldMapEl && oldMapEl.parentNode) {
      const freshMapEl = document.createElement('div');
      freshMapEl.id = 'map';
      oldMapEl.parentNode.replaceChild(freshMapEl, oldMapEl);
    }
    setBadge(fallbackMeta ? 'Beralih ke Peta Leaflet...' : 'Memuat Peta Leaflet...');

    ensureLeafletLoaded()
      .then((L) => {
        leafletStarterRunning = false;
        if (activeEngine !== 'leaflet') return;

        const initialLabs = (latestSyncMsg && Array.isArray(latestSyncMsg.labs) && latestSyncMsg.labs.length > 0)
          ? latestSyncMsg.labs
          : DATA.labs;
        const firstCenter = initialLabs[0] || DATA.defaultCenter;

        lMap = L.map('map', { zoomControl: Boolean(DATA.showBuiltInControls) }).setView([firstCenter.lat, firstCenter.lng], 18);

        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 20,
          maxNativeZoom: 19,
          attribution: '&copy; OpenStreetMap',
        });
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20,
          maxNativeZoom: 19,
          attribution: '&copy; CARTO &copy; OpenStreetMap',
        });
        const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 20,
          maxNativeZoom: 19,
          attribution: '&copy; Esri Satellite',
        });

        let currentTileProvider = 'osm';
        let osmErrors = 0, osmLoads = 0;
        let cartoErrors = 0, cartoLoads = 0;
        let satErrors = 0, satLoads = 0;
        let tileFatalNotified = false;

        osmLayer.on('tileload', () => {
          osmLoads++;
          if (currentTileProvider === 'osm' && osmLoads === 1) {
            setBadge(fallbackMeta ? 'Leaflet (OSM) • Fallback Google' : 'Peta Lab (OpenStreetMap)');
          }
        });
        osmLayer.on('tileerror', () => {
          osmErrors++;
          if (currentTileProvider === 'osm' && osmErrors >= 3 && osmLoads === 0) {
            currentTileProvider = 'carto';
            if (lMap.hasLayer(osmLayer)) lMap.removeLayer(osmLayer);
            cartoLayer.addTo(lMap);
            setBadge('Peta Jalan (CARTO Auto-Fallback)');
            postToHost({
              type: 'MAP_STATUS',
              status: 'ready',
              engine: 'leaflet',
              tileProvider: 'carto',
              fallbackFrom: fallbackMeta ? 'google' : undefined,
              message: 'Tile OpenStreetMap dibatasi di jaringan ini, otomatis beralih ke peta CARTO.',
            });
          }
        });

        cartoLayer.on('tileload', () => {
          cartoLoads++;
          if (currentTileProvider === 'carto' && cartoLoads === 1) {
            setBadge('Peta Jalan (CARTO)');
          }
        });
        cartoLayer.on('tileerror', () => {
          cartoErrors++;
          if (currentTileProvider === 'carto' && cartoErrors >= 3 && cartoLoads === 0) {
            currentTileProvider = 'esri';
            if (lMap.hasLayer(cartoLayer)) lMap.removeLayer(cartoLayer);
            satLayer.addTo(lMap);
            setBadge('Peta Satelit (Esri Auto-Fallback)');
            postToHost({
              type: 'MAP_STATUS',
              status: 'ready',
              engine: 'leaflet',
              tileProvider: 'esri',
              fallbackFrom: fallbackMeta ? 'google' : undefined,
              message: 'Tile jalan tidak dapat dimuat, otomatis beralih ke mode Satelit Esri.',
            });
          }
        });

        satLayer.on('tileload', () => {
          satLoads++;
          if (currentTileProvider === 'esri' && satLoads === 1) {
            setBadge('Peta Satelit (Esri)');
          }
        });
        satLayer.on('tileerror', () => {
          satErrors++;
          if (currentTileProvider === 'esri' && satErrors >= 3 && satLoads === 0 && !tileFatalNotified) {
            tileFatalNotified = true;
            setBadge('Peta offline — hanya marker lab');
            postToHost({
              type: 'MAP_STATUS',
              status: 'tile_error',
              engine: 'leaflet',
              tileProvider: 'esri',
              message: 'Tile peta gagal dimuat (offline atau jaringan memblokir server peta). Marker lab tetap ditampilkan.',
            });
          }
        });

        osmLayer.addTo(lMap);
        L.control.layers(
          {
            'Peta Jalan (OSM)': osmLayer,
            'Peta Jalan (CARTO)': cartoLayer,
            'Satelit (Esri)': satLayer,
          },
          {},
          { position: 'topleft' }
        ).addTo(lMap);

        const markersLayer = L.layerGroup().addTo(lMap);
        let labBounds = [];
        const markersById = {};
        let selectedCircle = null;
        let hasFittedInitialLabs = false;
        let lastLabsSignature = '';

        function updateLeafletSelectedCircle(selectedId) {
          if (selectedCircle) {
            lMap.removeLayer(selectedCircle);
            selectedCircle = null;
          }
          const sel = selectedId ? markersById[selectedId] : null;
          if (sel) {
            selectedCircle = L.circle([sel.lab.lat, sel.lab.lng], {
              radius: sel.lab.radius,
              color: DATA.accent,
              weight: 2,
              fillColor: DATA.accent,
              fillOpacity: 0.12,
            }).addTo(lMap);
          }
        }

        function renderLeafletLabs(labsList, selectedId) {
          const sig = JSON.stringify((labsList || []).map((l) => [l.id, l.lat, l.lng, l.radius, l.status, l.statusLabel]));
          if (sig === lastLabsSignature && Object.keys(markersById).length > 0) return;
          lastLabsSignature = sig;

          markersLayer.clearLayers();
          Object.keys(markersById).forEach((k) => delete markersById[k]);
          labBounds = [];

          const spread = computeSpreadLabs(labsList);
          spread.forEach(({ lab, visualLat, visualLng, color }) => {
            labBounds.push([lab.lat, lab.lng]);
            labBounds.push([visualLat, visualLng]);

            const isSel = lab.id === selectedId;
            const activeColor = isSel ? DATA.accent : color;

            const icon = L.divIcon({
              className: '',
              html: '<div class="lab-pin ' + (isSel ? 'selected' : '') + '" style="background:' + activeColor + '">' + esc(lab.kode) + '</div>',
              iconSize: [64, 28],
              iconAnchor: [32, 14],
            });
            const marker = L.marker([visualLat, visualLng], { icon }).addTo(markersLayer);
            marker.bindPopup(
              '<strong>' + esc(lab.nama) + '</strong><br/>' +
              esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) + ' m<br/>' +
              '<span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span>'
            );
            marker.on('click', () => {
              postToHost({ type: 'SELECT_LAB', labId: lab.id });
            });
            markersById[lab.id] = { marker, color, lab };
          });

          updateLeafletSelectedCircle(selectedId);

          if (!hasFittedInitialLabs && labBounds.length > 0) {
            hasFittedInitialLabs = true;
            window.__focusLabs();
          }
        }

        window.__focusLabs = function() {
          if (labBounds.length > 1) lMap.fitBounds(labBounds, { padding: [45, 45], maxZoom: 18 });
          else if (labBounds.length === 1) lMap.setView(labBounds[0], 18);
          else lMap.setView([DATA.defaultCenter.lat, DATA.defaultCenter.lng], 18);
        };

        let userMarker = null;
        let userAccCircle = null;
        let routeLine = null;
        let simMarker = null;
        let lastUser = null;

        window.__focusUser = function() {
          if (lastUser) lMap.setView([lastUser.lat, lastUser.lng], 17);
        };

        document.getElementById('btn-focus-labs').onclick = window.__focusLabs;
        document.getElementById('btn-focus-user').onclick = window.__focusUser;

        lApplySync = (msg) => {
          if (!msg) return;
          if (Array.isArray(msg.labs)) {
            renderLeafletLabs(msg.labs, msg.selectedLabId);
          }

          Object.keys(markersById).forEach((id) => {
            const entry = markersById[id];
            const isSel = id === msg.selectedLabId;
            const bg = isSel ? DATA.accent : entry.color;
            entry.marker.setIcon(L.divIcon({
              className: '',
              html: '<div class="lab-pin ' + (isSel ? 'selected' : '') + '" style="background:' + bg + '">' + esc(entry.lab.kode) + '</div>',
              iconSize: [64, 28],
              iconAnchor: [32, 14],
            }));
          });
          updateLeafletSelectedCircle(msg.selectedLabId);

          lastUser = msg.user || null;
          const btnUser = document.getElementById('btn-focus-user');
          if (msg.user) {
            if (btnUser && DATA.showBuiltInControls) btnUser.style.display = 'inline-block';
            if (!userMarker) {
              userAccCircle = L.circle([msg.user.lat, msg.user.lng], {
                radius: Math.min(msg.user.acc || 25, 100),
                color: '#2563EB',
                weight: 1,
                fillOpacity: 0.15,
              }).addTo(lMap);
              userMarker = L.marker([msg.user.lat, msg.user.lng], {
                icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
              }).addTo(lMap).bindPopup('Lokasi Perangkat Anda');
            } else {
              userMarker.setLatLng([msg.user.lat, msg.user.lng]);
              userAccCircle.setLatLng([msg.user.lat, msg.user.lng]);
              userAccCircle.setRadius(Math.min(msg.user.acc || 25, 100));
            }
          } else {
            if (btnUser) btnUser.style.display = 'none';
            if (userMarker) { lMap.removeLayer(userMarker); userMarker = null; }
            if (userAccCircle) { lMap.removeLayer(userAccCircle); userAccCircle = null; }
          }

          const pts = Array.isArray(msg.routeCoords) && msg.routeCoords.length >= 2
            ? msg.routeCoords.map((p) => [p.latitude, p.longitude])
            : msg.user && msg.target
            ? [[msg.user.lat, msg.user.lng], [msg.target.lat, msg.target.lng]]
            : [];

          if (pts.length >= 2) {
            if (!routeLine) routeLine = L.polyline(pts, { color: DATA.accent, weight: 3, dashArray: '6,6' }).addTo(lMap);
            else routeLine.setLatLngs(pts);
          } else if (routeLine) {
            lMap.removeLayer(routeLine);
            routeLine = null;
          }

          if (msg.simPoint) {
            const sp = [msg.simPoint.latitude, msg.simPoint.longitude];
            if (!simMarker) {
              simMarker = L.marker(sp, {
                icon: L.divIcon({ className: '', html: '<div class="sim-dot" style="border-color:' + DATA.accent + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
              }).addTo(lMap);
            } else {
              simMarker.setLatLng(sp);
            }
          } else if (simMarker) {
            lMap.removeLayer(simMarker);
            simMarker = null;
          }
        };

        renderLeafletLabs(initialLabs, latestSyncMsg ? latestSyncMsg.selectedLabId : null);
        if (latestSyncMsg) lApplySync(latestSyncMsg);

        setBadge(fallbackMeta ? 'Leaflet (OSM) • Fallback Google' : 'Peta Lab (OpenStreetMap)');
        postToHost({
          type: 'MAP_STATUS',
          status: fallbackMeta ? 'fallback' : 'ready',
          engine: 'leaflet',
          tileProvider: 'osm',
          fallbackFrom: fallbackMeta ? 'google' : undefined,
          reason: fallbackMeta ? fallbackMeta.reason : undefined,
          message: fallbackMeta
            ? fallbackMeta.message
            : 'Peta Leaflet aktif.',
        });
      })
      .catch(() => {
        leafletStarterRunning = false;
        setBadge('Peta gagal dimuat');
        postToHost({
          type: 'MAP_STATUS',
          status: 'error',
          engine: 'none',
          reason: 'leaflet_cdn_failed',
          message: 'Gagal memuat library peta dari CDN. Periksa koneksi internet Anda lalu muat ulang.',
        });
      });
  }

  // ---- ENGINE 1: Google Maps JS API (Utama bila key aktif & lolos validasi, fallback otomatis ke Leaflet) ----
  let gApplySync = null;

  function fallbackFromGoogle(reason, message) {
    if (activeEngine === 'leaflet') return;
    startLeafletEngine({ reason, message });
  }

  function hasGoogleMapsErrorDom() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return null;
    if (mapEl.querySelector('.gm-err-container') || mapEl.querySelector('.dismissButton')) {
      const txt = (mapEl.innerText || '').trim();
      if (/limit reached/i.test(txt)) {
        return { reason: 'google_demo_limit', message: 'Kuota harian Google Maps Demo Key habis. Beralih otomatis ke peta Leaflet.' };
      }
      if (/for development purposes only/i.test(txt)) {
        return { reason: 'google_billing_required', message: 'Google Maps memerlukan Cloud Billing aktif. Beralih otomatis ke peta Leaflet.' };
      }
      return { reason: 'google_dom_error', message: 'Google Maps gagal memuat peta dengan benar. Beralih otomatis ke peta Leaflet.' };
    }
    const text = mapEl.innerText || '';
    if (/can't load google maps|halaman ini tidak dapat memuat google maps|oops! something went wrong|ups! terjadi masalah|maps demo key|limit reached|for development purposes only|keperluan pengembangan|billingnotenabled|apinotactivated|referernotallowed|invalidkeymaperror|overquerylimit/i.test(text)) {
      return { reason: 'google_text_error', message: 'Google Maps dibatasi atau melebihi kuota. Beralih otomatis ke peta Leaflet.' };
    }
    return null;
  }

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
    if (googleBootTimer) {
      clearTimeout(googleBootTimer);
      googleBootTimer = null;
    }

    const immediateErr = hasGoogleMapsErrorDom();
    if (immediateErr) {
      fallbackFromGoogle(immediateErr.reason, immediateErr.message);
      return;
    }

    activeEngine = 'google';
    setBadge('Google Maps — Lab FSM UNDIP');

    const mapEl = document.getElementById('map');
    googleObserver = new MutationObserver(() => {
      const detected = hasGoogleMapsErrorDom();
      if (detected) fallbackFromGoogle(detected.reason, detected.message);
    });
    googleObserver.observe(mapEl, { childList: true, subtree: true, characterData: true });

    googleRecheckTimers.push(
      setTimeout(() => {
        const detected = hasGoogleMapsErrorDom();
        if (detected) fallbackFromGoogle(detected.reason, detected.message);
      }, 900),
      setTimeout(() => {
        const detected = hasGoogleMapsErrorDom();
        if (detected) fallbackFromGoogle(detected.reason, detected.message);
      }, 2500)
    );

    const initialLabs = (latestSyncMsg && Array.isArray(latestSyncMsg.labs) && latestSyncMsg.labs.length > 0)
      ? latestSyncMsg.labs
      : DATA.labs;
    const firstCenter = initialLabs[0] || DATA.defaultCenter;

    const map = new google.maps.Map(mapEl, {
      center: { lat: firstCenter.lat, lng: firstCenter.lng },
      zoom: 18,
      mapTypeControl: true,
      cameraControl: false,
      zoomControl: false,
      keyboardShortcuts: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const infoWin = new google.maps.InfoWindow();
    const gMarkers = {};
    let gSelectedCircle = null;
    let gBounds = new google.maps.LatLngBounds();
    let hasFittedGoogleLabs = false;
    let lastGoogleSignature = '';

    function updateGoogleSelectedCircle(selectedId) {
      if (gSelectedCircle) {
        gSelectedCircle.setMap(null);
        gSelectedCircle = null;
      }
      const sel = selectedId ? gMarkers[selectedId] : null;
      if (sel) {
        gSelectedCircle = new google.maps.Circle({
          map,
          center: { lat: sel.lab.lat, lng: sel.lab.lng },
          radius: sel.lab.radius,
          strokeColor: DATA.accent,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: DATA.accent,
          fillOpacity: 0.12,
        });
      }
    }

    function renderGoogleLabs(labsList, selectedId) {
      const sig = JSON.stringify((labsList || []).map((l) => [l.id, l.lat, l.lng, l.radius, l.status, l.statusLabel]));
      if (sig === lastGoogleSignature && Object.keys(gMarkers).length > 0) return;
      lastGoogleSignature = sig;

      Object.keys(gMarkers).forEach((k) => { gMarkers[k].marker.setMap(null); delete gMarkers[k]; });
      gBounds = new google.maps.LatLngBounds();

      const spread = computeSpreadLabs(labsList);
      spread.forEach(({ lab, visualLat, visualLng, color }) => {
        gBounds.extend({ lat: lab.lat, lng: lab.lng });
        gBounds.extend({ lat: visualLat, lng: visualLng });
        const isSel = lab.id === selectedId;
        const activeColor = isSel ? DATA.accent : color;

        const marker = new google.maps.Marker({
          map,
          position: { lat: visualLat, lng: visualLng },
          title: lab.nama,
          icon: makeSvgPin(lab.kode, activeColor, isSel),
        });
        marker.addListener('click', () => {
          infoWin.setContent(
            '<div style="font-family:sans-serif;font-size:12px;line-height:1.4;color:#0F172A"><strong>' +
            esc(lab.nama) + '</strong><br/>' + esc(lab.gedung) + '<br/>Radius: ' + esc(lab.radius) +
            ' m<br/><span style="color:' + color + ';font-weight:700">' + esc(lab.statusLabel) + '</span></div>'
          );
          infoWin.open(map, marker);
          postToHost({ type: 'SELECT_LAB', labId: lab.id });
        });
        gMarkers[lab.id] = { marker, color, lab };
      });

      updateGoogleSelectedCircle(selectedId);

      if (!hasFittedGoogleLabs && spread.length > 0) {
        hasFittedGoogleLabs = true;
        window.__focusLabs();
      }
    }

    window.__focusLabs = function() {
      const count = Object.keys(gMarkers).length;
      if (count > 1) {
        map.fitBounds(gBounds, 40);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (map.getZoom() > 18) map.setZoom(18);
        });
      } else {
        map.setCenter({ lat: firstCenter.lat, lng: firstCenter.lng });
        map.setZoom(18);
      }
    };

    let gUserMarker = null, gUserCircle = null, gRouteLine = null, gSimMarker = null, lastUser = null;
    window.__focusUser = function() {
      if (lastUser) {
        map.panTo({ lat: lastUser.lat, lng: lastUser.lng });
        map.setZoom(17);
      }
    };

    document.getElementById('btn-focus-labs').onclick = window.__focusLabs;
    document.getElementById('btn-focus-user').onclick = window.__focusUser;

    gApplySync = (msg) => {
      if (activeEngine !== 'google' || !msg) return;
      if (Array.isArray(msg.labs)) {
        renderGoogleLabs(msg.labs, msg.selectedLabId);
      }

      Object.keys(gMarkers).forEach((id) => {
        const m = gMarkers[id];
        const isSel = id === msg.selectedLabId;
        const bg = isSel ? DATA.accent : m.color;
        m.marker.setIcon(makeSvgPin(m.lab.kode, bg, isSel));
      });
      updateGoogleSelectedCircle(msg.selectedLabId);

      lastUser = msg.user || null;
      const btnUser = document.getElementById('btn-focus-user');
      if (msg.user) {
        if (btnUser && DATA.showBuiltInControls) btnUser.style.display = 'inline-block';
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
      } else {
        if (btnUser) btnUser.style.display = 'none';
        if (gUserMarker) { gUserMarker.setMap(null); gUserMarker = null; }
        if (gUserCircle) { gUserCircle.setMap(null); gUserCircle = null; }
      }

      const path = Array.isArray(msg.routeCoords) && msg.routeCoords.length >= 2
        ? msg.routeCoords.map((p) => ({ lat: p.latitude, lng: p.longitude }))
        : msg.user && msg.target
        ? [{ lat: msg.user.lat, lng: msg.user.lng }, { lat: msg.target.lat, lng: msg.target.lng }]
        : [];

      if (path.length >= 2) {
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
      } else if (gRouteLine) {
        gRouteLine.setMap(null);
        gRouteLine = null;
      }

      if (msg.simPoint) {
        const sp = { lat: msg.simPoint.latitude, lng: msg.simPoint.longitude };
        if (!gSimMarker) {
          gSimMarker = new google.maps.Marker({
            map,
            position: sp,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#FFFFFF',
              fillOpacity: 1,
              strokeColor: DATA.accent,
              strokeWeight: 3,
            },
          });
        } else {
          gSimMarker.setPosition(sp);
        }
      } else if (gSimMarker) {
        gSimMarker.setMap(null);
        gSimMarker = null;
      }
    };

    renderGoogleLabs(initialLabs, latestSyncMsg ? latestSyncMsg.selectedLabId : null);
    if (latestSyncMsg) gApplySync(latestSyncMsg);

    postToHost({
      type: 'MAP_STATUS',
      status: 'ready',
      engine: 'google',
      message: 'Google Maps aktif.',
    });
  };

  window.gm_authFailure = function() {
    fallbackFromGoogle(
      'google_auth_failure',
      'Autentikasi Google Maps gagal (perlu billing / API aktif / kuota Demo Key habis). Beralih otomatis ke peta Leaflet.'
    );
  };

  window.__syncLabMapState = function(msg) {
    if (!msg) return;
    latestSyncMsg = msg;
    if (activeEngine === 'google' && gApplySync) gApplySync(msg);
    else if (activeEngine === 'leaflet' && lApplySync) lApplySync(msg);
  };

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'SYNC_MAP_STATE') window.__syncLabMapState(msg);
  });

  if (DATA.googleMapsApiKey) {
    setBadge('Menghubungkan Google Maps...');
    const gs = document.createElement('script');
    gs.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(DATA.googleMapsApiKey) + '&loading=async&callback=__onGoogleMapsReady';
    gs.async = true;
    gs.defer = true;
    gs.onerror = () => {
      fallbackFromGoogle(
        'google_script_error',
        'Script Google Maps gagal dimuat. Beralih otomatis ke peta Leaflet.'
      );
    };
    document.head.appendChild(gs);
    googleBootTimer = setTimeout(() => {
      if (!activeEngine) {
        fallbackFromGoogle(
          'google_timeout',
          'Google Maps tidak merespons tepat waktu. Beralih otomatis ke peta Leaflet.'
        );
      }
    }, 3500);
  } else {
    startLeafletEngine(null);
  }
</script>
</body>
</html>`;
}

/** Alias kompatibilitas bila pemanggil tidak memerlukan Google Maps API key. */
export function buildLeafletMapHtml(params: {
  labs: LeafletLabPayload[];
  defaultCenter: { lat: number; lng: number };
  accentColor: string;
  zonePolygon?: { latitude: number; longitude: number }[];
}): string {
  return buildHybridMapHtml(params);
}
