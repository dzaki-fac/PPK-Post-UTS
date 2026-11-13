import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import {
  normalizeClassCode,
  submitAttendance,
  subscribeStudentSessionAttendance,
} from '@/services/attendance-service';
import {
  LeaveRequestDocument,
  subscribeStudentLeaveRequests,
} from '@/services/leave-service';
import { subscribeSessionById } from '@/services/session-service';
import { AttendanceDocument, SessionDocument } from '@/types/praktikum';

export default function PraktikanDetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const { user, userDoc } = useAuth();

  const studentUid = userDoc?.uid || user?.uid;

  const [sesi, setSesi] = useState<SessionDocument | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId));
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceDocument | null>(null);
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequestDocument[]>([]);

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kodeInput, setKodeInput] = useState('');
  const [catatan, setCatatan] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const unsubSession = subscribeSessionById(
      sessionId,
      (item) => {
        setSesi(item);
        setLoadingSession(false);
      },
      () => {
        setLoadingSession(false);
      }
    );

    let unsubAttendance: (() => void) | null = null;
    let unsubLeaves: (() => void) | null = null;

    if (studentUid) {
      unsubAttendance = subscribeStudentSessionAttendance(
        sessionId,
        studentUid,
        (record) => {
          setAttendanceRecord(record);
        }
      );

      unsubLeaves = subscribeStudentLeaveRequests(
        studentUid,
        (leaves) => {
          setStudentLeaves(leaves);
        },
        userDoc?.nim
      );
    }

    return () => {
      unsubSession();
      if (unsubAttendance) {
        unsubAttendance();
      }
      if (unsubLeaves) {
        unsubLeaves();
      }
    };
  }, [sessionId, studentUid, userDoc?.nim]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/praktikan/jadwal');
    }
  };

  if (loadingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat detail sesi praktikum...</Text>
      </View>
    );
  }

  if (!sesi) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali</Text>
          </Pressable>
        </View>
        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum yang Anda cari tidak terdaftar atau telah dihapus."
          actionText="Kembali ke Jadwal"
          onAction={handleBack}
        />
      </View>
    );
  }

  const alreadyPresensi = Boolean(attendanceRecord);
  const leaveRecord = studentLeaves.find((l) => l.sessionId === sessionId);
  const studentClass = normalizeClassCode(userDoc?.kelas);
  const sessionClass = normalizeClassCode(sesi.kelas);

  const isClassMismatch = Boolean(
    studentClass && sessionClass && studentClass !== sessionClass
  );

  const isSubmitDisabled =
    !agreementChecked ||
    !userDoc ||
    Boolean(sesi.kodeSesi && kodeInput.trim().length !== 4) ||
    isClassMismatch;

  const handleOpenPresensiModal = () => {
    setIsConfirmModalVisible(true);
  };

  const handleConfirmPresensi = async () => {
    if (!userDoc) return;

    if (sesi.kodeSesi && kodeInput.trim().length !== 4) {
      setIsConfirmModalVisible(false);
      setErrorMessage('Harap masukkan 4 digit kode sesi presensi.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAttendance({
        session: sesi,
        student: userDoc,
        kodeInput: kodeInput.trim(),
        catatan,
      });
      setIsConfirmModalVisible(false);

      if (result.success) {
        setSuccessMessage(result.message);
        setIsSuccessModalVisible(true);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err) {
      setIsConfirmModalVisible(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan presensi ke Cloud Firestore.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Page Heading */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Detail Sesi Praktikum</Text>
            <Text style={styles.pageSubtitle}>
              Informasi modul dan formulir presensi kehadiran praktikan
            </Text>
          </View>

          {/* Main Session Card */}
          <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.praktikumTitle}>{sesi.praktikum}</Text>
              <View style={styles.kelasChip}>
                <Text style={styles.kelasChipText}>{sesi.kelas}</Text>
              </View>
            </View>
            <StatusBadge status={sesi.status} />
          </View>

          {sesi.materi ? (
            <View style={styles.materiBox}>
              <Text style={styles.materiLabel}>Materi Praktikum:</Text>
              <Text style={styles.materiContent}>{sesi.materi}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Schedule Info Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Tanggal</Text>
              <Text style={styles.gridValue}>{sesi.tanggal}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Waktu Pelaksanaan</Text>
              <Text style={styles.gridValue}>
                {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
              </Text>
            </View>

            {sesi.ruang ? (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Ruang Laboratorium</Text>
                <Text style={styles.gridValue}>{sesi.ruang}</Text>
              </View>
            ) : null}

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Status Saat Ini</Text>
              <Text style={styles.gridValue}>
                {sesi.status === 'dibuka'
                  ? 'Sesi Sedang Dibuka'
                  : sesi.status === 'ditutup'
                  ? 'Sesi Telah Ditutup'
                  : 'Belum Dibuka Asisten'}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Student Profile Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Identitas Praktikan</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userDoc?.nama?.charAt(0) ?? 'P'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userDoc?.nama ?? 'Praktikan'}
              </Text>
              <Text style={styles.profileNim}>
                NIM: {userDoc?.nim ?? '-'}
              </Text>
              <Text style={styles.profileClass}>
                Kelas: {userDoc?.kelas ?? '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Attendance Action & Status Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Status & Formulir Presensi</Text>

          {/* Banner Permohonan Izin jika ada */}
          {leaveRecord ? (
            <View
              style={[
                styles.leaveStatusBox,
                leaveRecord.status === 'disetujui' && styles.leaveStatusBoxApproved,
                leaveRecord.status === 'menunggu' && styles.leaveStatusBoxPending,
                leaveRecord.status === 'ditolak' && styles.leaveStatusBoxRejected,
              ]}>
              <View style={styles.leaveStatusHeader}>
                <Text
                  style={[
                    styles.leaveStatusBadgeText,
                    leaveRecord.status === 'disetujui' && { color: '#16A34A' },
                    leaveRecord.status === 'menunggu' && { color: '#D97706' },
                    leaveRecord.status === 'ditolak' && { color: '#DC2626' },
                  ]}>
                  {leaveRecord.status === 'disetujui'
                    ? 'IZIN DISETUJUI ASISTEN'
                    : leaveRecord.status === 'menunggu'
                    ? 'MENUNGGU VERIFIKASI ASISTEN'
                    : 'PERMOHONAN IZIN DITOLAK'}
                </Text>
                {leaveRecord.aiClassification?.category ? (
                  <View style={styles.leaveAiBadge}>
                    <Text style={styles.leaveAiBadgeText}>
                      AI: {leaveRecord.aiClassification.category}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.leaveStatusTitle}>
                {leaveRecord.status === 'disetujui'
                  ? 'Anda Telah Memperoleh Izin pada Sesi Ini'
                  : leaveRecord.status === 'menunggu'
                  ? 'Pengajuan Izin Sedang Diperiksa'
                  : 'Pengajuan Izin Tidak Disetujui'}
              </Text>
              <Text style={styles.leaveStatusAlasan}>
                {`Alasan: "${leaveRecord.alasan}"`}
              </Text>

              {leaveRecord.reviewNotes ? (
                <View style={styles.reviewNotesBox}>
                  <Text style={styles.reviewNotesLabel}>Catatan Evaluasi Asisten:</Text>
                  <Text style={styles.reviewNotesText}>{leaveRecord.reviewNotes}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => router.push('/praktikan/riwayat')}
                style={styles.viewHistoryBtn}>
                <Text style={styles.viewHistoryBtnText}>Lihat Riwayat Lengkap →</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Case 1: Sudah Presensi (FR-4.4) */}
          {alreadyPresensi ? (
            <View style={styles.alreadyBox}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.alreadyTitle}>Anda Sudah Presensi</Text>
              <Text style={styles.alreadySubtitle}>
                Kehadiran Anda telah dicatat pada:
              </Text>
              <View style={styles.timestampBadge}>
                <Text style={styles.timestampText}>
                  {attendanceRecord?.waktuKehadiran ?? 'Tercatat'}
                </Text>
              </View>
              <Text style={styles.alreadyNotice}>
                Praktikan hanya dapat melakukan presensi satu kali per sesi
                praktikum.
              </Text>

              {/* Disabled button to show anti-duplicate rule */}
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDisabled]}
                disabled>
                <Text style={styles.actionBtnTextDisabled}>
                  Presensi Telah Lengkap
                </Text>
              </Pressable>
            </View>
          ) : sesi.status === 'belum-dibuka' ? (
            /* Case 2: Sesi Belum Dibuka (FR-4.1) */
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Sesi Belum Dibuka</Text>
              <Text style={styles.warningMessage}>
                Asisten praktikum belum membuka sesi ini. Tombol presensi akan
                aktif secara otomatis setelah sesi dibuka oleh asisten.
              </Text>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDisabled]}
                disabled>
                <Text style={styles.actionBtnTextDisabled}>
                  Menunggu Sesi Dibuka
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajukan Izin Berhalangan Hadir"
                onPress={() =>
                  router.push({
                    pathname: '/praktikan/pengajuan-izin',
                    params: { sessionId: sesi.id },
                  })
                }
                style={styles.leaveOptionButton}>
                <Text style={styles.leaveOptionButtonText}>
                  Berhalangan Hadir? Ajukan Izin di Sini →
                </Text>
              </Pressable>
            </View>
          ) : sesi.status === 'ditutup' ? (
            /* Case 3: Sesi Ditutup (FR-4.1, FR-3.4) */
            <View style={styles.dangerBox}>
              <Text style={styles.dangerTitle}>Sesi Telah Ditutup</Text>
              <Text style={styles.dangerMessage}>
                Waktu sesi praktikum ini telah berakhir dan ditutup oleh
                asisten. Anda tidak dapat melakukan presensi pada sesi yang
                sudah ditutup.
              </Text>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDisabled]}
                disabled>
                <Text style={styles.actionBtnTextDisabled}>
                  Presensi Ditutup
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Case 4: Sesi Dibuka & Belum Presensi (FR-4.1, FR-4.5) */
            <View style={styles.formContainer}>
              <View style={styles.openNoticeBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openNoticeTitle}>Sesi Sedang Berlangsung</Text>
                  <Text style={styles.openNoticeDesc}>
                    Silakan masukkan kode sesi dari asisten dan kirim presensi sebelum sesi ditutup.
                  </Text>
                </View>
              </View>

              {/* Class Mismatch Notice */}
              {isClassMismatch ? (
                <View style={styles.classMismatchNotice}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classMismatchTitle}>Perhatian: Kelas Tidak Sesuai</Text>
                    <Text style={styles.classMismatchDesc}>
                      Anda terdaftar di Kelas {studentClass}, sedangkan sesi praktikum ini khusus untuk Kelas {sessionClass}. Sistem membatasi presensi hanya untuk praktikan di kelas terkait.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Kode Sesi Presensi 4 Digit */}
              {sesi.kodeSesi ? (
                <View style={styles.inputGroup}>
                  <View style={styles.codeLabelRow}>
                    <Text style={styles.inputLabel}>
                      Kode Sesi Presensi (4 Digit):
                    </Text>
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Wajib</Text>
                    </View>
                  </View>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="Masukkan 4 digit kode dari asisten (mis. 2401)"
                    placeholderTextColor="#94A3B8"
                    value={kodeInput}
                    onChangeText={(t) => setKodeInput(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!isClassMismatch}
                  />
                  <Text style={styles.codeHintText}>
                    Minta 4 digit kode sesi kepada asisten yang memimpin praktikum di ruang laboratorium.
                  </Text>
                </View>
              ) : null}

              {/* Catatan / Keterangan Masukan (FR-6.1) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Catatan Kehadiran (Opsional):
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mis. Meja Lab 04, modul cetak lengkap"
                  placeholderTextColor="#94A3B8"
                  value={catatan}
                  onChangeText={setCatatan}
                  editable={!isClassMismatch}
                />
              </View>

              {/* Checkbox Konfirmasi Integritas */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => !isClassMismatch && setAgreementChecked(!agreementChecked)}>
                <View
                  style={[
                    styles.checkboxBox,
                    agreementChecked && styles.checkboxBoxChecked,
                    isClassMismatch && styles.checkboxBoxDisabled,
                  ]}>
                  {agreementChecked ? (
                    <View style={styles.checkboxInner} />
                  ) : null}
                </View>
                <Text style={[styles.checkboxLabel, isClassMismatch && styles.checkboxLabelDisabled]}>
                  Saya menyatakan hadir di ruang praktikum dan mengikuti kegiatan secara mandiri.
                </Text>
              </Pressable>

              {/* Main Presensi Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnActive,
                  isSubmitDisabled && styles.actionBtnDisabled,
                  pressed && !isSubmitDisabled && styles.buttonPressed,
                ]}
                onPress={handleOpenPresensiModal}
                disabled={isSubmitDisabled}>
                <Text
                  style={
                    isSubmitDisabled
                      ? styles.actionBtnTextDisabled
                      : styles.actionBtnTextActive
                  }>
                  {isClassMismatch ? 'Beda Kelas - Tidak Dapat Presensi' : 'Kirim Presensi Kehadiran'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajukan Izin Praktikum"
                onPress={() =>
                  router.push({
                    pathname: '/praktikan/pengajuan-izin',
                    params: { sessionId: sesi.id },
                  })
                }
                style={styles.leaveOptionButtonSecondary}>
                <Text style={styles.leaveOptionButtonSecondaryText}>
                  Berhalangan Hadir? Ajukan Izin Praktikum →
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal / Bottom Sheet (FR-6.2, B4) */}
      <ConfirmationModal
        visible={isConfirmModalVisible}
        title="Konfirmasi Presensi Praktikum"
        description="Pastikan data identitas dan kode sesi Anda sudah sesuai sebelum mengirim presensi."
        confirmText="Ya, Catat Kehadiran"
        cancelText="Batal"
        confirmVariant="primary"
        isLoading={submitting}
        onConfirm={handleConfirmPresensi}
        onCancel={() => !submitting && setIsConfirmModalVisible(false)}>
        <View style={styles.modalSummaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Praktikan:</Text>
            <Text style={styles.summaryValue}>
              {userDoc?.nama} ({userDoc?.nim ?? '-'})
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Praktikum:</Text>
            <Text style={styles.summaryValue}>{sesi.praktikum}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Kelas & Jadwal:</Text>
            <Text style={styles.summaryValue}>
              {sesi.kelas} • {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
            </Text>
          </View>
          {sesi.kodeSesi ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Kode Sesi:</Text>
              <Text style={styles.summaryValueCode}>{kodeInput.trim()}</Text>
            </View>
          ) : null}
          {catatan ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Catatan:</Text>
              <Text style={styles.summaryValue}>{catatan}</Text>
            </View>
          ) : null}
        </View>
      </ConfirmationModal>

      {/* Error Feedback Modal */}
      <ConfirmationModal
        visible={errorMessage !== null}
        title="Presensi Tidak Berhasil"
        description={errorMessage ?? ''}
        confirmText="Mengerti"
        confirmVariant="danger"
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}>
        <View style={styles.errorFeedbackContent}>
          <Text style={styles.errorFeedbackText}>
            Pastikan 4 digit kode sesi yang dimasukkan sesuai dengan yang dibagikan oleh asisten praktikum dan kelas praktikum cocok dengan identitas Anda.
          </Text>
        </View>
      </ConfirmationModal>

      {/* Success Feedback Modal (FR-4.3) with Redirect to Riwayat */}
      <ConfirmationModal
        visible={isSuccessModalVisible}
        title="Presensi Berhasil"
        description={successMessage}
        confirmText="Lihat Riwayat Presensi"
        cancelText="Tutup"
        confirmVariant="success"
        onConfirm={() => {
          setIsSuccessModalVisible(false);
          router.replace('/praktikan/riwayat');
        }}
        onCancel={() => setIsSuccessModalVisible(false)}>
        <View style={styles.successFeedbackContent}>
          <Text style={styles.feedbackSub}>
            Waktu kehadiran Anda telah tersimpan secara resmi. Klik &quot;Lihat Riwayat Presensi&quot; untuk memeriksa catatan kehadiran Anda di tab Riwayat.
          </Text>
        </View>
      </ConfirmationModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 48,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  pageHeader: {
    gap: 4,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  praktikumTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kelasChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  materiBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  materiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materiContent: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  gridItem: {
    width: '50%',
    paddingRight: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileNim: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  profileClass: {
    fontSize: 12,
    color: '#64748B',
  },
  alreadyBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  successIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803D',
  },
  alreadyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#15803D',
  },
  alreadySubtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  timestampBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  timestampText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  alreadyNotice: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  warningBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309',
  },
  warningMessage: {
    fontSize: 13,
    color: '#78350F',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 14,
  },
  dangerBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  dangerMessage: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 14,
  },
  formContainer: {
    gap: 14,
  },
  openNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  openNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  openNoticeDesc: {
    fontSize: 12,
    color: '#115E59',
    marginTop: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionBtnActive: {
    backgroundColor: '#EA580C', // LocalGuide Red-Orange
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnDisabled: {
    backgroundColor: '#E2E8F0',
    alignSelf: 'stretch',
  },
  actionBtnTextActive: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionBtnTextDisabled: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  classMismatchNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  classMismatchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  classMismatchDesc: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 17,
  },
  codeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requiredBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  codeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#0F172A',
  },
  codeHintText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  checkboxBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  checkboxLabelDisabled: {
    color: '#94A3B8',
  },
  summaryValueCode: {
    fontSize: 13,
    color: '#EA580C',
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorFeedbackContent: {
    paddingVertical: 6,
  },
  errorFeedbackText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    textAlign: 'center',
  },
  successFeedbackContent: {
    paddingVertical: 6,
  },
  feedbackSub: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    textAlign: 'center',
  },
  leaveOptionButton: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  leaveOptionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  leaveOptionButtonSecondary: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  leaveOptionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  leaveStatusBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  leaveStatusBoxApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  leaveStatusBoxPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  leaveStatusBoxRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  leaveStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  leaveStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  leaveAiBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  leaveAiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  leaveStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  leaveStatusAlasan: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reviewNotesBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  reviewNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  reviewNotesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  viewHistoryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    marginTop: 2,
  },
  viewHistoryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});
