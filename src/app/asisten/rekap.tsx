import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, StatusSesi, Praktikan, Presensi } from '@/data/types';

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

function formatWaktu(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTanggal(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type RekapItem = {
  sesi: Sesi;
  presensiList: Array<{ presensi: Presensi; praktikan: Praktikan }>;
};

export default function RekapAsistenScreen() {
  const { sesiList, presensiList, daftarPraktikan } = usePraktikum();

  // Build rekap data: sesi yang dibuka atau ditutup dengan daftar hadir
  const rekapData: RekapItem[] = sesiList
    .filter((sesi) => sesi.status === 'dibuka' || sesi.status === 'ditutup')
    .map((sesi) => {
      const presensiSesi = presensiList
        .filter((p) => p.sesiId === sesi.id)
        .map((p) => {
          const praktikan = daftarPraktikan.find((pr) => pr.id === p.praktikanId);
          return { presensi: p, praktikan: praktikan! };
        })
        .filter((item) => item.praktikan);

      return { sesi, presensiList: presensiSesi };
    });

  if (rekapData.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <ThemedText type="title" style={styles.emptyIcon}>📋</ThemedText>
            <ThemedText type="defaultSemiBold">Belum ada rekap presensi</ThemedText>
            <ThemedText type="small" style={styles.emptyDesc}>
              Rekap akan muncul setelah Anda membuka sesi praktikum
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const renderRekapItem = ({ item }: { item: RekapItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.sesiInfo}>
          <ThemedText type="defaultSemiBold">{item.sesi.praktikum}</ThemedText>
          <ThemedText type="small">Kelas {item.sesi.kelas} • {formatTanggal(item.sesi.tanggal)}</ThemedText>
        </View>
        <View style={styles.badge}>
          <ThemedText type="small">{getStatusLabel(item.sesi.status)}</ThemedText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.hadirInfo}>
        <ThemedText type="small" style={styles.hadirLabel}>
          Hadir: {item.presensiList.length} praktikan
        </ThemedText>
      </View>

      {item.presensiList.length === 0 ? (
        <View style={styles.noHadir}>
          <ThemedText type="small">Belum ada yang hadir</ThemedText>
        </View>
      ) : (
        item.presensiList.map(({ presensi, praktikan }) => (
          <View key={presensi.id} style={styles.praktikanRow}>
            <View style={styles.praktikanInfo}>
              <ThemedText type="default">{praktikan.nama}</ThemedText>
              <ThemedText type="small">{praktikan.nim}</ThemedText>
            </View>
            <ThemedText type="small" style={styles.waktu}>
              {formatWaktu(presensi.waktuKehadiran)}
            </ThemedText>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={rekapData}
        keyExtractor={(item) => item.sesi.id}
        renderItem={renderRekapItem}
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
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sesiInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    backgroundColor: '#f3f4f6',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: Spacing.one,
  },
  hadirInfo: {
    paddingBottom: Spacing.one,
  },
  hadirLabel: {
    fontWeight: '600',
  },
  noHadir: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  praktikanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  praktikanInfo: {
    gap: Spacing.one,
  },
  waktu: {
    color: '#16A34A',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyDesc: {
    textAlign: 'center',
    color: '#6b7280',
  },
});
