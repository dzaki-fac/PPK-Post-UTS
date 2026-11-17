import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AICategoryBadge } from '@/components/ai-category-badge';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import { usePraktikum } from '@/context/praktikum-context';
import { subscribeStudentAttendances } from '@/services/attendance-service';
import {
  LeaveRequestDocument,
  subscribeStudentLeaveRequests,
} from '@/services/leave-service';
import { subscribeSessions } from '@/services/session-service';
import { AttendanceDocument, RiwayatItem, SessionDocument } from '@/types/praktikum';

type ActiveTab = 'presensi' | 'izin';

export default function PraktikanRiwayatScreen() {
  const { user, userDoc } = useAuth();
  const { currentPraktikan, getRiwayatPraktikan, sesiList: dummySesi } = usePraktikum();

  const studentId = userDoc?.uid || user?.uid || currentPraktikan?.id;

  const [activeTab, setActiveTab] = useState<ActiveTab>('presensi');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDocument[]>([]);
  const [firestoreAttendances, setFirestoreAttendances] = useState<AttendanceDocument[]>([]);
  const [firestoreSessions, setFirestoreSessions] = useState<SessionDocument[]>([]);

  // State Modal Detail Pop-up
  const [selectedLeaveModal, setSelectedLeaveModal] = useState<LeaveRequestDocument | null>(null);
  const [selectedPresensiModal, setSelectedPresensiModal] = useState<RiwayatItem | null>(null);

  // Subscribe ke pengajuan izin praktikan, riwayat presensi, dan data sesi secara real-time
  useEffect(() => {
    const unsubSessions = subscribeSessions((items) => {
      setFirestoreSessions(items);
    });

    if (!studentId) {
      return () => {
        unsubSessions();
      };
    }

    const unsubLeaves = subscribeStudentLeaveRequests(
      studentId,
      (data) => {
        setLeaveRequests(data);
      },
      userDoc?.nim
    );

    const unsubAttendances = subscribeStudentAttendances(
      studentId,
      (items) => {
        setFirestoreAttendances(items);
      }
    );

    return () => {
      unsubSessions();
      unsubLeaves();
      unsubAttendances();
    };
  }, [studentId, userDoc?.nim]);

  const effectiveSessions = firestoreSessions.length > 0 ? firestoreSessions : dummySesi;

  const riwayatList: RiwayatItem[] = useMemo(() => {
    if (firestoreAttendances.length > 0) {
      return firestoreAttendances.map((att) => {
        const sesi = effectiveSessions.find((s) => s.id === att.sessionId);
        return {
          id: att.id,
          sesiId: att.sessionId,
          praktikanId: att.studentId,
          waktuKehadiran: att.waktuKehadiran,
          status: 'hadir',
          sesi: sesi,
        } as RiwayatItem;
      });
    }
    if (currentPraktikan) {
      return getRiwayatPraktikan(currentPraktikan.id);
    }
    return [];
  }, [firestoreAttendances, effectiveSessions, currentPraktikan, getRiwayatPraktikan]);

  const totalSesiTersedia = effectiveSessions.length;
  const totalHadir = riwayatList.length;
  const persentase =
    totalSesiTersedia > 0
      ? Math.round((totalHadir / totalSesiTersedia) * 100)
      : 0;

  // Statistik Izin
  const leaveStats = useMemo(() => {
    const total = leaveRequests.length;
    const menunggu = leaveRequests.filter((r) => r.status === 'menunggu').length;
    const disetujui = leaveRequests.filter((r) => r.status === 'disetujui').length;
    const ditolak = leaveRequests.filter((r) => r.status === 'ditolak').length;
    return { total, menunggu, disetujui, ditolak };
  }, [leaveRequests]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Render Kartu Presensi
  const renderPresensiItem = ({ item }: { item: RiwayatItem }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelectedPresensiModal(item)}
        accessibilityRole="button"
        accessibilityLabel={`Riwayat presensi ${item.sesi?.praktikum ?? 'Praktikum'}`}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.praktikumTitle}>
              {item.sesi?.praktikum ?? 'Praktikum'}
            </Text>
            {item.sesi?.kelas ? (
              <View style={styles.kelasChip}>
                <Text style={styles.kelasText}>{item.sesi.kelas}</Text>
              </View>
            ) : null}
          </View>
          <StatusBadge status="hadir" size="small" />
        </View>

        {item.sesi?.materi ? (
          <Text style={styles.materiText} numberOfLines={2}>
            {item.sesi.materi}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Jadwal Sesi:</Text>
            <Text style={styles.detailValue}>
              {item.sesi?.tanggal} • {item.sesi?.waktuMulai} -{' '}
              {item.sesi?.waktuSelesai} WIB
            </Text>
          </View>
        </View>

        <View style={styles.timestampContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timestampLabel}>Waktu Presensi Tercatat:</Text>
            <Text style={styles.timestampValue}>{item.waktuKehadiran}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // Render Kartu Permohonan Izin
  const renderLeaveItem = ({ item }: { item: LeaveRequestDocument }) => {
    const isPending = item.status === 'menunggu';
    const isApproved = item.status === 'disetujui';
    const isRejected = item.status === 'ditolak';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelectedLeaveModal(item)}
        accessibilityRole="button"
        accessibilityLabel={`Buka detail pengajuan izin ${item.sessionName}`}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.praktikumTitle} numberOfLines={2}>
              {item.sessionName}
            </Text>
            <View style={styles.kelasChip}>
              <Text style={styles.kelasText}>{item.studentClass}</Text>
            </View>
          </View>

          {/* Status Badge Sesuai FR-P2-06.2 */}
          <View
            style={[
              styles.leaveStatusPill,
              isPending && styles.leaveStatusPending,
              isApproved && styles.leaveStatusApproved,
              isRejected && styles.leaveStatusRejected,
            ]}>
            <Text
              style={[
                styles.leaveStatusText,
                isPending && { color: '#B45309' },
                isApproved && { color: '#1E40AF' },
                isRejected && { color: '#B91C1C' },
              ]}>
              {isPending && 'Menunggu Verifikasi'}
              {isApproved && 'Izin Disetujui'}
              {isRejected && 'Izin Ditolak'}
            </Text>
          </View>
        </View>

        {/* Alasan Tertulis */}
        <View style={styles.leaveReasonBox}>
          <Text style={styles.leaveReasonLabel}>Alasan Pengajuan:</Text>
          <Text style={styles.leaveReasonText}>{item.alasan}</Text>

          {item.lampiranUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                if (item.lampiranUrl) {
                  Linking.openURL(item.lampiranUrl).catch(() => {});
                }
              }}
              style={({ pressed }) => [styles.linkWrap, pressed && styles.cardPressed]}>
              <Text style={styles.linkText}>Lihat Berkas / Surat Pendukung →</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Badge Rekomendasi AI */}
        <View style={styles.aiBadgeRow}>
          <Text style={styles.aiBadgeTitle}>Klasifikasi AI:</Text>
          <AICategoryBadge
            category={item.aiClassification.category}
            confidence={item.aiClassification.confidence}
            size="small"
          />
        </View>

        {item.aiClassification.rawSummary ? (
          <Text style={styles.aiSummaryHint}>{item.aiClassification.rawSummary}</Text>
        ) : null}

        {/* Catatan Asisten jika Ditolak atau Disetujui */}
        {!isPending && (
          <View
            style={[
              styles.decisionBox,
              isApproved ? styles.decisionBoxApproved : styles.decisionBoxRejected,
            ]}>
            <Text
              style={[
                styles.decisionTitle,
                isApproved ? { color: '#15803D' } : { color: '#B91C1C' },
              ]}>
              Keputusan Asisten: {isApproved ? 'DISETUJUI' : 'DITOLAK'}
            </Text>
            {item.reviewerName ? (
              <Text style={styles.decisionMeta}>
                Ditinjau oleh: {item.reviewerName} • {formatDate(item.reviewedAt)} WIB
              </Text>
            ) : null}
            {item.reviewNotes ? (
              <Text style={styles.decisionNotes}>
                Catatan Asisten: {`"${item.reviewNotes}"`}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.leaveMetaRow}>
          <Text style={styles.leaveMetaText}>
            Diajukan: {formatDate(item.createdAt)} WIB
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>REKAP PRIBADI</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>Data Tersinkron Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Riwayat & Izin Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Daftar kehadiran presensi dan pemantauan status permohonan izin untuk{' '}
        {currentPraktikan?.nama ?? 'Praktikan'}
      </Text>

      {/* Segmented Switcher Navigasi: Presensi vs Permohonan Izin */}
      <View style={styles.segmentedContainer}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('presensi')}
          style={[
            styles.segmentButton,
            activeTab === 'presensi' && styles.segmentButtonActive,
          ]}>
          <Text
            style={[
              styles.segmentText,
              activeTab === 'presensi' && styles.segmentTextActive,
            ]}>
            Kehadiran Presensi ({totalHadir})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab('izin')}
          style={[
            styles.segmentButton,
            activeTab === 'izin' && styles.segmentButtonActive,
          ]}>
          <Text
            style={[
              styles.segmentText,
              activeTab === 'izin' && styles.segmentTextActive,
            ]}>
            Permohonan Izin ({leaveStats.total})
          </Text>
        </Pressable>
      </View>

      {/* Overview Cards sesuai Tab */}
      {activeTab === 'presensi' ? (
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalHadir}</Text>
            <Text style={styles.metricLbl}>Sesi Dihadiri</Text>
            <Text style={styles.metricDesc}>Tercatat Hadir</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalSesiTersedia}</Text>
            <Text style={styles.metricLbl}>Total Sesi</Text>
            <Text style={styles.metricDesc}>Jadwal Praktikum</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardActive]}>
            <Text style={[styles.metricVal, { color: '#16A34A' }]}>{persentase}%</Text>
            <Text style={styles.metricLbl}>Keaktifan</Text>
            <Text style={styles.metricDesc}>Persentase Hadir</Text>
          </View>
        </View>
      ) : (
        <View style={styles.leaveSectionWrap}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{leaveStats.total}</Text>
              <Text style={styles.metricLbl}>Total Permohonan</Text>
              <Text style={styles.metricDesc}>Diajukan</Text>
            </View>

            <View
              style={[
                styles.metricCard,
                leaveStats.menunggu > 0 && styles.metricCardPending,
              ]}>
              <Text
                style={[
                  styles.metricVal,
                  { color: leaveStats.menunggu > 0 ? '#D97706' : '#0F172A' },
                ]}>
                {leaveStats.menunggu}
              </Text>
              <Text style={styles.metricLbl}>Menunggu</Text>
              <Text style={styles.metricDesc}>Sedang Diverifikasi</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>
                {leaveStats.disetujui}
              </Text>
              <Text style={styles.metricLbl}>Disetujui</Text>
              <Text style={styles.metricDesc}>Status Izin Sah</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#DC2626' }]}>
                {leaveStats.ditolak}
              </Text>
              <Text style={styles.metricLbl}>Ditolak</Text>
              <Text style={styles.metricDesc}>Perlu Evaluasi</Text>
            </View>
          </View>

          {/* Tombol Ajukan Izin Baru */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajukan Izin Praktikum Baru"
            onPress={() => router.push('/praktikan/pengajuan-izin')}
            style={({ pressed }) => [styles.newLeaveButton, pressed && styles.cardPressed]}>
            <Text style={styles.newLeaveButtonText}>+ Ajukan Izin Praktikum Baru</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {activeTab === 'presensi' ? (
        <FlatList
          data={riwayatList}
          keyExtractor={(item) => item.id}
          renderItem={renderPresensiItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Belum Ada Riwayat Presensi"
              message={`Praktikan ${currentPraktikan?.nama ?? ''} belum memiliki catatan presensi. Buka tab Jadwal untuk melakukan presensi pada sesi yang sedang dibuka.`}
              actionText="Lihat Jadwal Praktikum"
              onAction={() => router.push('/praktikan/jadwal')}
            />
          }
        />
      ) : (
        <FlatList
          data={leaveRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderLeaveItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Belum Ada Permohonan Izin"
              message="Anda belum pernah mengajukan izin ketidakhadiran praktikum. Jika berhalangan hadir pada sesi mendatang, ajukan izin melalui formulir resmi."
              actionText="+ Ajukan Izin Sekarang"
              onAction={() => router.push('/praktikan/pengajuan-izin')}
            />
          }
        />
      )}

      {/* Modal Popup Detail Permohonan Izin (Issue 7) */}
      <Modal
        visible={Boolean(selectedLeaveModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLeaveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>DETAIL PERMOHONAN IZIN</Text>
                </View>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedLeaveModal?.sessionName}
                </Text>
                <Text style={styles.modalSub}>
                  Kelas {selectedLeaveModal?.studentClass} • Diajukan {formatDate(selectedLeaveModal?.createdAt)} WIB
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedLeaveModal(null)}
                hitSlop={8}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status Badge Box */}
              <View style={styles.modalStatusBox}>
                <Text style={styles.modalSectionLabel}>Status Pengajuan:</Text>
                <View
                  style={[
                    styles.leaveStatusPill,
                    selectedLeaveModal?.status === 'menunggu' && styles.leaveStatusPending,
                    selectedLeaveModal?.status === 'disetujui' && styles.leaveStatusApproved,
                    selectedLeaveModal?.status === 'ditolak' && styles.leaveStatusRejected,
                  ]}>
                  <Text
                    style={[
                      styles.leaveStatusText,
                      selectedLeaveModal?.status === 'menunggu' && { color: '#B45309' },
                      selectedLeaveModal?.status === 'disetujui' && { color: '#1E40AF' },
                      selectedLeaveModal?.status === 'ditolak' && { color: '#B91C1C' },
                    ]}>
                    {selectedLeaveModal?.status === 'menunggu' && 'Menunggu Verifikasi Asisten'}
                    {selectedLeaveModal?.status === 'disetujui' && 'Izin Telah Disetujui'}
                    {selectedLeaveModal?.status === 'ditolak' && 'Izin Tidak Disetujui'}
                  </Text>
                </View>
              </View>

              {/* Alasan */}
              <View style={styles.modalInfoBox}>
                <Text style={styles.modalSectionLabel}>Alasan Ketidakhadiran:</Text>
                <Text style={styles.modalReasonText}>
                  {`"${selectedLeaveModal?.alasan}"`}
                </Text>
              </View>

              {/* Rekomendasi AI */}
              {selectedLeaveModal?.aiClassification ? (
                <View style={styles.modalAiBox}>
                  <Text style={styles.modalSectionLabel}>Hasil Analisis Model AI:</Text>
                  <View style={styles.modalAiRow}>
                    <AICategoryBadge
                      category={selectedLeaveModal.aiClassification.category}
                      confidence={selectedLeaveModal.aiClassification.confidence}
                      size="small"
                    />
                    <Text style={styles.modalAiConfidence}>
                      Keyakinan: {Math.round((selectedLeaveModal.aiClassification.confidence ?? 0) * 100)}%
                    </Text>
                  </View>
                  {selectedLeaveModal.aiClassification.rawSummary ? (
                    <Text style={styles.modalAiSummary}>
                      {selectedLeaveModal.aiClassification.rawSummary}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Evaluasi Asisten jika bukan menunggu */}
              {selectedLeaveModal && selectedLeaveModal.status !== 'menunggu' ? (
                <View
                  style={[
                    styles.decisionBox,
                    selectedLeaveModal.status === 'disetujui'
                      ? styles.decisionBoxApproved
                      : styles.decisionBoxRejected,
                  ]}>
                  <Text
                    style={[
                      styles.decisionTitle,
                      selectedLeaveModal.status === 'disetujui'
                        ? { color: '#15803D' }
                        : { color: '#B91C1C' },
                    ]}>
                    Keputusan Asisten: {selectedLeaveModal.status === 'disetujui' ? 'DISETUJUI' : 'DITOLAK'}
                  </Text>
                  {selectedLeaveModal.reviewerName ? (
                    <Text style={styles.decisionMeta}>
                      Diverifikasi oleh: {selectedLeaveModal.reviewerName} • {formatDate(selectedLeaveModal.reviewedAt)} WIB
                    </Text>
                  ) : null}
                  {selectedLeaveModal.reviewNotes ? (
                    <Text style={styles.decisionNotes}>
                      Catatan: {`"${selectedLeaveModal.reviewNotes}"`}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Lampiran */}
              {selectedLeaveModal?.lampiranUrl ? (
                <Pressable
                  style={styles.modalAttachmentBtn}
                  onPress={() => {
                    if (selectedLeaveModal?.lampiranUrl) {
                      Linking.openURL(selectedLeaveModal.lampiranUrl).catch(() => {});
                    }
                  }}>
                  <Text style={styles.modalAttachmentText}>Buka Berkas / Surat Pendukung ↗</Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => setSelectedLeaveModal(null)}>
                <Text style={styles.modalPrimaryBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Popup Detail Presensi Kehadiran */}
      <Modal
        visible={Boolean(selectedPresensiModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPresensiModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={[styles.modalBadgeText, { color: '#16A34A' }]}>BUKTI KEHADIRAN PRESENSI</Text>
                </View>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedPresensiModal?.sesi?.praktikum ?? 'Praktikum PPK'}
                </Text>
                <Text style={styles.modalSub}>
                  Kelas {selectedPresensiModal?.sesi?.kelas ?? '-'}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedPresensiModal(null)}
                hitSlop={8}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalStatusBox}>
                <Text style={styles.modalSectionLabel}>Status Presensi:</Text>
                <StatusBadge status="hadir" size="small" />
              </View>

              <View style={styles.modalInfoBox}>
                <Text style={styles.modalSectionLabel}>Waktu Kehadiran Tercatat:</Text>
                <Text style={styles.modalReasonText}>
                  {selectedPresensiModal?.waktuKehadiran}
                </Text>
              </View>

              {selectedPresensiModal?.sesi?.materi ? (
                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalSectionLabel}>Materi Praktikum:</Text>
                  <Text style={styles.modalReasonText}>
                    {selectedPresensiModal.sesi.materi}
                  </Text>
                </View>
              ) : null}

              <View style={styles.modalInfoBox}>
                <Text style={styles.modalSectionLabel}>Jadwal & Ruangan:</Text>
                <Text style={styles.modalSubText}>
                  Tanggal: {selectedPresensiModal?.sesi?.tanggal}
                </Text>
                <Text style={styles.modalSubText}>
                  Waktu: {selectedPresensiModal?.sesi?.waktuMulai} - {selectedPresensiModal?.sesi?.waktuSelesai} WIB
                </Text>
                <Text style={styles.modalSubText}>
                  Ruangan: {selectedPresensiModal?.sesi?.ruang || 'Lab Komputasi'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  const sId = selectedPresensiModal?.sesiId;
                  setSelectedPresensiModal(null);
                  if (sId) {
                    router.push({
                      pathname: '/praktikan/detail-sesi/[id]',
                      params: { id: sId },
                    });
                  }
                }}>
                <Text style={styles.modalSecondaryBtnText}>Lihat Detail Sesi →</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => setSelectedPresensiModal(null)}>
                <Text style={styles.modalPrimaryBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrowBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  leaveSectionWrap: {
    gap: 12,
  },
  newLeaveButton: {
    backgroundColor: '#EA580C',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  newLeaveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
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
  metricCardActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minWidth: 140,
  },
  praktikumTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kelasText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  materiText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  detailsRow: {
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  timestampLabel: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  timestampValue: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 1,
  },
  leaveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  leaveStatusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  leaveStatusApproved: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  leaveStatusRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  leaveStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  leaveReasonBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
    paddingLeft: 12,
    gap: 4,
  },
  leaveReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  leaveReasonText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#0F172A',
  },
  linkWrap: {
    marginTop: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  aiSummaryHint: {
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 18,
    backgroundColor: '#F0FDFA',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  decisionBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  decisionBoxApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  decisionBoxRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  decisionTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  decisionMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  decisionNotes: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 2,
  },
  leaveMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
  },
  modalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalBody: {
    marginBottom: 14,
  },
  modalStatusBox: {
    marginBottom: 12,
    gap: 6,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  modalInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  modalReasonText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  modalSubText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  modalAiBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  modalAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalAiConfidence: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  modalAiSummary: {
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
  },
  modalAttachmentBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAttachmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalPrimaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '700',
  },
});
