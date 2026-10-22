import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { StatusBadge } from '@/components/status-badge';
import { usePraktikum } from '@/context/praktikum-context';

export default function PraktikanDetailSesiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    sesiList,
    currentPraktikan,
    isSudahPresensi,
    tandaiPresensi,
    presensiList,
  } = usePraktikum();

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [catatan, setCatatan] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(true);

  const sesi = sesiList.find((s) => s.id === id);

  if (!sesi) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali</Text>
          </Pressable>
        </View>
        <EmptyState
          icon="🔍"
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum yang Anda cari tidak terdaftar atau telah dihapus."
          actionText="Kembali ke Jadwal"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const alreadyPresensi = currentPraktikan
    ? isSudahPresensi(sesi.id, currentPraktikan.id)
    : false;

  const currentPresensiRecord = currentPraktikan
    ? presensiList.find(
        (p) => p.sesiId === sesi.id && p.praktikanId === currentPraktikan.id
      )
    : undefined;

  const handleOpenPresensiModal = () => {
    setIsConfirmModalVisible(true);
  };

  const handleConfirmPresensi = () => {
    if (!currentPraktikan) return;

    const result = tandaiPresensi(sesi.id, currentPraktikan.id);
    setIsConfirmModalVisible(false);

    if (result.success) {
      setSuccessMessage(result.message);
      setIsSuccessModalVisible(true);
    } else {
      // Show failure if any
      alert(result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke daftar jadwal">
          <Text style={styles.backButtonText}>← Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Detail Sesi Praktikum
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <Text style={styles.gridLabel}>📅 Tanggal</Text>
              <Text style={styles.gridValue}>{sesi.tanggal}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>⏰ Waktu Pelaksanaan</Text>
              <Text style={styles.gridValue}>
                {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
              </Text>
            </View>

            {sesi.ruang ? (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>📍 Ruang Laboratorium</Text>
                <Text style={styles.gridValue}>{sesi.ruang}</Text>
              </View>
            ) : null}

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>🏷️ Status Saat Ini</Text>
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
                {currentPraktikan?.nama?.charAt(0) ?? 'P'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {currentPraktikan?.nama ?? 'Praktikan'}
              </Text>
              <Text style={styles.profileNim}>
                NIM: {currentPraktikan?.nim ?? '-'}
              </Text>
              <Text style={styles.profileClass}>
                Kelas: {currentPraktikan?.kelas ?? '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Attendance Action & Status Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Status & Formulir Presensi</Text>

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
                  🕒 {currentPresensiRecord?.waktuKehadiran ?? 'Tercatat'}
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
                  ✓ Presensi Telah Lengkap
                </Text>
              </Pressable>
            </View>
          ) : sesi.status === 'belum-dibuka' ? (
            /* Case 2: Sesi Belum Dibuka (FR-4.1) */
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⏳</Text>
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
            </View>
          ) : sesi.status === 'ditutup' ? (
            /* Case 3: Sesi Ditutup (FR-4.1, FR-3.4) */
            <View style={styles.dangerBox}>
              <Text style={styles.dangerIcon}>🔒</Text>
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
                <Text style={styles.openNoticeIcon}>📢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openNoticeTitle}>Sesi Sedang Berlangsung</Text>
                  <Text style={styles.openNoticeDesc}>
                    Silakan isi form dan lakukan presensi sebelum sesi ditutup
                    oleh asisten.
                  </Text>
                </View>
              </View>

              {/* Catatan / Keterangan Masukan (FR-6.1) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Catatan Kehadiran (Opsional):
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mis. Meja Lab 04, membawa modul lengkap"
                  placeholderTextColor="#94A3B8"
                  value={catatan}
                  onChangeText={setCatatan}
                />
              </View>

              {/* Checkbox Konfirmasi Integritas */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setAgreementChecked(!agreementChecked)}>
                <View
                  style={[
                    styles.checkboxBox,
                    agreementChecked && styles.checkboxBoxChecked,
                  ]}>
                  {agreementChecked ? (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.checkboxLabel}>
                  Saya menyatakan hadir di ruang praktikum dan mengikuti
                  kegiatan secara mandiri.
                </Text>
              </Pressable>

              {/* Main Presensi Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnActive,
                  (!agreementChecked || !currentPraktikan) &&
                    styles.actionBtnDisabled,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleOpenPresensiModal}
                disabled={!agreementChecked || !currentPraktikan}>
                <Text style={styles.actionBtnTextActive}>
                  ✍️ Presensi Sekarang
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal / Bottom Sheet (FR-6.2, B4) */}
      <ConfirmationModal
        visible={isConfirmModalVisible}
        title="Konfirmasi Presensi Praktikum"
        description="Pastikan data identitas Anda sudah sesuai sebelum mengirim presensi."
        confirmText="Ya, Catat Kehadiran"
        cancelText="Batal"
        confirmVariant="primary"
        onConfirm={handleConfirmPresensi}
        onCancel={() => setIsConfirmModalVisible(false)}>
        <View style={styles.modalSummaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Praktikan:</Text>
            <Text style={styles.summaryValue}>
              {currentPraktikan?.nama} ({currentPraktikan?.nim})
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
          {catatan ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Catatan:</Text>
              <Text style={styles.summaryValue}>{catatan}</Text>
            </View>
          ) : null}
        </View>
      </ConfirmationModal>

      {/* Success Feedback Modal (FR-4.3) */}
      <ConfirmationModal
        visible={isSuccessModalVisible}
        title="Presensi Berhasil! 🎉"
        description={successMessage}
        confirmText="Selesai"
        cancelText="Tutup"
        confirmVariant="success"
        onConfirm={() => setIsSuccessModalVisible(false)}
        onCancel={() => setIsSuccessModalVisible(false)}>
        <View style={styles.successFeedbackContent}>
          <Text style={styles.feedbackSub}>
            Waktu kehadiran Anda telah tersimpan. Anda dapat memeriksa rekapan
            kehadiran Anda di tab Riwayat.
          </Text>
        </View>
      </ConfirmationModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
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
    fontSize: 26,
    color: '#16A34A',
    fontWeight: '800',
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
  warningIcon: {
    fontSize: 32,
    marginBottom: 6,
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
  dangerIcon: {
    fontSize: 32,
    marginBottom: 6,
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
  openNoticeIcon: {
    fontSize: 20,
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
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
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
  successFeedbackContent: {
    paddingVertical: 6,
  },
  feedbackSub: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    textAlign: 'center',
  },
});
