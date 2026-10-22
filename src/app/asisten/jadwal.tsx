import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, StatusSesi } from '@/data/types';

function getStatusColor(status: StatusSesi): string {
  switch (status) {
    case 'dibuka':
      return '#16A34A';
    case 'ditutup':
      return '#DC2626';
    default:
      return '#EAB308';
  }
}

function getStatusLabel(status: StatusSesi): string {
  switch (status) {
    case 'dibuka':
      return 'Dibuka';
    case 'ditutup':
      return 'Ditutup';
    default:
      return 'Belum Dibuka';
  }
}

function SesiCard({ sesi }: { sesi: Sesi }) {
  const statusColor = getStatusColor(sesi.status);
  const statusLabel = getStatusLabel(sesi.status);

  return (
    <Link href={`/asisten/detail-sesi/${sesi.id}`} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <ThemedText type="defaultSemiBold" style={styles.praktikum}>
              {sesi.praktikum}
            </ThemedText>
            <ThemedText type="small" style={styles.classLabel}>Kelas {sesi.kelas}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <ThemedText type="smallBold" style={styles.statusText}>{statusLabel}</ThemedText>
          </View>
        </View>
        <View style={styles.metaRow}>
          <ThemedText type="small" style={styles.metaText}>{sesi.tanggal}</ThemedText>
          <ThemedText type="small" style={styles.metaText}>
            {sesi.waktuMulai} - {sesi.waktuSelesai}
          </ThemedText>
        </View>
        <ThemedText type="small" style={styles.openHint}>Buka detail sesi</ThemedText>
      </TouchableOpacity>
    </Link>
  );
}

export default function JadwalAsistenScreen() {
  const { sesiList } = usePraktikum();

  if (sesiList.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>Jadwal kosong</ThemedText>
            <ThemedText type="small" style={styles.emptyDescription}>
              Belum ada sesi praktikum yang tersedia.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sesiList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SesiCard sesi={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  listContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  praktikum: {
    color: '#0F172A',
    fontSize: 18,
    lineHeight: 24,
  },
  titleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  classLabel: {
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaText: {
    color: '#475569',
  },
  openHint: {
    color: '#0D9488',
    marginTop: Spacing.one,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 24,
    lineHeight: 30,
  },
  emptyDescription: {
    color: '#64748B',
  },
});
