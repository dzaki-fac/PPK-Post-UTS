import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import {
  createPaymentTransaction,
  reconcilePaymentStatus,
  subscribeFineById,
  subscribePaymentById,
} from '@/services/payment-service';
import { FineDocument, PaymentDocument } from '@/types/praktikum';
import { formatRupiah } from '@/utils/format';
import { formatWib } from '@/utils/wib';

export default function PraktikanPembayaranHasilScreen() {
  const params = useLocalSearchParams<{ fineId?: string; paymentId?: string }>();
  const fineId = Array.isArray(params.fineId) ? params.fineId[0] : params.fineId || '';
  const paymentId = Array.isArray(params.paymentId)
    ? params.paymentId[0]
    : params.paymentId || '';

  const [payment, setPayment] = useState<PaymentDocument | null>(null);
  const [fine, setFine] = useState<FineDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(paymentId || fineId));
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const effectiveFineId = fineId || payment?.fineId || '';

  const triggerReconcile = useCallback(async () => {
    if (!paymentId) return;
    setChecking(true);
    try {
      await reconcilePaymentStatus(paymentId);
    } finally {
      setNowMs(Date.now());
      setChecking(false);
    }
  }, [paymentId]);

  useEffect(() => {
    const unsubPayment = paymentId
      ? subscribePaymentById(
          paymentId,
          (doc) => {
            setPayment(doc);
            setLoading(false);
          },
          (err) => {
            setLoading(false);
            setErrorMessage(err.message || 'Gagal memuat status pembayaran.');
          }
        )
      : () => {};

    const unsubFine = effectiveFineId
      ? subscribeFineById(effectiveFineId, (doc) => {
          setFine(doc);
          if (!paymentId) setLoading(false);
        })
      : () => {};

    return () => {
      unsubPayment();
      unsubFine();
    };
  }, [paymentId, effectiveFineId]);

  useEffect(() => {
    if (!paymentId) return;
    void reconcilePaymentStatus(paymentId).finally(() => {
      setNowMs(Date.now());
    });

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void triggerReconcile();
      }
    });

    return () => subscription.remove();
  }, [paymentId, triggerReconcile]);

  const handleOpenPendingSnap = async () => {
    if (!payment?.redirectUrl) return;
    if (Platform.OS === 'web') {
      await Linking.openURL(payment.redirectUrl);
    } else {
      await WebBrowser.openBrowserAsync(payment.redirectUrl);
    }
    triggerReconcile();
  };

  const handleRetryPayment = async () => {
    if (!effectiveFineId || retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      const response = await createPaymentTransaction(effectiveFineId);
      if (Platform.OS === 'web') {
        await Linking.openURL(response.redirectUrl);
      } else {
        await WebBrowser.openBrowserAsync(response.redirectUrl);
      }
      router.replace(
        `/praktikan/pembayaran-hasil?fineId=${encodeURIComponent(
          effectiveFineId
        )}&paymentId=${encodeURIComponent(response.paymentId)}` as Href
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal membuat ulang transaksi pembayaran.'
      );
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memeriksa status transaksi di server...</Text>
      </View>
    );
  }

  if (!payment && !fine) {
    return (
      <View style={styles.page}>
        <View style={styles.container}>
          <EmptyState
            title="Data Transaksi Tidak Ditemukan"
            message="ID transaksi atau tagihan tidak tersedia."
            actionText="Kembali ke Tagihan"
            onAction={() => router.replace('/praktikan/tagihan' as Href)}
          />
        </View>
      </View>
    );
  }

  const resolvedStatus =
    payment?.status === 'success' || fine?.status === 'paid'
      ? 'success'
      : payment?.status === 'failed'
      ? 'failed'
      : 'pending';

  const isExpiredRedirect =
    Boolean(payment?.expiresAt) &&
    new Date(payment!.expiresAt).getTime() <= nowMs;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>
              {payment?.invoiceNumber || fine?.invoiceNumber || 'VERIFIKASI PEMBAYARAN'}
            </Text>
            <Text style={styles.title}>
              {resolvedStatus === 'success'
                ? 'Pembayaran Berhasil'
                : resolvedStatus === 'failed'
                ? 'Pembayaran Gagal'
                : 'Menunggu Verifikasi'}
            </Text>
          </View>
          <StatusBadge status={resolvedStatus} />
        </View>

        <View
          style={[
            styles.statusBanner,
            resolvedStatus === 'success'
              ? styles.bannerSuccess
              : resolvedStatus === 'failed'
              ? styles.bannerFailed
              : styles.bannerPending,
          ]}>
          <Text style={styles.bannerTitle}>
            {resolvedStatus === 'success'
              ? 'Tagihan denda telah lunas dan diverifikasi oleh server.'
              : resolvedStatus === 'failed'
              ? payment?.failureReason ||
                'Transaksi dibatalkan atau kedaluwarsa di Midtrans.'
              : 'Status transaksi sedang disinkronkan dengan webhook dan Status API Midtrans.'}
          </Text>
          <Text style={styles.bannerDesc}>
            Status pembayaran ditentukan sepenuhnya oleh webhook server dan Status API
            Midtrans, bukan dari penutupan halaman browser.
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <Row
            label="Praktikum"
            value={payment?.praktikum || fine?.praktikum || '-'}
          />
          <Row label="Order ID" value={payment?.id || '-'} />
          <Row
            label="Nominal"
            value={formatRupiah(payment?.amount ?? fine?.amount ?? 0)}
          />
          {payment?.paymentType ? (
            <Row label="Metode Bayar" value={payment.paymentType.toUpperCase()} />
          ) : null}
          {payment?.settledAt ? (
            <Row label="Waktu Lunas" value={formatWib(payment.settledAt)} />
          ) : null}
          {payment?.expiresAt && resolvedStatus === 'pending' ? (
            <Row label="Batas Waktu Snap" value={formatWib(payment.expiresAt)} />
          ) : null}
          <Row label="Status Kehadiran" value="Terlambat (tidak berubah)" />
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actionsCol}>
          {resolvedStatus === 'pending' ? (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={checking}
                onPress={triggerReconcile}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  checking && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}>
                {checking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Periksa Status Sekarang</Text>
                )}
              </Pressable>

              {payment?.redirectUrl && !isExpiredRedirect ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleOpenPendingSnap}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                  <Text style={styles.secondaryBtnText}>Lanjutkan di Midtrans Snap</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {resolvedStatus === 'failed' ? (
            <Pressable
              accessibilityRole="button"
              disabled={retrying}
              onPress={handleRetryPayment}
              style={({ pressed }) => [
                styles.primaryBtn,
                retrying && styles.disabledBtn,
                pressed && styles.pressed,
              ]}>
              {retrying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Coba Lagi</Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.replace(
                (effectiveFineId
                  ? `/praktikan/tagihan/${effectiveFineId}`
                  : '/praktikan/tagihan') as Href
              )
            }
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
            <Text style={styles.secondaryBtnText}>Kembali ke Rincian Tagihan</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/praktikan/riwayat-pembayaran' as Href)}
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
            <Text style={styles.ghostBtnText}>Lihat Riwayat Pembayaran</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  bannerSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  bannerPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  bannerFailed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  detailGrid: {
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    flex: 1.3,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
  },
  actionsCol: {
    gap: 10,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '700',
  },
  ghostBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ghostBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.85,
  },
});
