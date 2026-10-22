import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function RiwayatPraktikanScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.emptyState}>
        <ThemedText type="subtitle" style={styles.title}>Belum ada riwayat</ThemedText>
        <ThemedText type="small" style={styles.description}>
          Presensi yang berhasil akan muncul di halaman ini.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  title: { color: '#0F172A', fontSize: 24, lineHeight: 30 },
  description: { color: '#64748B', textAlign: 'center' },
});
