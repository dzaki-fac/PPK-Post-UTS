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
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import { subscribeStudentPayments } from '@/services/payment-service';
import { PaymentDocument, PaymentStatus } from '@/types/praktikum';
import { formatRupiah } from '@/utils/format';
import { formatWib } from '@/utils/wib';

type PaymentFilter = 'semua' | PaymentStatus;

export default function PraktikanRiwayatPembayaranScreen() {
  const { user, userDoc } = useAuth();
  const studentUid = userDoc?.uid || user?.uid || '';

  const [payments, setPayments] = useState<PaymentDocument[]>([]);
  const [loading, setLoading] = useState(Boolean(studentUid));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<PaymentFilter>('semua');

  useEffect(() => {
    if (!studentUid) return;

    const unsub = subscribeStudentPayments(
      studentUid,
      (items) => {
        setPayments(items);
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        setLoading(false);
        setErrorMessage(err.message || 'Gagal memuat riwayat pembayaran.');
      }
    );

    return () => unsub();
  }, [studentUid]);

  const metrics = useMemo(() => {
    const successItems = payments.filter((p) => p.status === 'success');
    const pendingItems = payments.filter((p) => p.status === 'pending');
    const failedItems = payments.filter((p) => p.status === 'failed');
    const totalPaid = successItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    return {
      total: payments.length,
      success: successItems.length,
      pending: pendingItems.length,
      failed: failedItems.length,
      totalPaid,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (filter === 'semua') return payments;
    return payments.filter((item) => item.status === filter);
  }, [payments, filter]);

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.bannerCard}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerEyebrow}>RIWAYAT TRANSAKSI</Text>
          <Text style={styles.bannerTitle}>Riwayat Pembayaran Denda</Text>
          <Text style={styles.bannerSubtitle}>
            Catatan seluruh percobaan transaksi Midtrans Snap beserta status
            verifikasi dari server.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/praktikan/tagihan' as Href)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backBtnText}>← Daftar Tagihan</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{metrics.total}</Text>
          <Text style={styles.metricLbl}>Total Transaksi</Text>
          <Text style={styles.metricDesc}>Semua percobaan</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardSuccess]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{metrics.success}</Text>
          <Text style={styles.metricLbl}>Berhasil</Text>
          <Text style={styles.metricDesc}>Settlement terverifikasi</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPending]}>
          <Text style={[styles.metricVal, { color: '#D97706' }]}>{metrics.pending}</Text>
          <Text style={styles.metricLbl}>Menunggu</Text>
          <Text style={styles.metricDesc}>Belum final</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardFailed]}>
          <Text style={[styles.metricVal, { color: '#DC2626' }]}>{metrics.failed}</Text>
          <Text style={styles.metricLbl}>Gagal</Text>
          <Text style={styles.metricDesc}>Batal / kedaluwarsa</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPaidTotal]}>
          <Text style={[styles.metricVal, styles.metricValNominal, { color: '#EA580C' }]}>
            {formatRupiah(metrics.totalPaid)}
          </Text>
          <Text style={styles.metricLbl}>Total Dibayarkan</Text>
          <Text style={styles.metricDesc}>Akumulasi lunas</Text>
        </View>
      </View>

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
          label="Berhasil"
          count={metrics.success}
          active={filter === 'success'}
          onPress={() => setFilter('success')}
        />
        <FilterChip
          label="Menunggu"
          count={metrics.pending}
          active={filter === 'pending'}
          onPress={() => setFilter('pending')}
        />
        <FilterChip
          label="Gagal"
          count={metrics.failed}
          active={filter === 'failed'}
          onPress={() => setFilter('failed')}
        />
      </ScrollView>
    </View>
  );

  const renderPaymentItem = ({ item }: { item: PaymentDocument }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push(
          `/praktikan/pembayaran-hasil?fineId=${encodeURIComponent(
            item.fineId
          )}&paymentId=${encodeURIComponent(item.id)}` as Href
        )
      }
      style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.invoiceText}>
            {item.invoiceNumber} • Percobaan #{item.attempt}
          </Text>
          <Text style={styles.praktikumText}>{item.praktikum}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Nominal</Text>
          <Text style={styles.amountText}>{formatRupiah(item.amount)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Metode Pembayaran</Text>
          <Text style={styles.metaValue}>
            {item.paymentType ? item.paymentType.toUpperCase() : 'Menunggu pilihan'}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Waktu Dibuat</Text>
          <Text style={styles.metaValue}>{formatWib(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.itemFooter}>
        <Text style={styles.footerInfo}>
          {item.settledAt
            ? `Selesai pada ${formatWib(item.settledAt)}`
            : item.failureReason
            ? item.failureReason
            : `Order ID: ${item.id}`}
        </Text>
        <Text style={styles.footerAction}>Cek Status →</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.page}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Memuat riwayat pembayaran...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Belum Ada Riwayat Pembayaran"
              message="Transaksi pembayaran Midtrans Anda akan tampil di sini secara permanen."
              actionText={filter !== 'semua' ? 'Tampilkan Semua' : 'Lihat Tagihan'}
              onAction={() =>
                filter !== 'semua'
                  ? setFilter('semua')
                  : router.replace('/praktikan/tagihan' as Href)
              }
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  headerBlock: {
    gap: 14,
    marginBottom: 4,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 12,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  backBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 3,
  },
  metricCardSuccess: {
    borderColor: '#BBF7D0',
  },
  metricCardPending: {
    borderColor: '#FDE68A',
  },
  metricCardFailed: {
    borderColor: '#FECACA',
  },
  metricCardPaidTotal: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF7',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricValNominal: {
    fontSize: 18,
  },
  metricLbl: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
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
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  invoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  praktikumText: {
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
  metaCell: {
    flexGrow: 1,
    flexBasis: 140,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA580C',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerInfo: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  footerAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  pressed: {
    opacity: 0.85,
  },
});
