import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
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
  const persentase =
    totalSesiTersedia > 0
      ? Math.round((totalHadir / totalSesiTersedia) * 100)
      : 0;

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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>REKAP PRIBADI</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Data Tersinkron</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Riwayat Kehadiran</Text>
      <Text style={styles.headerSubtitle}>
        Daftar sesi praktikum yang telah dihadiri oleh {currentPraktikan?.nama ?? 'Praktikan'}
      </Text>

      {/* Metrics Banner */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalHadir}</Text>
          <Text style={styles.metricLbl}>Sesi Dihadiri</Text>
          <Text style={styles.metricDesc}>Tercatat Hadir</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalSesiTersedia}</Text>
          <Text style={styles.metricLbl}>Total Sesi</Text>
          <Text style={styles.metricDesc}>Jadwal Praktikum</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardActive]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{persentase}%</Text>
          <Text style={styles.metricLbl}>Keaktifan</Text>
          <Text style={styles.metricDesc}>Persentase Hadir</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={riwayatList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="Belum Ada Riwayat Presensi"
            message={`Praktikan ${currentPraktikan?.nama ?? ''} belum memiliki catatan presensi. Buka tab Jadwal untuk melakukan presensi pada sesi yang sedang dibuka.`}
            actionText="Lihat Jadwal Praktikum"
            onAction={() => router.push('/praktikan/jadwal')}
          />
        }
      />
    </View>
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
  metricCardActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
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
    fontWeight: '800',
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
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailsRow: {
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  timestampIcon: {
    fontSize: 16,
  },
  timestampLabel: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  timestampValue: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 1,
  },
});
