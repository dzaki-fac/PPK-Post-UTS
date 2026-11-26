/**
 * Dashboard Keberlangsungan Laboratorium — Sprint 4 / Programmer 2 (FR-P2-01).
 * Seluruh angka berasal dari Firestore real-time dan mengikuti filter periode.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';

import { LabStatusCard } from '@/components/dashboard/lab-status-card';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import {
  buildDashboardAggregate,
  subscribeDashboardData,
  type DashboardAggregate,
  type DashboardRawData,
} from '@/services/dashboard-service';
import type { DashboardPeriod, DashboardSessionItem } from '@/types/sprint4-p2';
import {
  formatRupiah,
  normalizeRoleP2,
  shiftPeriod,
} from '@/utils/sprint4-p2-helpers';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

function SessionRow({
  item,
  onPress,
}: {
  item: DashboardSessionItem;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sessionRow, pressed && styles.pressed]}>
      <View style={styles.sessionDot} />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{item.praktikum || 'Sesi Praktikum'}</Text>
        <Text style={styles.sessionMeta}>
          {[item.kelas, item.tanggal, `${item.waktuMulai} WIB`].filter(Boolean).join(' · ')}
        </Text>
        {item.materi ? <Text style={styles.sessionMateri}>{item.materi}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function DashboardAslabScreen() {
  const { userDoc, loading } = useAuth();
  const [raw, setRaw] = useState<DashboardRawData>({
    labs: [],
    members: [],
    sessions: [],
    attendances: [],
    fines: [],
    payments: [],
  });
  const [period, setPeriod] = useState<DashboardPeriod>('minggu');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [subscribed, setSubscribed] = useState(false);

  const role = normalizeRoleP2(userDoc?.peran);
  useEffect(() => {
    if (!loading && role !== 'aslab') router.replace('/');
  }, [loading, role]);

  useEffect(() => {
    const unsubscribe = subscribeDashboardData(
      (data) => {
        setRaw(data);
        setSubscribed(true);
      },
      (error) => console.warn('Dashboard tidak dapat memuat data:', error)
    );
    return unsubscribe;
  }, []);

  const data = useMemo<DashboardAggregate>(
    () => buildDashboardAggregate(raw, userDoc, period, anchor),
    [raw, userDoc, period, anchor]
  );

  const handleShift = useCallback(
    (delta: number) => setAnchor((current) => shiftPeriod(current, period, delta)),
    [period]
  );

  if (loading || (!subscribed && raw.labs.length === 0)) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Memuat dashboard laboratorium...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      renderItem={undefined}
      ListHeaderComponent={
        <View style={styles.content}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}>
            <Text style={styles.backPillText}>← Kembali</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Portal Aslab</Text>
          <Text style={styles.pageTitle}>Dashboard Laboratorium</Text>
          <Text style={styles.pageSubtitle}>
            Ringkasan keberlangsungan praktikum · {data.periodeLabel}
          </Text>

          <MetricsGrid
            items={[
              { label: 'Total Laboratorium', value: data.metrics.totalLab, tint: 'indigo' },
              { label: 'Total Praktikan', value: data.metrics.totalPraktikan, tint: 'teal' },
              { label: 'Total Asprak', value: data.metrics.totalAsprak, tint: 'default' },
              { label: 'Sesi Berlangsung', value: data.metrics.sesiBerlangsung, tint: 'green' },
            ]}
          />

          <View style={styles.periodWrap}>
            <PeriodFilter
              period={period}
              periodLabel={data.periodeLabel}
              onPeriodChange={setPeriod}
              onShift={handleShift}
            />
          </View>

          <Section title="Status Kegiatan Laboratorium" description="Berdasarkan data real-time Firestore.">
            {data.labStatuses.length === 0 ? (
              <EmptyState
                title="Belum Ada Laboratorium"
                message="Belum ada laboratorium pada mata kuliah yang Anda kelola."
              />
            ) : (
              <View style={styles.cardList}>
                {data.labStatuses.map((lab) => (
                  <LabStatusCard key={lab.labId} item={lab} />
                ))}
              </View>
            )}
          </Section>

          <Section title="Sedang Berlangsung" description="Sesi yang sedang dibuka asprak.">
            {data.ongoing.length === 0 ? (
              <EmptyState title="Tidak Ada Sesi Berlangsung" message="Tidak ada sesi dibuka pada periode ini." />
            ) : (
              <View style={styles.cardList}>
                {data.ongoing.map((item) => (
                  <SessionRow key={item.id} item={item} onPress={() => router.push('/aslab/jadwal' as Href)} />
                ))}
              </View>
            )}
          </Section>

          <Section title="Akan Datang" description="Lima jadwal terdekat pada laboratorium Anda.">
            {data.upcoming.length === 0 ? (
              <EmptyState title="Tidak Ada Jadwal Mendatang" message="Belum ada sesi terjadwal." />
            ) : (
              <View style={styles.cardList}>
                {data.upcoming.map((item) => (
                  <SessionRow key={item.id} item={item} onPress={() => router.push('/aslab/jadwal' as Href)} />
                ))}
              </View>
            )}
          </Section>

          <Section title="Riwayat Kegiatan" description="Sesi yang sudah ditutup pada periode terpilih.">
            {data.history.length === 0 ? (
              <EmptyState title="Belum Ada Riwayat" message="Tidak ada sesi ditutup pada periode ini." />
            ) : (
              <View style={styles.cardList}>
                {data.history.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <Text style={styles.sessionTitle}>{item.praktikum || 'Sesi Praktikum'}</Text>
                    <Text style={styles.sessionMeta}>
                      {[item.tanggal, item.waktuMulai].filter(Boolean).join(' · ')} WIB
                    </Text>
                    <View style={styles.historyStats}>
                      <Text style={styles.historyStat}>Hadir {item.hadir}</Text>
                      <Text style={[styles.historyStat, { color: '#B45309' }]}>Telat {item.terlambat}</Text>
                      <Text style={[styles.historyStat, { color: '#1D4ED8' }]}>Izin {item.izin}</Text>
                      <Text style={[styles.historyStat, { color: '#64748B' }]}>Alpa {item.belumHadir}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section title="Riwayat Keuangan Denda" description="Data hanya dibaca dari koleksi denda & pembayaran.">
            <MetricsGrid
              items={[
                { label: 'Tagihan Diterbitkan', value: formatRupiah(data.finance.diterbitkan), tint: 'indigo' },
                { label: 'Terbayar', value: formatRupiah(data.finance.terbayar), tint: 'green' },
                { label: 'Menunggu', value: formatRupiah(data.finance.menunggu), tint: 'amber' },
                { label: 'Transaksi Lunas', value: data.finance.transaksi.length, tint: 'default' },
              ]}
            />
            {data.finance.transaksi.length === 0 ? (
              <EmptyState title="Belum Ada Transaksi" message="Tidak ada pembayaran lunas pada periode ini." />
            ) : (
              <View style={styles.cardList}>
                {data.finance.transaksi.map((trx) => (
                  <View key={trx.id} style={styles.historyRow}>
                    <Text style={styles.sessionTitle}>{trx.studentName}</Text>
                    <Text style={styles.sessionMeta}>
                      {[trx.praktikum, trx.time].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.trxAmount}>{formatRupiah(trx.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 90,
    gap: 14,
  },
  content: { width: '100%', gap: 14, paddingTop: 18 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  backPill: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  backPillText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 1 },
  pageTitle: { fontSize: Platform.OS === 'web' ? 30 : 26, fontWeight: '900', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B' },
  periodWrap: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sectionDescription: { fontSize: 11, color: '#64748B' },
  cardList: { gap: 10 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    elevation: 1,
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginTop: 5 },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  sessionMeta: { fontSize: 11, color: '#64748B' },
  sessionMateri: { fontSize: 11, color: '#334155' },
  historyRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 5,
  },
  historyStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  historyStat: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  trxAmount: { fontSize: 14, fontWeight: '900', color: '#4F46E5' },
  pressed: { opacity: 0.75 },
});
