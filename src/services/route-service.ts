/**
 * PPK LabPortal — Route & Polyline Service
 * Mengambil koordinat rute jalan kaki menuju laboratorium menggunakan Google Routes API
 * dengan fallback aman ke garis lurus jika Routes API belum diaktifkan atau perangkat offline.
 */

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: RouteCoordinate[];
  isFallbackDirectLine: boolean;
}

/**
 * Mendekode encoded polyline string dari Google Routes API menjadi array koordinat LatLng.
 */
export function decodePolyline(encoded: string): RouteCoordinate[] {
  const points: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

/**
 * Mengambil rute jalan kaki dari posisi pengguna menuju lokasi laboratorium yang dipilih.
 */
export async function getRouteCoordinates(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<RouteResult> {
  const fallback: RouteResult = {
    coordinates: [origin, destination],
    isFallbackDirectLine: true,
  };

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: 'WALK',
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const json = (await response.json()) as {
      routes?: { polyline?: { encodedPolyline?: string } }[];
    };
    const encoded = json.routes?.[0]?.polyline?.encodedPolyline;
    if (!encoded) {
      return fallback;
    }

    const decoded = decodePolyline(encoded);
    if (decoded.length < 2) {
      return fallback;
    }

    return {
      coordinates: decoded,
      isFallbackDirectLine: false,
    };
  } catch {
    return fallback;
  }
}
