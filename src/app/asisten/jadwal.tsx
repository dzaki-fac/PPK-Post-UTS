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
import { SesiCard } from '@/components/sesi-card';
import { useAuth } from '@/context/auth-context';
import { subscribeAllAttendances } from '@/services/attendance-service';
import { buildFallbackDefaultLabs, subscribeLabs } from '@/services/lab-service';
import { LeaveRequestDocument, subscribeLeaveRequests } from '@/services/leave-service';
import {
  isSessionExpired,
  subscribeSessions,
  subscribeSessionsByLabIds,
  updateSessionStatus,
} from '@/services/session-service';
import {
  AttendanceDocument,
  LabLocationDocument,
  SessionDocument,
  SessionStatus,
} from '@/types/praktikum';

type FilterType = 'semua' | SessionStatus;

export default function JadwalAsprakScreen() {
  const { userDoc } = useAuth();
  const [sesiList, setSesiList] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [attendances, setAttendances] = useState<AttendanceDocument[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDocument[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filter, setFilter] = useState<FilterType>('semua');

  const assignedLabIds = useMemo(() => userDoc?.labIds ?? [], [userDoc?.labIds]);

  useEffect(() => {
    const unsubSessions =
      assignedLabIds.length > 0
        ? subscribeSessionsByLabIds(
            assignedLabIds,
            (items) => {
              setSesiList(items);
              setLoadingSessions(false);
            },
            () => setLoadingSessions(false)
          )
        : subscribeSessions(
            (items) => {
              setSesiList(items);
              setLoadingSessions(false);
            },
            () => setLoadingSessions(false)
          );

    const unsubLabs = subscribeLabs(
      (items) => setLabs(items.length > 0 ? items : buildFallbackDefaultLabs()),
      () => setLabs(buildFallbackDefaultLabs())
    );

    const unsubAttendances = subscribeAllAttendances((items) => {
      setAttendances(items);
    });

    const unsubLeaves = subscribeLeaveRequests((items) => {
      setLeaveRequests(items);
    });

    return () => {
      unsubSessions();
      unsubLabs();
      unsubAttendances();
      unsubLeaves();
    };
  }, [assignedLabIds]);

  useEffect(() => {
    const timer = setInterval(() => {
      sesiList.forEach((s) => {
        if (s.status === 'dibuka' && isSessionExpired(s)) {
          updateSessionStatus(s.id, 'ditutup').catch(() => {});
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [sesiList]);

  const scopedSessionIds = useMemo(() => new Set(sesiList.map((s) => s.id)), [sesiList]);

  const scopedAttendances = useMemo(
    () =>
      attendances.filter(
        (a) => scopedSessionIds.has(a.sessionId) && a.attendanceStatus !== 'izin'
      ),
    [attendances, scopedSessionIds]
  );

  const pendingLeaves = useMemo(
    () =>
      leaveRequests.filter(
        (r) =>
          r.status === 'menunggu' &&
          (assignedLabIds.length === 0 || scopedSessionIds.has(r.sessionId))
      ).length,
    [leaveRequests, assignedLabIds.length, scopedSessionIds]
  );

  const assignedLabLabels = useMemo(() => {
    if (assignedLabIds.length === 0) return 'Semua Lab (Akun Legacy)';
    const matched = labs.filter((l) => assignedLabIds.includes(l.id));
    if (matched.length === 0) return `${assignedLabIds.length} Laboratorium`;
    return matched.map((l) => l.nama).join(', ');
  }, [assignedLabIds, labs]);

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return sesiList;
    return sesiList.filter((s) => s.status === filter);
  }, [sesiList, filter]);

  const totalSesi = sesiList.length;
  const totalDibuka = sesiList.filter((s) => s.status === 'dibuka').length;
  const totalPresensiMasuk = scopedAttendances.length;
  const totalDitutup = sesiList.filter((s) => s.status === 'ditutup').length;

  const handleCardPress = (sesi: SessionDocument) => {
    router.push({
      pathname: '/asisten/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const renderItem = ({ item }: { item: SessionDocument }) => {
    const totalHadir = attendances.filter(
      (p) => p.sessionId === item.id && p.attendanceStatus !== 'izin'
    ).length;
    const totalIzin = leaveRequests.filter(
      (l) => l.sessionId === item.id && (l.status === 'disetujui' || l.status === 'menunggu')
    ).length;

    return (
      <SesiCard
        sesi={item}
        role="asprak"
        totalHadir={totalHadir}
        totalIzin={totalIzin}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>ASISTEN PRAKTIKUM (ASPRAK)</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>Sinkron Real-Time</Text>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.headerTitle}>Pelaksanaan Sesi Praktikum</Text>
        <Text style={styles.headerSubtitle}>
          Buka sesi saat praktikum dimulai, pantau dan kelola presensi mahasiswa, serta tutup sesi setelah selesai.
        </Text>
        <View style={styles.scopePill}>
          <Text style={styles.scopePillText}>Lab Tanggung Jawab: {assignedLabLabels}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalSesi}</Text>
          <Text style={styles.metricLbl}>Total Sesi</Text>
          <Text style={styles.metricDesc}>Lab diampu</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardDibuka]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{totalDibuka}</Text>
          <Text style={styles.metricLbl}>Sesi Dibuka</Text>
          <Text style={styles.metricDesc}>Presensi aktif</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPresensi]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalPresensiMasuk}</Text>
          <Text style={styles.metricLbl}>Presensi Masuk</Text>
          <Text style={styles.metricDesc}>Hadir & terlambat</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Panel Moderasi Izin"
          onPress={() => router.push('/asisten/moderasi-izin')}
          style={({ pressed }) => [
            styles.metricCard,
            pendingLeaves > 0 && styles.metricCardIzin,
            pressed && styles.chipPressed,
          ]}>
          <Text
            style={[
              styles.metricVal,
              { color: pendingLeaves > 0 ? '#D97706' : '#64748B' },
            ]}>
            {pendingLeaves}
          </Text>
          <Text style={styles.metricLbl}>Izin Menunggu</Text>
          <Text style={styles.metricDesc}>
            {pendingLeaves > 0 ? 'Perlu ditinjau →' : 'Semua ditinjau'}
          </Text>
        </Pressable>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalDitutup}</Text>
          <Text style={styles.metricLbl}>Sesi Ditutup</Text>
          <Text style={styles.metricDesc}>Selesai</Text>
        </View>
      </View>

      {pendingLeaves > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/moderasi-izin')}
          style={({ pressed }) => [styles.pendingLeaveBanner, pressed && styles.chipPressed]}>
          <View style={styles.pendingLeaveBadge}>
            <Text style={styles.pendingLeaveBadgeText}>MODERASI IZIN ({pendingLeaves})</Text>
          </View>
          <View style={styles.pendingLeaveContent}>
            <Text style={styles.pendingLeaveTitle}>
              Terdapat {pendingLeaves} pengajuan izin praktikan menunggu keputusan Anda
            </Text>
            <Text style={styles.pendingLeaveSubtitle}>
              Izin yang disetujui dicatat sebagai tidak hadir dengan izin dan bebas denda.
            </Text>
          </View>
          <View style={styles.pendingLeaveActionBtn}>
            <Text style={styles.pendingLeaveActionText}>Tinjau →</Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/asisten/peta-lab' as Href)}
        style={({ pressed }) => [styles.mapBanner, pressed && styles.chipPressed]}>
        <View style={styles.mapBannerLeft}>
          <View style={styles.mapBannerTagRow}>
            <Text style={styles.mapBannerTitle}>Monitoring Peta Laboratorium</Text>
            <View style={styles.mapTag}>
              <Text style={styles.mapTagText}>REAL-TIME</Text>
            </View>
          </View>
          <Text style={styles.mapBannerSub}>
            Pantau persebaran ruang lab, koordinat, dan aktivitas sesi berlangsung
          </Text>
        </View>
        <View style={styles.mapBannerBtn}>
          <Text style={styles.mapBannerBtnText}>Peta Lab →</Text>
        </View>
      </Pressable>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Status Sesi:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {(
            [
              { key: 'semua', label: 'Semua' },
              { key: 'dibuka', label: 'Dibuka' },
              { key: 'belum-dibuka', label: 'Belum Dibuka' },
              { key: 'ditutup', label: 'Ditutup' },
            ] as const
          ).map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.chipPressed,
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredSesiList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loadingSessions ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingText}>Memuat sesi praktikum...</Text>
            </View>
          ) : (
            <EmptyState
              title="Belum Ada Sesi di Lab Anda"
              message="Jadwal sesi praktikum dibuat oleh Aslab untuk laboratorium yang Anda ampu."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 100 : 32,
  },
  header: {
    gap: 14,
    marginBottom: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.6,
  },
  liveTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  titleBlock: {
    gap: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  scopePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  scopePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 2,
  },
  metricCardDibuka: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  metricCardPresensi: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  metricCardIzin: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
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
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  pendingLeaveBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  pendingLeaveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingLeaveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  pendingLeaveContent: {
    gap: 2,
  },
  pendingLeaveTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingLeaveSubtitle: {
    fontSize: 12,
    color: '#B45309',
  },
  pendingLeaveActionBtn: {
    alignSelf: 'flex-end',
  },
  pendingLeaveActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  mapBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapBannerLeft: {
    flex: 1,
    gap: 4,
  },
  mapBannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mapBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapTag: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  mapTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  mapBannerSub: {
    fontSize: 12,
    color: '#64748B',
  },
  mapBannerBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  mapBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSection: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  chipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
