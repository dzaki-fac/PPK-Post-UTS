import { router, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import {
  FilterChips,
  MetricsGrid,
  PAYMENT_COLORS,
  PaymentStatusBadge,
  type FilterOption,
} from '@/components/payment-ui';
import { useAuth } from '@/context/auth-context';
import { useStudentFines, useStudentPayments } from '@/hooks/use-student-finance';
import type { PaymentDocument, PaymentStatus } from '@/types/finance';
import {
  formatPaymentType,
  formatRupiah,
  formatWibDate,
  formatWibDateTime,
} from '@/utils/payment-format';

type PaymentFilter = 'all' | PaymentStatus;

const FILTERS: FilterOption<PaymentFilter>[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'success', label: 'Berhasil' },
  { key: 'failed', label: 'Gagal' },
];

export default function PraktikanRiwayatPembayaranScreen() {
  const { user, userDoc } = useAuth();
  const uid = userDoc?.uid || user?.uid;
  const { items: payments, loading, fromCache, error } = useStudentPayments(uid);
  const { items: fines } = useStudentFines(uid);
  const [filter, setFilter] = useState<PaymentFilter>('all');

  const fineDateById = useMemo(() => {
    const map = new Map<string, string>();
    fines.forEach((fine) => map.set(fine.id, fine.createdAt));
    return map;
  }, [fines]);

  const summary = useMemo(() => {
    const success = payments.filter((item) => item.status === 'success');
    return {
      total: payments.length,
      pending: payments.filter((item) => item.status === 'pending').length,
      success: success.length,
      failed: payments.filter((item) => item.status === 'failed').length,
      paidAmount: success.reduce((total, item) => total + item.amount, 0),
    };
  }, [payments]);

  const visible = useMemo(
    () => (filter === 'all' ? payments : payments.filter((item) => item.status === filter)),
    [payments, filter]
  );

  const renderItem = ({ item }: { item: PaymentDocument }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Detail transaksi ${item.praktikum}`}
      onPress={() =>
        router.push({
          pathname: '/praktikan/pembayaran-hasil',
          params: { fineId: item.fineId, paymentId: item.id },
        } as unknown as Href)
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.praktikum}
        </Text>
        <PaymentStatusBadge status={item.status} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Tanggal Tagihan</Text>
          <Text style={styles.metaValue}>
            {formatWibDate(fineDateById.get(item.fineId) ?? item.createdAt)}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Nominal</Text>
          <Text style={[styles.metaValue, styles.amount]}>{formatRupiah(item.amount)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Waktu Transaksi</Text>
          <Text style={styles.metaValue}>{formatWibDateTime(item.settledAt ?? item.createdAt)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Metode</Text>
          <Text style={styles.metaValue}>{formatPaymentType(item.paymentType)}</Text>
        </View>
      </View>

      <Text style={styles.orderId}>Pesanan {item.id}</Text>
    </Pressable>
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>RIWAYAT PEMBAYARAN</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>
            {fromCache ? 'Data Tersimpan (Offline)' : 'Tersinkron Real-Time'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Riwayat Pembayaran Denda</Text>
      <Text style={styles.subtitle}>
        Seluruh transaksi pembayaran denda keterlambatan Anda tersimpan permanen dan tetap tersedia
        setelah aplikasi ditutup.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <MetricsGrid
        items={[
          { value: String(summary.total), label: 'Total Transaksi', description: 'Semua percobaan' },
          {
            value: formatRupiah(summary.paidAmount),
            label: 'Total Dibayar',
            description: `${summary.success} transaksi berhasil`,
            color: PAYMENT_COLORS.success.dot,
          },
          {
            value: String(summary.pending),
            label: 'Menunggu',
            description: 'Belum terverifikasi',
            color: PAYMENT_COLORS.warning.dot,
          },
          {
            value: String(summary.failed),
            label: 'Gagal',
            description: 'Ditolak atau kedaluwarsa',
            color: PAYMENT_COLORS.danger.dot,
          },
        ]}
      />

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={filter === 'all' ? 'Belum Ada Riwayat Pembayaran' : 'Tidak Ada Transaksi pada Filter Ini'}
              message={
                filter === 'all'
                  ? 'Transaksi akan muncul di sini setelah Anda membayar tagihan denda keterlambatan.'
                  : 'Ubah filter untuk melihat transaksi dengan status lain.'
              }
              actionText={filter === 'all' ? 'Lihat Tagihan' : 'Tampilkan Semua'}
              onAction={() =>
                filter === 'all' ? router.push('/praktikan/tagihan' as Href) : setFilter('all')
              }
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAYMENT_COLORS.canvas },
  list: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  header: { gap: 14, marginBottom: 6 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrowBadge: {
    backgroundColor: PAYMENT_COLORS.accentTint,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: { fontSize: 11, fontWeight: '800', color: PAYMENT_COLORS.accent, letterSpacing: 0.5 },
  liveTag: {
    backgroundColor: PAYMENT_COLORS.success.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveTagText: { fontSize: 11, fontWeight: '700', color: PAYMENT_COLORS.success.text },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 26,
    fontWeight: '900',
    color: PAYMENT_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, lineHeight: 22, color: PAYMENT_COLORS.textMuted },
  errorBox: { backgroundColor: PAYMENT_COLORS.danger.bg, borderRadius: 10, padding: 12 },
  errorText: { color: PAYMENT_COLORS.danger.text, fontSize: 12.5, fontWeight: '600' },
  card: {
    backgroundColor: PAYMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 1,
  },
  pressed: { opacity: 0.85 },
  cardHeader: { gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaCell: { flexGrow: 1, flexBasis: '45%', minWidth: 130, gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: '600', color: PAYMENT_COLORS.textMuted },
  metaValue: { fontSize: 13.5, fontWeight: '700', color: PAYMENT_COLORS.textSecondary },
  amount: { color: PAYMENT_COLORS.textPrimary, fontWeight: '900' },
  orderId: {
    fontSize: 11,
    color: PAYMENT_COLORS.textMuted,
    fontWeight: '600',
    borderTopWidth: 1,
    borderTopColor: PAYMENT_COLORS.border,
    paddingTop: 10,
  },
});
