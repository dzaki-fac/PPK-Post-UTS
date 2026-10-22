import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { StatusSesi, Praktikan } from '@/data/types';

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

export default function DetailSesiAsistenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSesiById, bukaSesi, tutupSesi, getPresensiBySesi, daftarPraktikan, presensiList } = usePraktikum();
  const [isProcessing, setIsProcessing] = useState(false);

  const sesi = getSesiById(id);

  if (!sesi) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyState}>
            <ThemedText type="title">❌</ThemedText>
            <ThemedText type="defaultSemiBold">Sesi tidak ditemukan</ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText type="default" style={styles.link}>Kembali ke Jadwal</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const statusColor = getStatusColor(sesi.status);
  const statusLabel = getStatusLabel(sesi.status);
  const presensiSesi = getPresensiBySesi(sesi.id);

  const konfirmasiBukaSesi = () => {
    Alert.alert(
      'Konfirmasi Buka Sesi',
      `Apakah Anda yakin ingin membuka sesi "${sesi.praktikum} - Kelas ${sesi.kelas}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buka Sesi',
          onPress: () => {
            setIsProcessing(true);
            const success = bukaSesi(sesi.id);
            setIsProcessing(false);
            if (success) {
              Alert.alert('Berhasil', 'Sesi berhasil dibuka. Praktikan dapat melakukan presensi.');
            } else {
              Alert.alert('Gagal', 'Tidak dapat membuka sesi. Sesi mungkin sudah dibuka atau ditutup.');
            }
          },
        },
      ]
    );
  };

  const konfirmasiTutupSesi = () => {
    Alert.alert(
      'Konfirmasi Tutup Sesi',
      `Apakah Anda yakin ingin menutup sesi "${sesi.praktikum} - Kelas ${sesi.kelas}"?\n\nSetelah ditutup, praktikan tidak dapat melakukan presensi.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tutup Sesi',
          style: 'destructive',
          onPress: () => {
            setIsProcessing(true);
            const success = tutupSesi(sesi.id);
            setIsProcessing(false);
            if (success) {
              Alert.alert('Berhasil', 'Sesi berhasil ditutup.');
            } else {
              Alert.alert('Gagal', 'Tidak dapat menutup sesi. Sesi mungkin belum dibuka atau sudah ditutup.');
            }
          },
        },
      ]
    );
  };

  const getPraktikanById = (id: string): Praktikan | undefined => {
    return daftarPraktikan.find((p) => p.id === id);
  };

  const formatWaktu = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.header}>
            <ThemedText type="title">{sesi.praktikum}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <ThemedText type="small" style={styles.statusText}>{statusLabel}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">Kelas:</ThemedText>
            <ThemedText type="default">{sesi.kelas}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">Tanggal:</ThemedText>
            <ThemedText type="default">{sesi.tanggal}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold">Waktu:</ThemedText>
            <ThemedText type="default">{sesi.waktuMulai} - {sesi.waktuSelesai}</ThemedText>
          </View>
        </View>

        <View style={styles.actionSection}>
          {sesi.status === 'belum-dibuka' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.bukaButton]}
              onPress={konfirmasiBukaSesi}
              disabled={isProcessing}
            >
              <ThemedText type="defaultSemiBold" style={styles.actionButtonText}>
                🔓 Buka Sesi
              </ThemedText>
            </TouchableOpacity>
          )}

          {sesi.status === 'dibuka' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.tutupButton]}
              onPress={konfirmasiTutupSesi}
              disabled={isProcessing}
            >
              <ThemedText type="defaultSemiBold" style={styles.actionButtonText}>
                🔒 Tutup Sesi
              </ThemedText>
            </TouchableOpacity>
          )}

          {sesi.status === 'ditutup' && (
            <View style={styles.closedInfo}>
              <ThemedText type="default">✅ Sesi telah ditutup</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.rekapSection}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Rekap Kehadiran ({presensiSesi.length} hadir)
          </ThemedText>

          {presensiSesi.length === 0 ? (
            <View style={styles.emptyRekap}>
              <ThemedText type="small">Belum ada praktikan yang hadir</ThemedText>
            </View>
          ) : (
            presensiSesi.map((p) => {
              const praktikan = getPraktikanById(p.praktikanId);
              return (
                <View key={p.id} style={styles.rekapItem}>
                  <View style={styles.rekapInfo}>
                    <ThemedText type="defaultSemiBold">{praktikan?.nama || 'Unknown'}</ThemedText>
                    <ThemedText type="small">{praktikan?.nim || '-'}</ThemedText>
                  </View>
                  <ThemedText type="small">{formatWaktu(p.waktuKehadiran)}</ThemedText>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionSection: {
    marginBottom: Spacing.three,
  },
  actionButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  bukaButton: {
    backgroundColor: '#16A34A',
  },
  tutupButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#fff',
  },
  closedInfo: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  rekapSection: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  emptyRekap: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  rekapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rekapInfo: {
    gap: Spacing.one,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  link: {
    color: '#0D9488',
    textDecorationLine: 'underline',
  },
});
