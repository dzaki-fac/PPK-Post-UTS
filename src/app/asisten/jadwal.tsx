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
          <ThemedText type="defaultSemiBold" style={styles.praktikum}>
            {sesi.praktikum}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <ThemedText type="small" style={styles.statusText}>{statusLabel}</ThemedText>
          </View>
        </View>
        <ThemedText type="default">Kelas: {sesi.kelas}</ThemedText>
        <ThemedText type="small">Tanggal: {sesi.tanggal}</ThemedText>
        <ThemedText type="small">
          Waktu: {sesi.waktuMulai} - {sesi.waktuSelesai}
        </ThemedText>
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
            <ThemedText type="title">📭</ThemedText>
            <ThemedText type="defaultSemiBold">Belum ada jadwal praktikum</ThemedText>
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
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  praktikum: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
