import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { BreadcrumbBack, PAYMENT_COLORS } from '@/components/payment-ui';
import {
  createPaymentSession,
  fetchPaymentFromServer,
  openPaymentPage,
  subscribePayment,
} from '@/services/payment-service';
import type { PaymentDocument } from '@/types/finance';
import { formatPaymentType, formatRupiah, formatWibDateTime } from '@/utils/payment-format';

/**
 * Status di halaman ini SELALU dibaca dari Firestore (hasil webhook terverifikasi backend).
 * Menutup browser atau kembali ke aplikasi tidak pernah dianggap sebagai pembayaran berhasil.
 */
export default function PraktikanPembayaranHasilScreen() {
  const params = useLocalSearchParams<{ fineId?: string; paymentId?: string }>();
  const paymentId = Array.isArray(params.paymentId) ? params.paymentId[0] : params.paymentId;
  const fineId = Array.isArray(params.fineId) ? params.fineId[0] : params.fineId;

  const [payment, setPayment] = useState<PaymentDocument | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    return subscribePayment(
      paymentId,
      (data) => {
        setPayment(data);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
  }, [paymentId]);

  // Saat aplikasi kembali aktif (mis. setelah browser pembayaran ditutup) baca ulang dari server.
  useEffect(() => {
    if (!paymentId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      fetchPaymentFromServer(paymentId)
        .then((data) => {
          if (data) setPayment(data);
        })
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [paymentId]);

  const handleRetry = useCallback(async () => {
    const targetFineId = payment?.fineId || fineId;
    if (!targetFineId) return;
    setRetrying(true);
    try {
      const result = await createPaymentSession(targetFineId);
      router.replace({
        pathname: '/praktikan/pembayaran-hasil',
        params: { fineId: targetFineId, paymentId: result.paymentId },
      } as unknown as Href);
      await openPaymentPage(result.redirectUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pembayaran gagal diproses.');
    } finally {
      setRetrying(false);
    }
  }, [payment?.fineId, fineId]);

  const detailHref = (payment?.fineId || fineId
    ? `/praktikan/tagihan/${payment?.fineId || fineId}`
    : '/praktikan/tagihan') as Href;

  if (!paymentId) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <EmptyState
            title="Transaksi Tidak Ditemukan"
            message="Buka halaman ini dari rincian tagihan untuk melihat status pembayaran."
            actionText="Ke Tagihan"
            onAction={() => router.replace('/praktikan/tagihan' as Href)}
          />
        </View>
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PAYMENT_COLORS.accent} />
      </View>
    );
  }

  const status = payment?.status ?? 'pending';
  const theme =
    status === 'success'
      ? { ...PAYMENT_COLORS.success, border: '#BBF7D0', title: 'Pembayaran Berhasil' }
      : status === 'failed'
        ? { ...PAYMENT_COLORS.danger, border: '#FECACA', title: 'Pembayaran Gagal' }
        : { ...PAYMENT_COLORS.warning, border: '#FDE68A', title: 'Menunggu Verifikasi' };

  const description =
    status === 'success'
      ? 'Pembayaran telah diverifikasi server. Tagihan berstatus Lunas dan status kehadiran Anda tidak berubah.'
      : status === 'failed'
        ? 'Transaksi gagal, ditolak, atau kedaluwarsa. Tagihan kembali Belum Dibayar dan dapat dibayar ulang dengan transaksi baru.'
        : 'Server belum menerima konfirmasi pembayaran. Halaman ini diperbarui otomatis setelah pembayaran terverifikasi. Menutup halaman pembayaran tidak berarti pembayaran berhasil.';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <BreadcrumbBack label="Kembali ke Rincian Tagihan" fallback={detailHref} />

          <View style={[styles.statusCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.statusDot, { color: theme.dot }]}>●</Text>
            <Text style={[styles.statusTitle, { color: theme.text }]}>{theme.title}</Text>
            <Text style={styles.statusDescription}>{description}</Text>
          </View>

          {payment ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Detail Transaksi</Text>
              {[
                { label: 'Praktikum', value: payment.praktikum },
                { label: 'Nomor Pesanan', value: payment.id },
                { label: 'Nominal', value: formatRupiah(payment.amount) },
                { label: 'Metode', value: formatPaymentType(payment.paymentType) },
                {
                  label: 'Waktu Transaksi',
                  value: formatWibDateTime(payment.settledAt ?? payment.createdAt),
                },
              ].map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="Data Transaksi Belum Tersedia"
              message="Transaksi belum terbaca dari server. Periksa koneksi internet Anda."
            />
          )}

          {status === 'failed' ? (
            <Pressable
              accessibilityRole="button"
              disabled={retrying}
              onPress={() => void handleRetry()}
              style={({ pressed }) => [styles.primaryButton, (pressed || retrying) && styles.pressed]}>
              {retrying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Coba Lagi →</Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(detailHref)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Lihat Rincian Tagihan →</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/praktikan/riwayat-pembayaran' as Href)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Lihat Riwayat Pembayaran →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={errorMessage !== null}
        title="Pembayaran Gagal Diproses"
        description={errorMessage ?? ''}
        confirmText="Mengerti"
        confirmVariant="danger"
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAYMENT_COLORS.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAYMENT_COLORS.canvas },
  scroll: { paddingBottom: 100 },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 12,
    gap: 14,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  statusDot: { fontSize: 18 },
  statusTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  statusDescription: { fontSize: 13, lineHeight: 20, color: PAYMENT_COLORS.textSecondary },
  card: {
    backgroundColor: PAYMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: PAYMENT_COLORS.border,
  },
  rowLabel: { fontSize: 12.5, color: PAYMENT_COLORS.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 13, color: PAYMENT_COLORS.textSecondary, fontWeight: '700', flex: 1, textAlign: 'right' },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: PAYMENT_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: PAYMENT_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 13.5, fontWeight: '700', color: PAYMENT_COLORS.textSecondary },
  pressed: { opacity: 0.85 },
});
