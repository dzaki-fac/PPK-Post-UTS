import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { usePraktikum } from '@/context/praktikum-context';
import { RiwayatItem } from '@/types/praktikum';

export default function PraktikanRiwayatScreen() {
  const { currentPraktikan, getRiwayatPraktikan, sesiList } = usePraktikum();

  const riwayatList = useMemo(() => {
    if (!currentPraktikan) return [];
    return getRiwayatPraktikan(currentPraktikan.id);
  }, [currentPraktikan, getRiwayatPraktikan]);

  const totalSesiTersedia = sesiList.length;
  const totalHadir = riwayatList.length;

  const renderItem = ({ item }: { item: RiwayatItem }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => {
          if (item.sesiId) {
            router.push({
              pathname: '/praktikan/detail-sesi/[id]',
              params: { id: item.sesiId },
            });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Riwayat presensi ${item.sesi?.praktikum ?? 'Praktikum'}`}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.praktikumTitle}>
              {item.sesi?.praktikum ?? 'Praktikum'}
            </Text>
            {item.sesi?.kelas ? (
              <View style={styles.kelasChip}>
                <Text style={styles.kelasText}>{item.sesi.kelas}</Text>
              </View>
            ) : null}
          </View>
          <StatusBadge status="hadir" size="small" />
        </View>

        {item.sesi?.materi ? (
          <Text style={styles.materiText} numberOfLines={2}>
            {item.sesi.materi}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Jadwal Sesi:</Text>
            <Text style={styles.detailValue}>
              {item.sesi?.tanggal} • {item.sesi?.waktuMulai} -{' '}
              {item.sesi?.waktuSelesai} WIB
            </Text>
          </View>
        </View>

        <View style={styles.timestampContainer}>
          <Text style={styles.timestampIcon}>🕒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.timestampLabel}>Waktu Presensi Tercatat:</Text>
            <Text style={styles.timestampValue}>{item.waktuKehadiran}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Kehadiran</Text>
        <Text style={styles.headerSubtitle}>
          Daftar sesi praktikum yang telah Anda hadiri dan catat presensinya
        </Text>

        {/* Attendance Statistics Banner */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalHadir}</Text>
            <Text style={styles.statLabel}>Sesi Dihadiri</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalSesiTersedia}</Text>
            <Text style={styles.statLabel}>Total Sesi Terjadwal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>
              {totalSesiTersedia > 0
                ? `${Math.round((totalHadir / totalSesiTersedia) * 100)}%`
                : '0%'}
            </Text>
            <Text style={styles.statLabel}>Tingkat Kehadiran</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={riwayatList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="Belum Ada Riwayat Presensi"
            message={`Praktikan ${currentPraktikan?.nama ?? ''} belum memiliki catatan presensi. Buka tab Jadwal untuk melakukan presensi pada sesi yang dibuka.`}
            actionText="Lihat Jadwal Praktikum"
            onAction={() => router.push('/praktikan/jadwal')}
          />
        }
      />
    </SafeAreaView>
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
    paddingBottom: 16,
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
    marginBottom: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  listContainer: {
    paddingVertical: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  praktikumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kelasText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  materiText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  detailsRow: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  timestampContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestampIcon: {
    fontSize: 16,
  },
  timestampLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  timestampValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 1,
  },
});
