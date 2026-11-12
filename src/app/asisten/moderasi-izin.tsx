import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { LeaveCard } from '@/components/leave-card';
import { usePraktikum } from '@/context/praktikum-context';
import {
  LeaveRequestDocument,
  LeaveStatus,
  reviewLeaveRequest,
  subscribeLeaveRequests,
} from '@/services/leave-service';

type FilterType = 'semua' | LeaveStatus;

export default function ModerasiIzinScreen() {
  const { currentAsisten } = usePraktikum();

  const [requests, setRequests] = useState<LeaveRequestDocument[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('menunggu');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // State Modal Konfirmasi Persetujuan
  const [approveTarget, setApproveTarget] = useState<LeaveRequestDocument | null>(null);

  // State Modal Konfirmasi Penolakan
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestDocument | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Subscribe ke antrean Firestore /leave_requests secara real-time
  useEffect(() => {
    const unsubscribe = subscribeLeaveRequests((data) => {
      setRequests(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter permohonan sesuai tab aktif
  const filteredRequests = useMemo(() => {
    if (activeFilter === 'semua') return requests;
    return requests.filter((r) => r.status === activeFilter);
  }, [requests, activeFilter]);

  // Statistik Ringkasan Metrik
  const stats = useMemo(() => {
    const total = requests.length;
    const menunggu = requests.filter((r) => r.status === 'menunggu').length;
    const disetujui = requests.filter((r) => r.status === 'disetujui').length;
    const ditolak = requests.filter((r) => r.status === 'ditolak').length;
    return { total, menunggu, disetujui, ditolak };
  }, [requests]);

  // Handler Persetujuan
  const handleConfirmApprove = async () => {
    if (!approveTarget) return;

    setIsProcessing(true);
    try {
      await reviewLeaveRequest(
        approveTarget.id,
        'disetujui',
        'Izin telah disetujui oleh asisten laboratorium.',
        currentAsisten?.id || 'asisten-lab',
        currentAsisten?.nama || 'Asisten Laboratorium'
      );
      setApproveTarget(null);
    } catch (err) {
      console.warn('Gagal menyetujui izin:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler Penolakan
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;

    if (!rejectNotes.trim()) {
      setRejectError('Mohon isi catatan atau alasan penolakan izin.');
      return;
    }

    setIsProcessing(true);
    setRejectError(null);

    try {
      await reviewLeaveRequest(
        rejectTarget.id,
        'ditolak',
        rejectNotes.trim(),
        currentAsisten?.id || 'asisten-lab',
        currentAsisten?.nama || 'Asisten Laboratorium'
      );
      setRejectTarget(null);
      setRejectNotes('');
    } catch (err) {
      console.warn('Gagal menolak izin:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Breadcrumb Navigasi */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali ke Kelola Sesi"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/asisten/jadwal');
          }
        }}
        style={({ pressed }) => [styles.breadcrumbPill, pressed && styles.pressed]}>
        <Text style={styles.breadcrumbText}>← Kembali ke Kelola Sesi</Text>
      </Pressable>

      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>PANEL ASISTEN LABORATORIUM</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Sinkronisasi Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Moderasi Izin Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Tinjau permohonan izin praktikan berhalangan hadir dengan rekomendasi awal dari Model AI
        Pengajar (Model EDOM on-device).
      </Text>

      {/* Banner Human-in-the-Loop */}
      <View style={styles.hitlBanner}>
        <View style={styles.hitlIconCircle}>
          <Text style={styles.hitlIconText}>i</Text>
        </View>
        <View style={styles.hitlTextWrap}>
          <Text style={styles.hitlTitle}>Prinsip Human-in-the-Loop (Regulasi AI):</Text>
          <Text style={styles.hitlDesc}>
            Hasil inferensi model AI bertindak semata-mata sebagai pendukung keputusan (decision support).
            Hak persetujuan maupun penolakan izin mutlak berada pada keputusan Asisten Laboratorium.
          </Text>
        </View>
      </View>

      {/* Grid Metrik Ringkasan */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{stats.total}</Text>
          <Text style={styles.metricLbl}>Total Permohonan</Text>
          <Text style={styles.metricDesc}>Semua Data Masuk</Text>
        </View>

        <View
          style={[
            styles.metricCard,
            stats.menunggu > 0 && styles.metricCardPending,
          ]}>
          <Text
            style={[
              styles.metricVal,
              { color: stats.menunggu > 0 ? '#D97706' : '#0F172A' },
            ]}>
            {stats.menunggu}
          </Text>
          <Text style={styles.metricLbl}>Menunggu Verifikasi</Text>
          <Text style={styles.metricDesc}>Perlu Tindakan</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{stats.disetujui}</Text>
          <Text style={styles.metricLbl}>Izin Disetujui</Text>
          <Text style={styles.metricDesc}>Tercatat Izin di Rekap</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#DC2626' }]}>{stats.ditolak}</Text>
          <Text style={styles.metricLbl}>Izin Ditolak</Text>
          <Text style={styles.metricDesc}>Disertai Evaluasi</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(
          [
            { key: 'menunggu', label: `Menunggu (${stats.menunggu})` },
            { key: 'semua', label: `Semua (${stats.total})` },
            { key: 'disetujui', label: `Disetujui (${stats.disetujui})` },
            { key: 'ditolak', label: `Ditolak (${stats.ditolak})` },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              onPress={() => setActiveFilter(tab.key)}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeaveCard
            request={item}
            isProcessing={isProcessing}
            onApprove={(target) => setApproveTarget(target)}
            onReject={(target) => {
              setRejectTarget(target);
              setRejectNotes('');
              setRejectError(null);
            }}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Tidak Ada Permohonan Izin"
            message={
              activeFilter === 'menunggu'
                ? 'Semua permohonan izin praktikan telah diverifikasi. Tidak ada antrean pending.'
                : 'Belum ada data pengajuan izin pada kategori filter ini.'
            }
          />
        }
      />

      {/* Modal Dialog Konfirmasi Persetujuan */}
      <ConfirmationModal
        visible={Boolean(approveTarget)}
        title="Setujui Izin Praktikum?"
        description={`Anda akan menyetujui permohonan izin dari ${approveTarget?.studentName} (${approveTarget?.studentNim}) untuk sesi ${approveTarget?.sessionName}. Status kehadiran mahasiswa akan otomatis tercatat 'Izin' pada rekap kelas.`}
        confirmText="Ya, Setujui Izin"
        cancelText="Batal"
        confirmVariant="success"
        isLoading={isProcessing}
        onConfirm={handleConfirmApprove}
        onCancel={() => setApproveTarget(null)}
      />

      {/* Modal Dialog Konfirmasi Penolakan dengan Input Catatan */}
      <ConfirmationModal
        visible={Boolean(rejectTarget)}
        title="Tolak Izin Praktikum?"
        description={`Berikan catatan evaluasi alasan penolakan izin kepada ${rejectTarget?.studentName}:`}
        confirmText="Tolak Permohonan"
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={isProcessing}
        onConfirm={handleConfirmReject}
        onCancel={() => {
          setRejectTarget(null);
          setRejectError(null);
        }}>
        <View style={styles.modalInputGroup}>
          <TextInput
            multiline
            numberOfLines={3}
            value={rejectNotes}
            onChangeText={(txt) => {
              setRejectNotes(txt);
              if (rejectError) setRejectError(null);
            }}
            placeholder="Contoh: Bukti surat keterangan dokter belum valid atau tanggal surat tidak sesuai."
            placeholderTextColor="#94A3B8"
            style={styles.modalTextInput}
          />
          {rejectError ? (
            <Text style={styles.modalErrorText}>{rejectError}</Text>
          ) : null}
        </View>
      </ConfirmationModal>
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
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 16,
    paddingBottom: 90,
    gap: 14,
  },
  header: {
    marginBottom: 8,
    gap: 14,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
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
  hitlBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  hitlIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  hitlIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  hitlTextWrap: {
    flex: 1,
    gap: 2,
  },
  hitlTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  hitlDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  metricCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  modalInputGroup: {
    gap: 6,
    marginVertical: 4,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalErrorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
