import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
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
  const { getSesiById, bukaSesi, tutupSesi, getPresensiBySesi, daftarPraktikan } = usePraktikum();
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalAction, setModalAction] = useState<'buka' | 'tutup' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    setModalAction('buka');
  };

  const konfirmasiTutupSesi = () => {
    setModalAction('tutup');
  };

  const jalankanAksi = () => {
    if (!modalAction) return;

    setIsProcessing(true);
    const success = modalAction === 'buka' ? bukaSesi(sesi.id) : tutupSesi(sesi.id);
    setIsProcessing(false);
    setModalAction(null);
    setFeedback(
      success
        ? modalAction === 'buka'
          ? 'Sesi berhasil dibuka. Praktikan dapat melakukan presensi.'
          : 'Sesi berhasil ditutup.'
        : modalAction === 'buka'
          ? 'Tidak dapat membuka sesi. Sesi mungkin sudah dibuka atau ditutup.'
          : 'Tidak dapat menutup sesi. Sesi mungkin belum dibuka atau sudah ditutup.'
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
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={styles.backButton}
        >
          <ThemedText type="defaultSemiBold" style={styles.backButtonText}>
            Kembali ke Beranda
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.sessionTitle}>{sesi.praktikum}</ThemedText>
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

      <Modal
        transparent
        visible={modalAction !== null || feedback !== null}
        animationType="fade"
        onRequestClose={() => {
          setModalAction(null);
          setFeedback(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {feedback ? (
              <>
                <ThemedText type="defaultSemiBold">Informasi</ThemedText>
                <ThemedText type="default">{feedback}</ThemedText>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => setFeedback(null)}
                >
                  <ThemedText type="defaultSemiBold" style={styles.modalPrimaryText}>
                    Mengerti
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedText type="defaultSemiBold">
                  {modalAction === 'buka' ? 'Konfirmasi Buka Sesi' : 'Konfirmasi Tutup Sesi'}
                </ThemedText>
                <ThemedText type="default">
                  {modalAction === 'buka'
                    ? `Apakah Anda yakin ingin membuka sesi "${sesi.praktikum} - Kelas ${sesi.kelas}"?`
                    : `Apakah Anda yakin ingin menutup sesi "${sesi.praktikum} - Kelas ${sesi.kelas}"? Setelah ditutup, praktikan tidak dapat melakukan presensi.`}
                </ThemedText>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalAction(null)}
                    disabled={isProcessing}
                  >
                    <ThemedText type="defaultSemiBold">Batal</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryButton,
                      modalAction === 'tutup' && styles.modalDangerButton,
                    ]}
                    onPress={jalankanAksi}
                    disabled={isProcessing}
                  >
                    <ThemedText type="defaultSemiBold" style={styles.modalPrimaryText}>
                      {modalAction === 'buka' ? 'Buka Sesi' : 'Tutup Sesi'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#0D9488',
  },
  backButtonText: {
    color: '#FFFFFF',
  },
  sessionTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#fff',
    gap: Spacing.three,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  modalCancelButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#f3f4f6',
  },
  modalPrimaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    backgroundColor: '#16A34A',
  },
  modalDangerButton: {
    backgroundColor: '#DC2626',
  },
  modalPrimaryText: {
    color: '#fff',
  },
});
