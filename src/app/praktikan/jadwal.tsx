import { Link, type Href } from 'expo-router';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, StatusSesi } from '@/data/types';

function statusLabel(status: StatusSesi) {
  if (status === 'dibuka') return 'Dibuka';
  if (status === 'ditutup') return 'Ditutup';
  return 'Belum dibuka';
}

function statusColor(status: StatusSesi) {
  if (status === 'dibuka') return '#16A34A';
  if (status === 'ditutup') return '#DC2626';
  return '#D89E0B';
}

function SesiCard({ sesi }: { sesi: Sesi }) {
  return (
    <Link href={`/praktikan/detail-sesi/${sesi.id}` as Href} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {sesi.praktikum}
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>Kelas {sesi.kelas}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor(sesi.status) }]}>
            <ThemedText type="smallBold" style={styles.badgeText}>{statusLabel(sesi.status)}</ThemedText>
          </View>
        </View>
        <ThemedText type="small" style={styles.muted}>
          {sesi.tanggal}  ·  {sesi.waktuMulai} - {sesi.waktuSelesai}
        </ThemedText>
        <ThemedText type="small" style={styles.linkText}>Lihat detail sesi</ThemedText>
      </TouchableOpacity>
    </Link>
  );
}

export default function JadwalPraktikanScreen() {
  const { sesiList } = usePraktikum();
  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sesiList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SesiCard sesi={item} />}
        contentContainerStyle={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleGroup: { flex: 1, gap: Spacing.one },
  title: { color: '#0F172A', fontSize: 18, lineHeight: 24 },
  muted: { color: '#64748B' },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, borderRadius: 8 },
  badgeText: { color: '#FFFFFF' },
  linkText: { color: '#0D9488' },
});
