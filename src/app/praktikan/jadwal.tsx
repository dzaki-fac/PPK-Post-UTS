import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SesiCard } from '@/components/sesi-card';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, SesiStatus } from '@/types/praktikum';

type FilterType = 'semua' | SesiStatus;

export default function PraktikanJadwalScreen() {
  const { sesiList, currentPraktikan, isSudahPresensi, presensiList } =
    usePraktikum();
  const [filter, setFilter] = useState<FilterType>('semua');

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return sesiList;
    return sesiList.filter((s) => s.status === filter);
  }, [sesiList, filter]);

  const handleCardPress = (sesi: Sesi) => {
    router.push({
      pathname: '/praktikan/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const renderItem = ({ item }: { item: Sesi }) => {
    const isHadir = currentPraktikan
      ? isSudahPresensi(item.id, currentPraktikan.id)
      : false;

    const presensiItem = currentPraktikan
      ? presensiList.find(
          (p) => p.sesiId === item.id && p.praktikanId === currentPraktikan.id
        )
      : undefined;

    return (
      <SesiCard
        sesi={item}
        isHadir={isHadir}
        waktuHadir={presensiItem?.waktuKehadiran}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
        <Text style={styles.headerSubtitle}>
          Pilih sesi untuk melihat rincian atau mengisi kehadiran
        </Text>

        {/* Filter Chips */}
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

      <FlatList
        data={filteredSesiList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="Tidak Ada Sesi"
            message={
              filter === 'semua'
                ? 'Belum ada jadwal praktikum yang tersedia saat ini.'
                : `Tidak ada sesi dengan status "${filter}".`
            }
            actionText={filter !== 'semua' ? 'Tampilkan Semua Sesi' : undefined}
            onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
          />
        }
      />
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EA580C', // LocalGuide Red-Orange
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
    fontWeight: '600',
  },
  chipTextInactive: {
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    marginLeft: 6,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
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
  listContainer: {
    paddingVertical: 10,
    paddingBottom: 30,
  },
});
