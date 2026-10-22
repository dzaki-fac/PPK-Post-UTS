import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { StatusSesi } from '@/data/types';

function statusLabel(status: StatusSesi) {
  if (status === 'dibuka') return 'Dibuka';
  if (status === 'ditutup') return 'Ditutup';
  return 'Belum dibuka';
}

export default function DetailSesiPraktikanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSesiById, pengguna, tandaiPresensi, sudahPresensi } = usePraktikum();
  const sesi = getSesiById(id);
  const praktikanId = pengguna?.peran === 'praktikan' ? pengguna.data.id : '';

  if (!sesi) {
    return <ThemedView style={styles.container}><ThemedText>Sesi tidak ditemukan.</ThemedText></ThemedView>;
  }

  const sudahHadir = sudahPresensi(sesi.id, praktikanId);
  const handlePresensi = () => {
    tandaiPresensi(sesi.id, praktikanId);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.replace('/praktikan/jadwal')} style={styles.backButton}>
          <ThemedText type="smallBold" style={styles.backText}>Kembali ke jadwal</ThemedText>
        </TouchableOpacity>
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>{sesi.praktikum}</ThemedText>
          <ThemedText type="default">Kelas {sesi.kelas}</ThemedText>
          <ThemedText type="small" style={styles.muted}>{sesi.tanggal}  ·  {sesi.waktuMulai} - {sesi.waktuSelesai}</ThemedText>
          <ThemedText type="defaultSemiBold">Status: {statusLabel(sesi.status)}</ThemedText>
          <TouchableOpacity
            disabled={sesi.status !== 'dibuka' || sudahHadir}
            onPress={handlePresensi}
            style={[styles.actionButton, (sesi.status !== 'dibuka' || sudahHadir) && styles.disabledButton]}
          >
            <ThemedText type="defaultSemiBold" style={styles.actionText}>
              {sudahHadir ? 'Presensi sudah tercatat' : sesi.status === 'dibuka' ? 'Catat presensi' : 'Presensi belum tersedia'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  backButton: { alignSelf: 'flex-start', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 8, backgroundColor: '#F0FDFA' },
  backText: { color: '#0D9488' },
  card: { padding: Spacing.four, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', gap: Spacing.two },
  title: { color: '#0F172A', fontSize: 28, lineHeight: 34 },
  muted: { color: '#64748B' },
  actionButton: { padding: Spacing.three, borderRadius: 10, alignItems: 'center', backgroundColor: '#0D9488' },
  disabledButton: { backgroundColor: '#CBD5E1' },
  actionText: { color: '#FFFFFF' },
});
