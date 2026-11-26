/**
 * Helper pemformatan & normalisasi nilai domain LabPortal.
 */

const RUPIAH_NUMBER_FORMAT = new Intl.NumberFormat('id-ID');

/**
 * Memformat angka integer ke format Rupiah Indonesia, misal 10000 -> "Rp 10.000".
 */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp 0';
  }
  const rounded = Math.round(amount);
  const absFormatted = RUPIAH_NUMBER_FORMAT.format(Math.abs(rounded));
  return rounded < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

export function normalizeEmailLower(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeNim(nim: string): string {
  return nim.trim().replace(/\s+/g, '');
}

/**
 * Menjaga document ID Firestore bebas karakter invalid (`/`, spasi berlebih).
 */
export function sanitizeDocKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeKodeLab(kode: string): string {
  return kode.trim().toUpperCase().replace(/\s+/g, '-');
}
