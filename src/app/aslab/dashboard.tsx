import { router, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LabStatusCard } from '@/components/dashboard/lab-status-card';
import { PeriodFilterBar } from '@/components/dashboard/period-filter-bar';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  DashboardRawData,
  buildDashboardSnapshot,
  subscribeAslabDashboardData,
} from '@/services/dashboard-service';
import { formatRupiah } from '@/utils/format';
import { DashboardPeriodType, formatWib, shiftWibAnchor } from '@/utils/wib';

export default function AslabDashboardScreen() {
  const { userDoc } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriodType>('hari');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<DashboardRawData>({
    labs: [],
    members: [],
    users: [],
    sessions: [],
    attendances: [],
    fines: [],
    payments: [],
  });

  const managedCourseIds = useMemo(
    () => userDoc?.managedCourseIds ?? [],
    [userDoc?.managedCourseIds]
  );

  useEffect(() => {
    const unsub = subscribeAslabDashboardData(managedCourseIds, (next) => {
      setRawData(next);
      setLoading(false);
    });
    return () => unsub();
  }, [managedCourseIds]);

  const snapshot = useMemo(
    () => buildDashboardSnapshot(rawData, period, anchorDate),
    [rawData, period, anchorDate]
  );

  const handleShiftPeriod = (delta: -1 | 1) => {
    setAnchorDate((prev) => shiftWibAnchor(period, prev, delta));
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.centerContainer}>
        {/* Header Eyebrow & Judul */}
        <View style={styles.headerBlock}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowBadge}>
              <Text style={styles.eyebrowText}>ASISTEN LABORATORIUM (ASLAB)</Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.screenTitle}>Dashboard Keberlangsungan Lab</Text>
              <Text style={styles.screenSubtitle}>
                Pantau aktivitas praktikum seluruh laboratorium, status pelaksanaan sesi, riwayat kegiatan, dan ringkasan denda.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka Peta Laboratorium"
              onPress={() => router.push('/aslab/peta-lab' as Href)}
              style={({ pressed }) => [styles.mapShortcutBtn, pressed && styles.pressed]}>
              <Text style={styles.mapShortcutText}>Peta Lab →</Text>
            </Pressable>
          </View>
        </View>

        {/* 4 Kartu Metrik Ringkasan */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: Colors.aslabPrimary }]}>
              {snapshot.metrics.totalLabs}
            </Text>
            <Text style={styles.metricLbl}>Total Laboratorium</Text>
            <Text style={styles.metricDesc}>Lab aktif terkelola</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#0F172A' }]}>
              {snapshot.metrics.totalPraktikan}
            </Text>
            <Text style={styles.metricLbl}>Total Praktikan</Text>
            <Text style={styles.metricDesc}>Terdaftar pada mata kuliah</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#0D9488' }]}>
              {snapshot.metrics.totalAsprak}
            </Text>
            <Text style={styles.metricLbl}>Total Asprak</Text>
            <Text style={styles.metricDesc}>Pengampu sesi aktif</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardActive]}>
            <Text style={[styles.metricVal, { color: '#16A34A' }]}>
              {snapshot.metrics.ongoingSessionsCount}
            </Text>
            <Text style={styles.metricLbl}>Sesi Berlangsung</Text>
            <Text style={styles.metricDesc}>Presensi sedang dibuka</Text>
          </View>
        </View>

        {/* Filter Periode (Hari / Minggu / Bulan) */}
        <PeriodFilterBar
          period={period}
          periodLabel={snapshot.range.label}
          onSelectPeriod={setPeriod}
          onShiftPeriod={handleShiftPeriod}
          onResetToday={() => setAnchorDate(new Date())}
        />

        {/* Skeleton saat pemuatan awal */}
        {loading ? (
          <View style={styles.skeletonGroup}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        ) : (
          <>
            {/* Bagian 1: Status Kegiatan Setiap Laboratorium */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Status Kegiatan per Laboratorium</Text>
                <Text style={styles.sectionCount}>{snapshot.labStatuses.length} Lab</Text>
              </View>
              {snapshot.labStatuses.length === 0 ? (
                <EmptyState
                  title="Belum Ada Laboratorium Aktif"
                  message="Tambahkan laboratorium pada mata kuliah yang Anda kelola untuk mulai memantau kegiatan."
                />
              ) : (
                <View style={styles.cardList}>
                  {snapshot.labStatuses.map((item) => (
                    <LabStatusCard key={item.lab.id} item={item} />
                  ))}
                </View>
              )}
            </View>

            {/* Bagian 2: Jadwal Berlangsung & Akan Datang */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Jadwal Berlangsung & Akan Datang</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/aslab/jadwal' as Href)}
                  style={({ pressed }) => [styles.inlineLinkBtn, pressed && styles.pressed]}>
                  <Text style={styles.inlineLinkText}>Kelola Jadwal →</Text>
                </Pressable>
              </View>

              {/* Sedang Berlangsung */}
              <Text style={styles.subSectionLabel}>Sedang Berlangsung ({snapshot.ongoingSessions.length})</Text>
              {snapshot.ongoingSessions.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Sesi Sedang Berlangsung"
                  message="Belum ada sesi berstatus dibuka saat ini."
                />
              ) : (
                <View style={styles.cardList}>
                  {snapshot.ongoingSessions.map((sesi) => (
                    <View key={sesi.id} style={styles.compactCard}>
                      <View style={styles.compactTopRow}>
                        <Text style={styles.compactTitle} numberOfLines={1}>
                          {sesi.praktikum} • {sesi.kelas}
                        </Text>
                        <StatusBadge status={sesi.status} size="small" />
                      </View>
                      <Text style={styles.compactMeta}>
                        {sesi.ruang} • {sesi.tanggal} • {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
                      </Text>
                      {sesi.materi ? (
                        <Text style={styles.compactSub} numberOfLines={1}>
                          {sesi.materi}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Akan Datang */}
              <Text style={[styles.subSectionLabel, { marginTop: 8 }]}>
                Akan Datang ({snapshot.upcomingSessions.length})
              </Text>
              {snapshot.upcomingSessions.length === 0 ? (
                <EmptyState
                  title="Tidak Ada Jadwal Akan Datang"
                  message="Tambahkan jadwal sesi praktikum baru pada menu Jadwal."
                />
              ) : (
                <View style={styles.cardList}>
                  {snapshot.upcomingSessions.map((sesi) => (
                    <View key={sesi.id} style={styles.compactCard}>
                      <View style={styles.compactTopRow}>
                        <Text style={styles.compactTitle} numberOfLines={1}>
                          {sesi.praktikum} • {sesi.kelas}
                        </Text>
                        <StatusBadge status={sesi.status} size="small" />
                      </View>
                      <Text style={styles.compactMeta}>
                        {sesi.ruang} • {sesi.tanggal} • {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
                      </Text>
                      {sesi.materi ? (
                        <Text style={styles.compactSub} numberOfLines={1}>
                          {sesi.materi}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Bagian 3: Riwayat Kegiatan Laboratorium */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Riwayat Kegiatan Laboratorium</Text>
                <Text style={styles.sectionCount}>
                  {snapshot.activityHistory.length} Sesi Selesai
                </Text>
              </View>

              {snapshot.activityHistory.length === 0 ? (
                <EmptyState
                  title="Belum Ada Riwayat Kegiatan pada Periode Ini"
                  message={`Tidak ada sesi praktikum yang selesai pada rentang ${snapshot.range.label}.`}
                />
              ) : (
                <View style={styles.cardList}>
                  {snapshot.activityHistory.map((hist) => (
                    <View key={hist.session.id} style={styles.compactCard}>
                      <View style={styles.compactTopRow}>
                        <Text style={styles.compactTitle} numberOfLines={1}>
                          {hist.session.praktikum} • {hist.session.kelas}
                        </Text>
                        <StatusBadge status="ditutup" size="small" />
                      </View>
                      <Text style={styles.compactMeta}>
                        {hist.labName} • {hist.session.tanggal} • {hist.session.waktuMulai} -{' '}
                        {hist.session.waktuSelesai} WIB
                      </Text>
                      <Text style={styles.compactMeta}>
                        Buka: {formatWib(hist.session.openedAt)} • Tutup:{' '}
                        {formatWib(hist.session.closedAt)}
                      </Text>
                      <View style={styles.historyStatsRow}>
                        <View style={[styles.pillCount, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={[styles.pillCountText, { color: '#15803D' }]}>
                            {hist.hadirCount} Hadir
                          </Text>
                        </View>
                        <View style={[styles.pillCount, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.pillCountText, { color: '#B45309' }]}>
                            {hist.terlambatCount} Terlambat
                          </Text>
                        </View>
                        <View style={[styles.pillCount, { backgroundColor: '#DBEAFE' }]}>
                          <Text style={[styles.pillCountText, { color: '#1D4ED8' }]}>
                            {hist.izinCount} Izin
                          </Text>
                        </View>
                        <View style={[styles.pillCount, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={[styles.pillCountText, { color: '#475569' }]}>
                            {hist.belumHadirCount} Belum Hadir
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Bagian 4: Riwayat Keuangan Hasil Denda Praktikum (Read-Only) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Riwayat Keuangan Denda Praktikum</Text>
                <Text style={styles.sectionCount}>
                  {snapshot.financeSummary.issuedCount} Tagihan
                </Text>
              </View>

              <View style={styles.financeGrid}>
                <View style={styles.financeCard}>
                  <Text style={styles.financeLabel}>Tagihan Diterbitkan</Text>
                  <Text style={styles.financeValue}>
                    {formatRupiah(snapshot.financeSummary.issuedAmount)}
                  </Text>
                </View>
                <View style={[styles.financeCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
                  <Text style={styles.financeLabel}>Terbayar</Text>
                  <Text style={[styles.financeValue, { color: '#15803D' }]}>
                    {formatRupiah(snapshot.financeSummary.paidAmount)}
                  </Text>
                </View>
                <View style={[styles.financeCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
                  <Text style={styles.financeLabel}>Menunggu / Belum Bayar</Text>
                  <Text style={[styles.financeValue, { color: '#B45309' }]}>
                    {formatRupiah(snapshot.financeSummary.pendingAmount)}
                  </Text>
                </View>
              </View>

              {snapshot.financeSummary.transactions.length === 0 ? (
                <EmptyState
                  title="Belum Ada Transaksi Lunas pada Periode Ini"
                  message={`Belum ada pembayaran denda berstatus berhasil pada rentang ${snapshot.range.label}.`}
                />
              ) : (
                <View style={styles.cardList}>
                  {snapshot.financeSummary.transactions.map((tx) => (
                    <View key={tx.paymentId} style={styles.txCard}>
                      <View style={styles.txLeft}>
                        <Text style={styles.txStudent}>{tx.studentName}</Text>
                        <Text style={styles.txMeta}>
                          {tx.praktikum} • {tx.invoiceNumber}
                        </Text>
                        <Text style={styles.txTime}>
                          {formatWib(tx.settledAt)}
                          {tx.paymentType ? ` • ${tx.paymentType.toUpperCase()}` : ''}
                        </Text>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={styles.txAmount}>{formatRupiah(tx.amount)}</Text>
                        <StatusBadge status="paid" size="small" />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 100 : 32,
  },
  centerContainer: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 18,
  },
  headerBlock: {
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.aslabPrimary,
    letterSpacing: 0.6,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    fontSize: 8,
    color: '#16A34A',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flex: 1,
    minWidth: 240,
    gap: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  mapShortcutBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.aslabPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 2,
  },
  metricCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  skeletonGroup: {
    gap: 12,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    opacity: 0.65,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.aslabPrimary,
  },
  inlineLinkBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    justifyContent: 'center',
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.aslabPrimary,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardList: {
    gap: 10,
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 5,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  compactMeta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  compactSub: {
    fontSize: 12,
    color: '#64748B',
  },
  historyStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pillCount: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  financeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  financeCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 4,
  },
  financeLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  financeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  txLeft: {
    flex: 1,
    gap: 2,
  },
  txStudent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  txMeta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  txTime: {
    fontSize: 11,
    color: '#64748B',
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803D',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
