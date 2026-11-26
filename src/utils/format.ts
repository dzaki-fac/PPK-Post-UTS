/**
 * Memformat nominal bilangan menjadi format mata uang Rupiah Indonesia ("Rp 10.000").
 */
export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  try {
    return `Rp ${new Intl.NumberFormat('id-ID').format(safe)}`;
  } catch {
    return `Rp ${safe}`;
  }
}

