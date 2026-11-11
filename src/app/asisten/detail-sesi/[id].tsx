import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
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
import { usePraktikum } from '@/context/praktikum-context';

type KehadiranFilter = 'semua' | 'hadir' | 'belum-hadir';
type ModalAction = 'buka' | 'tutup' | 'buka-kembali' | 'hapus';

export default function DetailSesiAsistenScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getSesiById,
    bukaSesi,
    tutupSesi,
    bukaKembaliSesi,
    editSesi,
    hapusSesi,
    getPresensiBySesi,
    daftarPraktikan,
  } = usePraktikum();

  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [filterKehadiran, setFilterKehadiran] = useState<KehadiranFilter>('semua');

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editMateri, setEditMateri] = useState('');
  const [editRuang, setEditRuang] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editWaktuMulai, setEditWaktuMulai] = useState('');
  const [editWaktuSelesai, setEditWaktuSelesai] = useState('');

  const sesi = getSesiById(id);

  const presensiSesi = useMemo(() => {
    if (!sesi) return [];
    return getPresensiBySesi(sesi.id);
  }, [sesi, getPresensiBySesi]);

  // Mahasiswa yang terdaftar pada kelas ini (mis. "Kelas A" -> kelas === 'A')
  const mahasiswaKelas = useMemo(() => {
    if (!sesi) return [];
    const kodeKelas = sesi.kelas.replace(/[^A-Za-z]/g, '').slice(-1);
    const matched = daftarPraktikan.filter((p) =>
      p.kelas.toUpperCase() === kodeKelas.toUpperCase() || sesi.kelas.includes(p.kelas)
    );
    return matched.length > 0 ? matched : daftarPraktikan;
  }, [sesi, daftarPraktikan]);

  // Status kehadiran setiap mahasiswa kelas
  const daftarStatusPraktikan = useMemo(() => {
    return mahasiswaKelas.map((p) => {
      const record = presensiSesi.find((pres) => pres.praktikanId === p.id);
      return {
        praktikan: p,
        hadir: !!record,
        waktuHadir: record?.waktuKehadiran,
      };
    });
  }, [mahasiswaKelas, presensiSesi]);

  const filteredDaftar = useMemo(() => {
    if (filterKehadiran === 'hadir') {
      return daftarStatusPraktikan.filter((d) => d.hadir);
    }
    if (filterKehadiran === 'belum-hadir') {
      return daftarStatusPraktikan.filter((d) => !d.hadir);
    }
    return daftarStatusPraktikan;
  }, [daftarStatusPraktikan, filterKehadiran]);

  const totalHadir = presensiSesi.length;
  const totalMahasiswa = mahasiswaKelas.length;
  const persentaseHadir = totalMahasiswa > 0
    ? Math.round((totalHadir / totalMahasiswa) * 100)
    : 0;

  if (!sesi) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali</Text>
          </Pressable>
        </View>
        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum yang Anda cari tidak terdaftar dalam jadwal."
          actionText="Kembali ke Jadwal"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const handleOpenEdit = () => {
    setEditMateri(sesi.materi || '');
    setEditRuang(sesi.ruang || '');
    setEditTanggal(sesi.tanggal || '');
    setEditWaktuMulai(sesi.waktuMulai || '');
    setEditWaktuSelesai(sesi.waktuSelesai || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editMateri.trim()) {
      alert('Materi praktikum tidak boleh kosong');
      return;
    }
    editSesi(sesi.id, {
      materi: editMateri.trim(),
      ruang: editRuang.trim(),
      tanggal: editTanggal.trim(),
      waktuMulai: editWaktuMulai.trim(),
      waktuSelesai: editWaktuSelesai.trim(),
    });
    setIsEditModalVisible(false);
    setFeedbackMessage('Informasi sesi praktikum berhasil diperbarui.');
  };

  const handleEksekusiAksi = () => {
    if (!modalAction) return;

    if (modalAction === 'buka') {
      const ok = bukaSesi(sesi.id);
      setModalAction(null);
      setFeedbackMessage(
        ok
          ? 'Sesi berhasil dibuka! Praktikan kini dapat melakukan presensi kehadiran.'
          : 'Gagal membuka sesi. Pastikan sesi belum dibuka sebelumnya.'
      );
    } else if (modalAction === 'tutup') {
      const ok = tutupSesi(sesi.id);
      setModalAction(null);
      setFeedbackMessage(
        ok
          ? 'Sesi berhasil ditutup. Pencatatan presensi praktikan resmi diakhiri.'
          : 'Gagal menutup sesi.'
      );
    } else if (modalAction === 'buka-kembali') {
      const ok = bukaKembaliSesi(sesi.id);
      setModalAction(null);
      setFeedbackMessage(
        ok
          ? 'Sesi berhasil dibuka kembali! Praktikan sekarang dapat melakukan presensi kehadiran susulan.'
          : 'Gagal membuka kembali sesi praktikum.'
      );
    } else if (modalAction === 'hapus') {
      setModalAction(null);
      hapusSesi(sesi.id);
      router.replace('/asisten/jadwal');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Breadcrumb Back Button */}
          <Pressable
            style={({ pressed }) => [styles.backBreadcrumb, pressed && styles.btnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Jadwal Praktikum">
            <Text style={styles.backBreadcrumbText}>← Kembali ke Jadwal Praktikum</Text>
          </Pressable>

          {/* Page Heading */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Kelola Sesi Praktikum</Text>
            <Text style={styles.pageSubtitle}>
              Kontrol pembukaan sesi dan pantau daftar presensi mahasiswa secara real-time
            </Text>
          </View>

          {/* Main Session Info Card */}
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
                <Text style={styles.gridLabel}>Tingkat Kehadiran</Text>
                <Text style={[styles.gridValue, { color: '#15803D' }]}>
                  {totalHadir}/{totalMahasiswa} Mahasiswa ({persentaseHadir}%)
                </Text>
              </View>
            </View>
          </View>

          {/* Session Control Action Section */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Aksi Pengelolaan Sesi</Text>

            {sesi.status === 'belum-dibuka' ? (
              <View style={styles.actionNoticeBox}>
                <View style={styles.actionNoticeInfo}>
                  <Text style={styles.actionNoticeTitle}>Sesi Belum Dimulai</Text>
                  <Text style={styles.actionNoticeSubtitle}>
                    Buka sesi agar praktikan dapat melihat form presensi dan mencatat kehadiran.
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.openBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setModalAction('buka')}>
                  <Text style={styles.btnTextWhite}>Buka Sesi Praktikum</Text>
                </Pressable>
              </View>
            ) : sesi.status === 'dibuka' ? (
              <View style={styles.actionNoticeBox}>
                <View style={styles.actionNoticeInfo}>
                  <Text style={[styles.actionNoticeTitle, { color: '#15803D' }]}>
                    Sesi Sedang Berlangsung
                  </Text>
                  <Text style={styles.actionNoticeSubtitle}>
                    Praktikan dapat melakukan presensi saat ini. Tutup sesi jika kegiatan praktikum telah selesai.
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.closeBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setModalAction('tutup')}>
                  <Text style={styles.btnTextWhite}>Tutup Sesi Praktikum</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionNoticeBox}>
                <View style={styles.closedNoticeBox}>
                  <View style={styles.closedNoticeDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.closedNoticeTitle}>Sesi Praktikum Telah Ditutup</Text>
                    <Text style={styles.closedNoticeSubtitle}>
                      Pencatatan presensi telah berakhir. Anda dapat membuka kembali sesi jika diperlukan presensi susulan.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.reopenBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setModalAction('buka-kembali')}>
                  <Text style={styles.btnTextWhite}>Buka Kembali Sesi Praktikum</Text>
                </Pressable>
              </View>
            )}

            {/* Secondary Controls: Edit & Hapus Sesi */}
            <View style={styles.secondaryDivider} />
            <View style={styles.secondaryControlsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryActionBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleOpenEdit}>
                <Text style={styles.secondaryActionBtnText}>Edit Informasi Sesi</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.dangerOutlineBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setModalAction('hapus')}>
                <Text style={styles.dangerOutlineBtnText}>Hapus Sesi</Text>
              </Pressable>
            </View>
          </View>

          {/* Attendance Roster Section (FR-5.1, FR-5.3) */}
          <View style={styles.card}>
            <View style={styles.rosterHeader}>
              <View>
                <Text style={styles.sectionHeader}>Daftar Kehadiran Mahasiswa</Text>
                <Text style={styles.rosterSubtitle}>
                  Kelas {sesi.kelas} • {totalHadir} hadir dari {totalMahasiswa} mahasiswa
                </Text>
              </View>
            </View>

            {/* Filter Tabs for Roster */}
            <View style={styles.filterTabsRow}>
              <Pressable
                style={[
                  styles.filterTab,
                  filterKehadiran === 'semua' && styles.filterTabActive,
                ]}
                onPress={() => setFilterKehadiran('semua')}>
                <Text
                  style={[
                    styles.filterTabText,
                    filterKehadiran === 'semua' && styles.filterTabTextActive,
                  ]}>
                  Semua ({totalMahasiswa})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterTab,
                  filterKehadiran === 'hadir' && styles.filterTabActive,
                ]}
                onPress={() => setFilterKehadiran('hadir')}>
                <Text
                  style={[
                    styles.filterTabText,
                    filterKehadiran === 'hadir' && styles.filterTabTextActive,
                  ]}>
                  Hadir ({totalHadir})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterTab,
                  filterKehadiran === 'belum-hadir' && styles.filterTabActive,
                ]}
                onPress={() => setFilterKehadiran('belum-hadir')}>
                <Text
                  style={[
                    styles.filterTabText,
                    filterKehadiran === 'belum-hadir' && styles.filterTabTextActive,
                  ]}>
                  Belum Hadir ({totalMahasiswa - totalHadir})
                </Text>
              </Pressable>
            </View>

            {/* Student List */}
            {filteredDaftar.length === 0 ? (
              <View style={styles.emptyRosterWrap}>
                <Text style={styles.emptyRosterText}>
                  {filterKehadiran === 'hadir'
                    ? 'Belum ada mahasiswa yang mencatat kehadiran.'
                    : 'Semua mahasiswa telah hadir.'}
                </Text>
              </View>
            ) : (
              <View style={styles.studentList}>
                {filteredDaftar.map(({ praktikan, hadir, waktuHadir }) => (
                  <View key={praktikan.id} style={styles.studentRow}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {praktikan.nama.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.studentMeta}>
                      <Text style={styles.studentName}>{praktikan.nama}</Text>
                      <Text style={styles.studentSub}>
                        NIM: {praktikan.nim} • Kelas {praktikan.kelas}
                      </Text>
                    </View>
                    <View style={styles.studentStatusWrap}>
                      {hadir ? (
                        <View style={styles.hadirBadge}>
                          <Text style={styles.hadirBadgeText}>Hadir</Text>
                          {waktuHadir ? (
                            <Text style={styles.hadirTimeText}>
                              {waktuHadir.includes(',')
                                ? waktuHadir.split(',')[1]?.trim()
                                : waktuHadir}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.belumHadirBadge}>
                          <Text style={styles.belumHadirBadgeText}>Belum Hadir</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal Buka / Tutup / Buka Kembali / Hapus (FR-6.2, FR-3.1, FR-3.2) */}
      <ConfirmationModal
        visible={modalAction !== null}
        title={
          modalAction === 'buka'
            ? 'Buka Sesi Praktikum?'
            : modalAction === 'tutup'
            ? 'Tutup Sesi Praktikum?'
            : modalAction === 'buka-kembali'
            ? 'Buka Kembali Sesi Praktikum?'
            : 'Hapus Sesi Praktikum?'
        }
        description={
          modalAction === 'buka'
            ? `Buka sesi "${sesi.praktikum} (${sesi.kelas})"? Praktikan akan dapat langsung melakukan presensi.`
            : modalAction === 'tutup'
            ? `Apakah Anda yakin ingin menutup sesi "${sesi.praktikum} (${sesi.kelas})"? Setelah ditutup, praktikan tidak dapat melakukan presensi lagi.`
            : modalAction === 'buka-kembali'
            ? `Buka kembali sesi "${sesi.praktikum} (${sesi.kelas})"? Mahasiswa yang belum presensi akan dapat mengisi kehadiran susulan.`
            : `Apakah Anda yakin ingin menghapus sesi "${sesi.praktikum} (${sesi.kelas})"? Seluruh rekaman presensi terkait sesi ini akan dihapus permanen.`
        }
        confirmText={
          modalAction === 'buka'
            ? 'Ya, Buka Sesi'
            : modalAction === 'tutup'
            ? 'Ya, Tutup Sesi'
            : modalAction === 'buka-kembali'
            ? 'Ya, Buka Kembali'
            : 'Ya, Hapus Sesi'
        }
        cancelText="Batal"
        confirmVariant={
          modalAction === 'buka' || modalAction === 'buka-kembali'
            ? 'primary'
            : 'danger'
        }
        onConfirm={handleEksekusiAksi}
        onCancel={() => setModalAction(null)}
      />

      {/* Edit Session Popup Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setIsEditModalVisible(false)}
          />
          <View style={styles.modalPopupCard}>
            <View style={styles.editModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editModalTitle}>Edit Informasi Sesi</Text>
                <Text style={styles.editModalSubtitle}>
                  {sesi.praktikum} • {sesi.kelas}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtnCircle, pressed && styles.buttonPressed]}
                onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.closeBtnCircleText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Materi Praktikum</Text>
                <TextInput
                  style={styles.textInput}
                  value={editMateri}
                  onChangeText={setEditMateri}
                  placeholder="Contoh: Modul 3: Navigasi Lanjutan"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ruang Laboratorium</Text>
                <TextInput
                  style={styles.textInput}
                  value={editRuang}
                  onChangeText={setEditRuang}
                  placeholder="Contoh: Lab Komputasi 1"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tanggal Pelaksanaan</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTanggal}
                  onChangeText={setEditTanggal}
                  placeholder="Contoh: 29 Okt 2026"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Jam Mulai</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editWaktuMulai}
                    onChangeText={setEditWaktuMulai}
                    placeholder="07.30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Jam Selesai</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editWaktuSelesai}
                    onChangeText={setEditWaktuSelesai}
                    placeholder="09.30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <ConfirmationModal
        visible={feedbackMessage !== null}
        title="Informasi Sesi"
        description={feedbackMessage ?? ''}
        confirmText="Mengerti"
        confirmVariant="primary"
        onConfirm={() => setFeedbackMessage(null)}
        onCancel={() => setFeedbackMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  backBreadcrumbText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
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
    opacity: 0.85,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
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
    marginBottom: 4,
  },
  actionNoticeBox: {
    gap: 12,
  },
  actionNoticeInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionNoticeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtn: {
    backgroundColor: '#16A34A',
  },
  closeBtn: {
    backgroundColor: '#DC2626',
  },
  btnTextWhite: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closedNoticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  closedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  closedNoticeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  rosterHeader: {
    marginBottom: 12,
  },
  rosterSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  emptyRosterWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyRosterText: {
    fontSize: 13,
    color: '#64748B',
  },
  studentList: {
    gap: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  studentStatusWrap: {
    alignItems: 'flex-end',
  },
  hadirBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'flex-end',
  },
  hadirBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  hadirTimeText: {
    fontSize: 10,
    color: '#166534',
    marginTop: 1,
  },
  belumHadirBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  belumHadirBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  reopenBtn: {
    backgroundColor: '#0D9488',
  },
  secondaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 16,
    marginBottom: 12,
  },
  secondaryControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryActionBtn: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dangerOutlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerOutlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* Edit Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDismiss: {
    ...StyleSheet.absoluteFill,
  },
  modalPopupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    maxWidth: 480,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  editModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnCircleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  editModalBody: {
    maxHeight: 380,
  },
  inputGroup: {
    marginBottom: 12,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#0D9488',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
