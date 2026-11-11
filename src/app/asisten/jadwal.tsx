import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SesiCard } from '@/components/sesi-card';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, SesiStatus } from '@/types/praktikum';

type FilterType = 'semua' | SesiStatus;

export default function JadwalAsistenScreen() {
  const { sesiList, presensiList } = usePraktikum();
  const [filter, setFilter] = useState<FilterType>('semua');

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return sesiList;
    return sesiList.filter((s) => s.status === filter);
  }, [sesiList, filter]);

  const totalSesi = sesiList.length;
  const totalDibuka = sesiList.filter((s) => s.status === 'dibuka').length;
  const totalPresensiMasuk = presensiList.length;
  const totalDitutup = sesiList.filter((s) => s.status === 'ditutup').length;

  const handleCardPress = (sesi: Sesi) => {
    router.push({
      pathname: '/asisten/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const renderItem = ({ item }: { item: Sesi }) => {
    const totalHadir = presensiList.filter((p) => p.sesiId === item.id).length;

    return (
      <SesiCard
        sesi={item}
        role="asisten"
        totalHadir={totalHadir}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Eyebrow & Live Indicator */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>ASISTEN LABORATORIUM</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Kontrol Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Pengelolaan Sesi Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Buka sesi praktikum, pantau presensi kehadiran mahasiswa, atau tutup sesi setelah kegiatan selesai
      </Text>

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

        <View style={[styles.metricCard, styles.metricCardPresensi]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalPresensiMasuk}</Text>
          <Text style={styles.metricLbl}>Total Presensi</Text>
          <Text style={styles.metricDesc}>Mahasiswa Hadir</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalDitutup}</Text>
          <Text style={styles.metricLbl}>Sesi Ditutup</Text>
          <Text style={styles.metricDesc}>Selesai Dikelola</Text>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Berdasarkan Status Sesi:</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Semua"
            active={filter === 'semua'}
            count={sesiList.length}
            onPress={() => setFilter('semua')}
          />
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
          <EmptyState
            icon="📅"
            title="Tidak Ada Sesi"
            message={
              filter === 'semua'
                ? 'Belum ada jadwal praktikum yang tersedia saat ini.'
                : `Tidak ada sesi praktikum dengan status "${filter}".`
            }
            actionText={filter !== 'semua' ? 'Tampilkan Semua Sesi' : undefined}
            onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
          />
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
  variant?: SesiStatus;
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
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
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
  metricCardPresensi: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
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
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
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
});
