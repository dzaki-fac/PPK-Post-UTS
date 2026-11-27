import { router, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { MetricGridItem, MetricsGrid } from '@/components/metrics-grid';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import { subscribeStudentFines } from '@/services/payment-service';
import { FineDocument, FineStatus } from '@/types/praktikum';
import { formatRupiah } from '@/utils/format';
import { formatWib } from '@/utils/wib';

type FineFilter = 'semua' | FineStatus;

export default function PraktikanTagihanScreen() {
  const { user, userDoc } = useAuth();
  const studentUid = userDoc?.uid || user?.uid || '';

  const [fines, setFines] = useState<FineDocument[]>([]);
  const [loading, setLoading] = useState(Boolean(studentUid));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FineFilter>('semua');

  useEffect(() => {
    if (!studentUid) return;

    const unsub = subscribeStudentFines(
      studentUid,
      (items) => {
        setFines(items);
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        setLoading(false);
        setErrorMessage(err.message || 'Gagal memuat daftar tagihan denda.');
      }
    );

    return () => unsub();
  }, [studentUid]);

  const metrics = useMemo(() => {
    const unpaid = fines.filter((f) => f.status === 'unpaid');
    const pending = fines.filter((f) => f.status === 'pending');
    const paid = fines.filter((f) => f.status === 'paid');
    const unpaidAmount = unpaid.reduce(
      (acc, item) => acc + (Number(item.amount) || 0),
      0
    );
    const paidAmount = paid.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const outstandingAmount = fines
      .filter((f) => f.status !== 'paid')
      .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    return {
      total: fines.length,
      unpaid: unpaid.length,
      pending: pending.length,
      paid: paid.length,
      unpaidAmount,
      paidAmount,
      outstandingAmount,
    };
  }, [fines]);

  const metricItems = useMemo<MetricGridItem[]>(
    () => [
      {
        key: 'total',
        label: 'Total Tagihan',
        value: metrics.total,
        hint: `${metrics.paid} lunas (${formatRupiah(metrics.paidAmount)})`,
      },
      {
        key: 'unpaid',
        label: 'Belum Dibayar',
        value: metrics.unpaid,
        tone: 'danger',
        hint: formatRupiah(metrics.unpaidAmount),
      },
      {
        key: 'pending',
        label: 'Menunggu',
        value: metrics.pending,
        tone: 'warning',
        hint: 'Verifikasi Midtrans',
      },
      {
        key: 'outstanding',
        label: 'Total Tunggakan',
        value: formatRupiah(metrics.outstandingAmount),
        tone: 'primary',
        hint: 'Nominal belum lunas',
      },
    ],
    [metrics]
  );

  const filteredFines = useMemo(() => {
    if (filter === 'semua') return fines;
    return fines.filter((item) => item.status === filter);
  }, [fines, filter]);

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.bannerCard}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerEyebrow}>TAGIHAN & PEMBAYARAN</Text>
          <Text style={styles.bannerTitle}>Tagihan Denda Keterlambatan</Text>
          <Text style={styles.bannerSubtitle}>
            Pantau tagihan keterlambatan sesi praktikum dan lakukan pembayaran melalui
            Midtrans Sandbox.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Riwayat Pembayaran"
          onPress={() => router.push('/praktikan/riwayat-pembayaran' as Href)}
          style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}>
          <Text style={styles.historyBtnText}>Riwayat Pembayaran</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <MetricsGrid items={metricItems} accentColor="#EA580C" />

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Status Tagihan:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <FilterChip
            label="Semua"
            count={metrics.total}
            active={filter === 'semua'}
            onPress={() => setFilter('semua')}
          />
          <FilterChip
            label="Belum Dibayar"
            count={metrics.unpaid}
            active={filter === 'unpaid'}
            onPress={() => setFilter('unpaid')}
          />
          <FilterChip
            label="Menunggu"
            count={metrics.pending}
            active={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
          <FilterChip
            label="Lunas"
            count={metrics.paid}
            active={filter === 'paid'}
            onPress={() => setFilter('paid')}
          />
        </ScrollView>
      </View>
    </View>
  );

  const renderFineCard = ({ item }: { item: FineDocument }) => {
    const canPay = item.status !== 'paid';

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Lihat detail tagihan ${item.invoiceNumber}`}
        onPress={() => router.push(`/praktikan/tagihan/${item.id}` as Href)}
        style={({ pressed }) => [styles.fineCard, pressed && styles.pressed]}>
        <View style={styles.cardTopRow}>
          <View style={styles.invoiceWrap}>
            <Text style={styles.invoiceLabel}>{item.invoiceNumber}</Text>
            <Text style={styles.praktikumTitle} numberOfLines={2}>
              {item.praktikum}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Tanggal Sesi</Text>
            <Text style={styles.metaValue}>{item.sessionDate || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Keterlambatan</Text>
            <Text style={styles.metaValue}>
              {item.lateMinutes} menit (toleransi {item.graceMinutes} menit)
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Nominal Denda</Text>
            <Text style={styles.amountText}>{formatRupiah(item.amount)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.timestampText}>
            {item.paidAt
              ? `Lunas pada ${formatWib(item.paidAt)}`
              : `Diterbitkan ${formatWib(item.createdAt)}`}
          </Text>
          <View
            style={[
              styles.detailCta,
              canPay ? styles.detailCtaPrimary : styles.detailCtaSecondary,
            ]}>
            <Text
              style={[
                styles.detailCtaText,
                canPay ? styles.detailCtaTextPrimary : styles.detailCtaTextSecondary,
              ]}>
              {item.status === 'pending'
                ? 'Lanjutkan Bayar'
                : canPay
                ? 'Bayar Sekarang'
                : 'Lihat Rincian'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.page}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Memuat tagihan denda...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFines}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderFineCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={
                fines.length === 0
                  ? 'Tidak Ada Tagihan Denda'
                  : 'Tidak Ada Tagihan pada Filter Ini'
              }
              message={
                fines.length === 0
                  ? 'Anda belum memiliki tagihan denda keterlambatan. Seluruh presensi Anda tercatat tepat waktu.'
                  : 'Ubah pilihan filter di atas untuk melihat tagihan dengan status lainnya.'
              }
              actionText={filter !== 'semua' ? 'Tampilkan Semua' : undefined}
              onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
            />
          }
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label} ({count})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 16,
    paddingBottom: 90,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  headerBlock: {
    gap: 16,
    marginBottom: 4,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flex: 1,
    gap: 4,
  },
  bannerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#EA580C',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  historyBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  filterSection: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  filterRow: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  fineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  invoiceWrap: {
    flex: 1,
    gap: 4,
  },
  invoiceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: 0.3,
  },
  praktikumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexGrow: 1,
    flexBasis: 140,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA580C',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timestampText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  detailCta: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCtaPrimary: {
    backgroundColor: '#EA580C',
  },
  detailCtaSecondary: {
    backgroundColor: '#F1F5F9',
  },
  detailCtaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailCtaTextPrimary: {
    color: '#FFFFFF',
  },
  detailCtaTextSecondary: {
    color: '#334155',
  },
  pressed: {
    opacity: 0.85,
  },
});
