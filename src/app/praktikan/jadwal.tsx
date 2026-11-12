import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SesiCard } from '@/components/sesi-card';
import { useAuth } from '@/context/auth-context';
import {
  normalizeClassCode,
  subscribeStudentAttendances,
} from '@/services/attendance-service';
import { subscribeSessions } from '@/services/session-service';
import { AttendanceDocument, SessionDocument, SessionStatus } from '@/types/praktikum';

type FilterType = 'semua' | 'kelas-saya' | SessionStatus;

export default function PraktikanJadwalScreen() {
  const { userDoc } = useAuth();
  const [sesiList, setSesiList] = useState<SessionDocument[]>([]);
  const [myAttendances, setMyAttendances] = useState<AttendanceDocument[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filter, setFilter] = useState<FilterType>('semua');

  useEffect(() => {
    const unsubSessions = subscribeSessions(
      (items) => {
        setSesiList(items);
        setLoadingSessions(false);
      },
      () => {
        setLoadingSessions(false);
      }
    );

    let unsubAttendances: (() => void) | null = null;
    if (userDoc?.uid) {
      unsubAttendances = subscribeStudentAttendances(userDoc.uid, (items) => {
        setMyAttendances(items);
      });
    }

    return () => {
      unsubSessions();
      if (unsubAttendances) {
        unsubAttendances();
      }
    };
  }, [userDoc?.uid]);

  const studentClass = normalizeClassCode(userDoc?.kelas);

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return sesiList;
    if (filter === 'kelas-saya') {
      if (!studentClass) return sesiList;
      return sesiList.filter((s) => normalizeClassCode(s.kelas) === studentClass);
    }
    return sesiList.filter((s) => s.status === filter);
  }, [sesiList, filter, studentClass]);

  const totalSesi = sesiList.length;
  const totalDibuka = sesiList.filter((s) => s.status === 'dibuka').length;
  const totalSudahHadir = myAttendances.length;
  const totalBelumBuka = sesiList.filter((s) => s.status === 'belum-dibuka').length;

  const handleCardPress = (sesi: SessionDocument) => {
    router.push({
      pathname: '/praktikan/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const renderItem = ({ item }: { item: SessionDocument }) => {
    const presensiItem = myAttendances.find((p) => p.sessionId === item.id);
    const isHadir = Boolean(presensiItem);

    return (
      <SesiCard
        sesi={item}
        role="praktikan"
        isHadir={isHadir}
        waktuHadir={presensiItem?.waktuKehadiran}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Eyebrow & Live Indicator */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>PORTAL MAHASISWA</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Sesi Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Pilih sesi praktikum untuk mengisi formulir presensi mandiri atau melihat detail materi
      </Text>

      {/* Banner Ajukan Izin */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajukan Izin Praktikum"
        onPress={() => router.push('/praktikan/pengajuan-izin')}
        style={({ pressed }) => [styles.izinBanner, pressed && styles.cardPressed]}>
        <View style={styles.izinBannerLeft}>
          <Text style={styles.izinBannerTitle}>Pengajuan Izin Praktikum</Text>
          <Text style={styles.izinBannerSub}>
            Berhalangan hadir? Ajukan izin dengan analisis rekomendasi Model AI EDOM
          </Text>
        </View>
        <View style={styles.izinBannerBtn}>
          <Text style={styles.izinBannerBtnText}>Ajukan Izin →</Text>
        </View>
      </Pressable>

      {/* Metrics Overview Cards (Matching Halaman 1 style) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalSesi}</Text>
          <Text style={styles.metricLbl}>Total Sesi</Text>
          <Text style={styles.metricDesc}>Modul PPK & BDD</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardDibuka]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{totalDibuka}</Text>
          <Text style={styles.metricLbl}>Sesi Dibuka</Text>
          <Text style={styles.metricDesc}>Presensi Aktif</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardHadir]}>
          <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalSudahHadir}</Text>
          <Text style={styles.metricLbl}>Sudah Hadir</Text>
          <Text style={styles.metricDesc}>Tercatat Sistem</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalBelumBuka}</Text>
          <Text style={styles.metricLbl}>Belum Buka</Text>
          <Text style={styles.metricDesc}>Sesi Mendatang</Text>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Berdasarkan Status & Kelas:</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Semua"
            active={filter === 'semua'}
            count={sesiList.length}
            onPress={() => setFilter('semua')}
          />
          {userDoc && studentClass ? (
            <FilterChip
              label={`Kelas Saya (${studentClass})`}
              active={filter === 'kelas-saya'}
              count={sesiList.filter((s) => normalizeClassCode(s.kelas) === studentClass).length}
              onPress={() => setFilter('kelas-saya')}
            />
          ) : null}
          <FilterChip
            label="Dibuka"
            active={filter === 'dibuka'}
            count={sesiList.filter((s) => s.status === 'dibuka').length}
            variant="dibuka"
            onPress={() => setFilter('dibuka')}
          />
          <FilterChip
            label="Belum Dibuka"
            active={filter === 'belum-dibuka'}
            count={sesiList.filter((s) => s.status === 'belum-dibuka').length}
            variant="belum-dibuka"
            onPress={() => setFilter('belum-dibuka')}
          />
          <FilterChip
            label="Ditutup"
            active={filter === 'ditutup'}
            count={sesiList.filter((s) => s.status === 'ditutup').length}
            variant="ditutup"
            onPress={() => setFilter('ditutup')}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSesiList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loadingSessions ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.loadingStateText}>
                Menyinkronkan jadwal praktikum dari Firestore...
              </Text>
            </View>
          ) : (
            <EmptyState
              title="Tidak Ada Sesi"
              message={
                filter === 'kelas-saya'
                  ? `Tidak ada sesi praktikum yang terdaftar untuk Kelas ${studentClass || '-'}.`
                  : filter === 'semua'
                  ? 'Belum ada jadwal praktikum yang tersedia saat ini.'
                  : `Tidak ada sesi praktikum dengan status "${filter}".`
              }
              actionText={filter !== 'semua' ? 'Tampilkan Semua Sesi' : undefined}
              onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
            />
          )
        }
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  count,
  variant,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  variant?: SessionStatus;
  onPress: () => void;
}) {
  const getBadgeStyle = () => {
    if (active) return styles.chipActive;
    return styles.chipInactive;
  };

  const getTextStyle = () => {
    if (active) return styles.chipTextActive;
    return styles.chipTextInactive;
  };

  const getDotColor = () => {
    switch (variant) {
      case 'dibuka':
        return '#16A34A';
      case 'belum-dibuka':
        return '#EAB308';
      case 'ditutup':
        return '#DC2626';
      default:
        return undefined;
    }
  };

  const dotColor = getDotColor();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        getBadgeStyle(),
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}>
      {dotColor ? (
        <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
      ) : null}
      <Text style={[styles.chipText, getTextStyle()]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 90,
    gap: 14,
  },
  header: {
    marginBottom: 8,
    gap: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrowBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  metricCardDibuka: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  metricCardHadir: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
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
  filterSection: {
    gap: 8,
    marginTop: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  izinBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  izinBannerLeft: {
    flex: 1,
    gap: 2,
  },
  izinBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
  },
  izinBannerSub: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 16,
  },
  izinBannerBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  izinBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardPressed: {
    opacity: 0.85,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
