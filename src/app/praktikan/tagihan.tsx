import { router, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import {
  FilterChips,
  FineStatusBadge,
  MetricsGrid,
  PAYMENT_COLORS,
  type FilterOption,
} from '@/components/payment-ui';
import { useAuth } from '@/context/auth-context';
import { useStudentFines } from '@/hooks/use-student-finance';
import type { FineDocument, FineStatus } from '@/types/finance';
import { formatRupiah, formatWibDate } from '@/utils/payment-format';

type FineFilter = 'all' | FineStatus;

const FILTERS: FilterOption<FineFilter>[] = [
  { key: 'all', label: 'Semua' },
  { key: 'unpaid', label: 'Belum Dibayar' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'paid', label: 'Lunas' },
];

export default function PraktikanTagihanScreen() {
  const { user, userDoc } = useAuth();
  const uid = userDoc?.uid || user?.uid;
  const { items: fines, loading, fromCache, error } = useStudentFines(uid);
  const [filter, setFilter] = useState<FineFilter>('all');

  const summary = useMemo(() => {
    const unpaid = fines.filter((item) => item.status === 'unpaid');
    const pending = fines.filter((item) => item.status === 'pending');
    const paid = fines.filter((item) => item.status === 'paid');
    const sum = (list: FineDocument[]) => list.reduce((total, item) => total + item.amount, 0);
    return {
      total: fines.length,
      unpaidAmount: sum(unpaid),
      unpaidCount: unpaid.length,
      pendingCount: pending.length,
      paidAmount: sum(paid),
      paidCount: paid.length,
    };
  }, [fines]);

  const visible = useMemo(
    () => (filter === 'all' ? fines : fines.filter((item) => item.status === filter)),
    [fines, filter]
  );

  const renderItem = ({ item }: { item: FineDocument }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rincian tagihan ${item.praktikum}`}
      onPress={() => router.push(`/praktikan/tagihan/${item.id}` as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.praktikum}
        </Text>
        <FineStatusBadge status={item.status} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Tanggal Sesi</Text>
          <Text style={styles.metaValue}>{formatWibDate(item.sessionDate) !== '-' ? formatWibDate(item.sessionDate) : item.sessionDate || '-'}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Keterlambatan</Text>
          <Text style={styles.metaValue}>{item.lateMinutes} menit</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Nominal Denda</Text>
          <Text style={[styles.metaValue, styles.amount]}>{formatRupiah(item.amount)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.invoice}>{item.invoiceNumber}</Text>
        <Text style={styles.link}>Lihat Rincian →</Text>
      </View>
    </Pressable>
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>TAGIHAN DENDA</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>
            {fromCache ? 'Data Tersimpan (Offline)' : 'Tersinkron Real-Time'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>Tagihan Keterlambatan</Text>
      <Text style={styles.subtitle}>
        Denda diterbitkan otomatis oleh sistem untuk setiap presensi yang melewati batas toleransi.
        Membayar denda tidak mengubah status kehadiran Anda.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <MetricsGrid
        items={[
          { value: String(summary.total), label: 'Total Tagihan', description: 'Seluruh kejadian telat' },
          {
            value: formatRupiah(summary.unpaidAmount),
            label: 'Belum Dibayar',
            description: `${summary.unpaidCount} tagihan`,
            color: PAYMENT_COLORS.danger.dot,
          },
          {
            value: String(summary.pendingCount),
            label: 'Menunggu Pembayaran',
            description: 'Transaksi berjalan',
            color: PAYMENT_COLORS.warning.dot,
          },
          {
            value: formatRupiah(summary.paidAmount),
            label: 'Lunas',
            description: `${summary.paidCount} tagihan`,
            color: PAYMENT_COLORS.success.dot,
          },
        ]}
      />

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/praktikan/riwayat-pembayaran' as Href)}
        style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
        <Text style={styles.historyLinkText}>Buka Riwayat Pembayaran →</Text>
      </Pressable>
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
              title={filter === 'all' ? 'Belum Ada Tagihan' : 'Tidak Ada Tagihan pada Filter Ini'}
              message={
                filter === 'all'
                  ? 'Anda tidak memiliki tagihan denda. Tagihan hanya terbit bila presensi melewati batas toleransi keterlambatan.'
                  : 'Ubah filter untuk melihat tagihan dengan status lain.'
              }
              actionText={filter === 'all' ? 'Lihat Jadwal Praktikum' : 'Tampilkan Semua'}
              onAction={() =>
                filter === 'all' ? router.push('/praktikan/jadwal') : setFilter('all')
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
  errorBox: {
    backgroundColor: PAYMENT_COLORS.danger.bg,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: PAYMENT_COLORS.danger.text, fontSize: 12.5, fontWeight: '600' },
  historyLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  historyLinkText: { color: PAYMENT_COLORS.accent, fontSize: 13, fontWeight: '800' },
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
  metaCell: { flexGrow: 1, flexBasis: '30%', minWidth: 110, gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: '600', color: PAYMENT_COLORS.textMuted },
  metaValue: { fontSize: 13.5, fontWeight: '700', color: PAYMENT_COLORS.textSecondary },
  amount: { color: PAYMENT_COLORS.textPrimary, fontWeight: '900' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: PAYMENT_COLORS.border,
    paddingTop: 10,
  },
  invoice: { fontSize: 11.5, color: PAYMENT_COLORS.textMuted, fontWeight: '600', flexShrink: 1 },
  link: { fontSize: 12.5, fontWeight: '800', color: PAYMENT_COLORS.accent },
});
