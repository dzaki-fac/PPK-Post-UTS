import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { LeaveCard } from '@/components/leave-card';
import { useAuth } from '@/context/auth-context';
import { usePraktikum } from '@/context/praktikum-context';
import {
  LeaveRequestDocument,
  LeaveStatus,
  reviewLeaveRequest,
  subscribeLeaveRequests,
} from '@/services/leave-service';
import { subscribeSessions, subscribeSessionsByLabIds } from '@/services/session-service';
import type { SessionDocument } from '@/types/praktikum';

type FilterType = 'semua' | LeaveStatus;

export default function ModerasiIzinScreen() {
  const { userDoc } = useAuth();
  const { currentAsisten } = usePraktikum();

  const reviewerUid = userDoc?.uid || currentAsisten?.id || 'asisten-lab';
  const reviewerName = userDoc?.nama || currentAsisten?.nama || 'Asisten Praktikum';

  const [requests, setRequests] = useState<LeaveRequestDocument[]>([]);
  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('semua');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const assignedLabIds = useMemo(() => userDoc?.labIds ?? [], [userDoc?.labIds]);

  // State Modal Konfirmasi Persetujuan & Error
  const [approveTarget, setApproveTarget] = useState<LeaveRequestDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // State Modal Konfirmasi Penolakan
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestDocument | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Subscribe ke antrean Firestore /leave_requests dan sesi lab yang diampu Asprak secara real-time
  useEffect(() => {
    const unsubscribe = subscribeLeaveRequests((data) => {
      setRequests(data);
    });

    const unsubSessions =
      assignedLabIds.length > 0
        ? subscribeSessionsByLabIds(
            assignedLabIds,
            (items) => {
              setSessions(items);
              setSessionsLoaded(true);
            },
            () => setSessionsLoaded(true)
          )
        : subscribeSessions(
            (items) => {
              setSessions(items);
              setSessionsLoaded(true);
            },
            () => setSessionsLoaded(true)
          );

    return () => {
      unsubscribe();
      unsubSessions();
    };
  }, [assignedLabIds]);

  const scopedRequests = useMemo(() => {
    if (assignedLabIds.length === 0) return requests;
    if (!sessionsLoaded) return [];
    return requests.filter((r) => sessions.some((s) => s.id === r.sessionId));
  }, [assignedLabIds, sessionsLoaded, sessions, requests]);

  // Filter permohonan sesuai tab aktif
  const filteredRequests = useMemo(() => {
    if (activeFilter === 'semua') return scopedRequests;
    return scopedRequests.filter((r) => r.status === activeFilter);
  }, [scopedRequests, activeFilter]);

  // Statistik Ringkasan Metrik
  const stats = useMemo(() => {
    const total = scopedRequests.length;
    const menunggu = scopedRequests.filter((r) => r.status === 'menunggu').length;
    const disetujui = scopedRequests.filter((r) => r.status === 'disetujui').length;
    const ditolak = scopedRequests.filter((r) => r.status === 'ditolak').length;
    return { total, menunggu, disetujui, ditolak };
  }, [scopedRequests]);

  // Handler Persetujuan
  const handleConfirmApprove = async () => {
    if (!approveTarget) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      await reviewLeaveRequest(
        approveTarget.id,
        'disetujui',
        'Izin telah disetujui oleh Asprak sebagai tidak hadir dengan izin.',
        reviewerUid,
        reviewerName
      );
      setApproveTarget(null);
    } catch (err) {
      setApproveTarget(null);
      setActionError(
        err instanceof Error ? err.message : 'Gagal menyetujui pengajuan izin.'
      );
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
        reviewerUid,
        reviewerName
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
          <Text style={styles.eyebrowText}>PANEL ASPRAK</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Moderasi Izin Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Tinjau dan tetapkan persetujuan permohonan izin praktikan.
      </Text>

      {actionError ? (
        <View style={{ backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B91C1C' }}>{actionError}</Text>
        </View>
      ) : null}

      <View style={styles.hitlBanner}>
        <View style={styles.hitlTextWrap}>
          <Text style={styles.hitlDesc}>
            Izin yang disetujui dicatat sebagai tidak hadir dengan izin dan bebas denda keterlambatan.
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {(
          [
            { key: 'semua', label: `Semua (${stats.total})` },
            { key: 'menunggu', label: `Menunggu (${stats.menunggu})` },
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
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRequests}
        extraData={activeFilter}
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
        ListHeaderComponent={renderHeader()}
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
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  breadcrumbText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D9488',
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
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    lineHeight: Platform.OS === 'web' ? 34 : 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
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
    gap: 10,
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
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 2,
    paddingRight: 12,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
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
