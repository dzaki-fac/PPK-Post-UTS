const QR_PREFIX = 'LABPORTAL_QR:';

export interface ParsedSessionQrPayload {
  sessionId: string;
  kodeSesi: string;
}

/**
 * Membangun payload QR Code terstruktur untuk sesi praktikum aktif.
 * Format: LABPORTAL_QR:<sessionId>:<kodeSesi>
 */
export function buildSessionQrPayload(sessionId: string, kodeSesi: string): string {
  return `${QR_PREFIX}${sessionId.trim()}:${kodeSesi.trim()}`;
}

/**
 * Mem-parsing payload QR Code hasil pemindaian kamera praktikan.
 * Mendukung format standar LABPORTAL_QR:<sessionId>:<kodeSesi> dan fallback JSON.
 */
export function parseSessionQrPayload(raw: string): ParsedSessionQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(QR_PREFIX)) {
    const body = trimmed.slice(QR_PREFIX.length);
    const lastColon = body.lastIndexOf(':');
    if (lastColon <= 0) return null;

    const sessionId = body.slice(0, lastColon).trim();
    const kodeSesi = body.slice(lastColon + 1).trim();
    if (!sessionId || !/^\d{4}$/.test(kodeSesi)) {
      return null;
    }
    return { sessionId, kodeSesi };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<ParsedSessionQrPayload>;
    if (
      typeof parsed.sessionId === 'string' &&
      parsed.sessionId.trim().length > 0 &&
      typeof parsed.kodeSesi === 'string' &&
      /^\d{4}$/.test(parsed.kodeSesi.trim())
    ) {
      return {
        sessionId: parsed.sessionId.trim(),
        kodeSesi: parsed.kodeSesi.trim(),
      };
    }
  } catch {
    // Bukan format JSON
  }

  return null;
}
