import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  normalizeClassCode,
  subscribePraktikanUsers,
  subscribeSessionAttendances,
} from '@/services/attendance-service';
import { LeaveRequestDocument, subscribeLeaveRequests } from '@/services/leave-service';
import {
  deleteSession,
  subscribeSessionById,
  updateSession,
  updateSessionStatus,
} from '@/services/session-service';
import { AttendanceDocument, SessionDocument, UserDocument } from '@/types/praktikum';

type KehadiranFilter = 'semua' | 'hadir' | 'izin' | 'belum-hadir';
type ModalAction = 'buka' | 'tutup' | 'buka-kembali' | 'hapus';

interface RosterRow {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  hadir: boolean;
  waktuHadir?: string;
  leaveStatus?: 'menunggu' | 'disetujui' | 'ditolak';
  aiCategory?: string;
  aiConfidence?: number;
  alasanIzin?: string;
}

export default function DetailSesiAsistenScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;

  const [sesi, setSesi] = useState<SessionDocument | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId));
  const [presensiSesi, setPresensiSesi] = useState<AttendanceDocument[]>([]);
  const [praktikanUsers, setPraktikanUsers] = useState<UserDocument[]>([]);
  const [sessionLeaves, setSessionLeaves] = useState<LeaveRequestDocument[]>([]);

  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [filterKehadiran, setFilterKehadiran] = useState<KehadiranFilter>('semua');

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editMateri, setEditMateri] = useState('');
  const [editRuang, setEditRuang] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editWaktuMulai, setEditWaktuMulai] = useState('');
  const [editWaktuSelesai, setEditWaktuSelesai] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

    const unsubAttendances = subscribeSessionAttendances(sessionId, (items) => {
      setPresensiSesi(items);
    });

    const unsubStudents = subscribePraktikanUsers((students) => {
      setPraktikanUsers(students);
    });

    const unsubLeaves = subscribeLeaveRequests((leaves) => {
      setSessionLeaves(leaves.filter((l) => l.sessionId === sessionId));
    });

    return () => {
      unsubSession();
      unsubAttendances();
      unsubStudents();
      unsubLeaves();
    };
  }, [sessionId]);

  const mahasiswaKelas = useMemo(() => {
    if (!sesi) return [];
    const kodeKelas = normalizeClassCode(sesi.kelas);
    return praktikanUsers.filter(
      (p) => normalizeClassCode(p.kelas) === kodeKelas
    );
  }, [sesi, praktikanUsers]);

  const daftarStatusPraktikan = useMemo<RosterRow[]>(() => {
    const attendanceMap = new Map<string, AttendanceDocument>();
    presensiSesi.forEach((rec) => {
      attendanceMap.set(rec.studentId, rec);
    });

    const leaveMap = new Map<string, LeaveRequestDocument>();
    sessionLeaves.forEach((l) => {
      leaveMap.set(l.studentId, l);
    });

    const rows: RosterRow[] = mahasiswaKelas.map((p) => {
      const record = attendanceMap.get(p.uid);
      if (record) {
        attendanceMap.delete(p.uid);
      }
      const leave = leaveMap.get(p.uid);
      return {
        id: p.uid,
        nama: p.nama,
        nim: p.nim ?? '-',
        kelas: p.kelas ?? '-',
        hadir: Boolean(record),
        waktuHadir: record?.waktuKehadiran,
        leaveStatus: leave?.status,
        aiCategory: leave?.aiClassification?.category,
        aiConfidence: leave?.aiClassification?.confidence,
        alasanIzin: leave?.alasan,
      };
    });

    // Sertakan presensi yang masuk meskipun profil belum termuat di filter kelas
    attendanceMap.forEach((rec) => {
      const leave = leaveMap.get(rec.studentId);
      rows.unshift({
        id: rec.studentId,
        nama: rec.studentName,
        nim: rec.studentNim,
        kelas: rec.studentClass,
        hadir: true,
        waktuHadir: rec.waktuKehadiran,
        leaveStatus: leave?.status,
        aiCategory: leave?.aiClassification?.category,
        aiConfidence: leave?.aiClassification?.confidence,
        alasanIzin: leave?.alasan,
      });
    });

    return rows;
  }, [mahasiswaKelas, presensiSesi, sessionLeaves]);

  const filteredDaftar = useMemo(() => {
    if (filterKehadiran === 'hadir') {
      return daftarStatusPraktikan.filter((d) => d.hadir);
    }
    if (filterKehadiran === 'izin') {
      return daftarStatusPraktikan.filter((d) => Boolean(d.leaveStatus));
    }
    if (filterKehadiran === 'belum-hadir') {
      return daftarStatusPraktikan.filter((d) => !d.hadir && !d.leaveStatus);
    }
    return daftarStatusPraktikan;
  }, [daftarStatusPraktikan, filterKehadiran]);

  const totalHadir = presensiSesi.length;
  const totalIzin = daftarStatusPraktikan.filter((d) => d.leaveStatus === 'disetujui').length;
  const totalIzinMenunggu = sessionLeaves.filter((l) => l.status === 'menunggu').length;
  const totalMahasiswa = daftarStatusPraktikan.length;
  const persentaseHadir =
    totalMahasiswa > 0 ? Math.round((totalHadir / totalMahasiswa) * 100) : 0;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/asisten/jadwal');
    }
  };

  if (loadingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Memuat detail sesi & roster real-time...</Text>
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
          message="Sesi praktikum yang Anda cari tidak terdaftar dalam jadwal Firestore."
          actionText="Kembali ke Jadwal"
          onAction={handleBack}
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
    setEditError(null);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    setEditError(null);
    if (!editMateri.trim()) {
      setEditError('Materi praktikum tidak boleh kosong.');
      return;
    }

    setSavingEdit(true);
    try {
      await updateSession(sesi.id, {
        materi: editMateri.trim(),
        ruang: editRuang.trim(),
        tanggal: editTanggal.trim(),
        waktuMulai: editWaktuMulai.trim(),
        waktuSelesai: editWaktuSelesai.trim(),
      });
      setIsEditModalVisible(false);
      setFeedbackMessage('Informasi sesi praktikum berhasil diperbarui di Firestore.');
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Gagal memperbarui informasi sesi.'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEksekusiAksi = async () => {
    if (!modalAction) return;

    setActionLoading(true);
    try {
      if (modalAction === 'buka') {
        await updateSessionStatus(sesi.id, 'dibuka');
        setModalAction(null);
        setFeedbackMessage(
          'Sesi berhasil dibuka! Praktikan kini dapat melakukan presensi kehadiran.'
        );
      } else if (modalAction === 'tutup') {
        await updateSessionStatus(sesi.id, 'ditutup');
        setModalAction(null);
        setFeedbackMessage(
          'Sesi berhasil ditutup. Pencatatan presensi praktikan resmi diakhiri.'
        );
      } else if (modalAction === 'buka-kembali') {
        await updateSessionStatus(sesi.id, 'dibuka');
        setModalAction(null);
        setFeedbackMessage(
          'Sesi berhasil dibuka kembali! Praktikan sekarang dapat melakukan presensi kehadiran susulan.'
        );
      } else if (modalAction === 'hapus') {
        await deleteSession(sesi.id);
        setModalAction(null);
        router.replace('/asisten/jadwal');
      }
    } catch (err) {
      setModalAction(null);
      setFeedbackMessage(
        err instanceof Error ? err.message : 'Gagal memproses aksi sesi di Firestore.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
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

            {/* Attendance Progress Bar Track */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(persentaseHadir, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Active 4-Digit Attendance Code Card (Reference: CodeDisplay) */}
          {sesi.kodeSesi && sesi.status === 'dibuka' ? (
            <View style={styles.codeCard}>
              <View style={styles.codeHeaderRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeBadgeText}>KODE PRESENSI SESI</Text>
                </View>
                <Text style={styles.codeSubtitle}>
                  Bagikan 4 digit kode ini kepada mahasiswa di laboratorium
                </Text>
              </View>
              <View style={styles.codeBoxRow}>
                {sesi.kodeSesi.split('').map((char, index) => (
                  <View key={index} style={styles.codeCell}>
                    <Text style={styles.codeDigit}>{char}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

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
                  Kelas {sesi.kelas} • {totalHadir} hadir{totalIzin > 0 ? ` • ${totalIzin} izin disetujui` : ''} dari {totalMahasiswa} mahasiswa
                </Text>
              </View>
            </View>

            {/* Quick Banner jika ada permohonan izin pada sesi ini */}
            {totalIzinMenunggu > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tinjau izin pada sesi ini"
                onPress={() => router.push('/asisten/moderasi-izin')}
                style={({ pressed }) => [styles.sessionIzinNotice, pressed && styles.btnPressed]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionIzinNoticeTitle}>
                    {totalIzinMenunggu} Mahasiswa Mengajukan Izin untuk Sesi Ini
                  </Text>
                  <Text style={styles.sessionIzinNoticeSubtitle}>
                    Rekomendasi AI telah disematkan. Klik untuk membuka panel moderasi izin.
                  </Text>
                </View>
                <Text style={styles.sessionIzinNoticeAction}>Periksa →</Text>
              </Pressable>
            )}

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
                  filterKehadiran === 'izin' && styles.filterTabActive,
                ]}
                onPress={() => setFilterKehadiran('izin')}>
                <Text
                  style={[
                    styles.filterTabText,
                    filterKehadiran === 'izin' && styles.filterTabTextActive,
                  ]}>
                  Izin ({sessionLeaves.length})
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
                  Belum Hadir ({Math.max(0, totalMahasiswa - totalHadir - totalIzin)})
                </Text>
              </Pressable>
            </View>

            {/* Student List */}
            {filteredDaftar.length === 0 ? (
              <View style={styles.emptyRosterWrap}>
                <Text style={styles.emptyRosterText}>
                  {totalMahasiswa === 0
                    ? 'Belum ada mahasiswa terdaftar pada kelas ini.'
                    : filterKehadiran === 'hadir'
                    ? 'Belum ada mahasiswa yang mencatat kehadiran.'
                    : filterKehadiran === 'izin'
                    ? 'Tidak ada permohonan izin untuk sesi praktikum ini.'
                    : 'Semua mahasiswa telah hadir.'}
                </Text>
              </View>
            ) : (
              <View style={styles.studentList}>
                {filteredDaftar.map((item) => (
                  <View key={item.id} style={styles.studentRow}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {item.nama.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.studentMeta}>
                      <Text style={styles.studentName}>{item.nama}</Text>
                      <Text style={styles.studentSub}>
                        NIM: {item.nim} • Kelas {item.kelas}
                      </Text>
                    </View>
                    <View style={styles.studentStatusWrap}>
                      {item.hadir ? (
                        <View style={styles.hadirBadge}>
                          <Text style={styles.hadirBadgeText}>Hadir</Text>
                          {item.waktuHadir ? (
                            <Text style={styles.hadirTimeText}>
                              {item.waktuHadir.includes(',')
                                ? item.waktuHadir.split(',')[1]?.trim()
                                : item.waktuHadir}
                            </Text>
                          ) : null}
                        </View>
                      ) : item.leaveStatus === 'disetujui' ? (
                        <View style={styles.izinBadge}>
                          <Text style={styles.izinBadgeText}>Izin Disetujui</Text>
                          {item.aiCategory ? (
                            <Text style={styles.izinAiSubText}>AI: {item.aiCategory}</Text>
                          ) : null}
                        </View>
                      ) : item.leaveStatus === 'menunggu' ? (
                        <Pressable
                          onPress={() => router.push('/asisten/moderasi-izin')}
                          style={styles.izinMenungguBadge}>
                          <Text style={styles.izinMenungguBadgeText}>Menunggu Izin</Text>
                          {item.aiCategory ? (
                            <Text style={styles.izinAiSubText}>AI: {item.aiCategory}</Text>
                          ) : null}
                        </Pressable>
                      ) : (
                        <View style={styles.belumHadirBadge}>
                          <Text style={styles.belumHadirBadgeText}>
                            {item.leaveStatus === 'ditolak' ? 'Belum Hadir (Izin Ditolak)' : 'Belum Hadir'}
                          </Text>
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
        isLoading={actionLoading}
        onConfirm={handleEksekusiAksi}
        onCancel={() => !actionLoading && setModalAction(null)}
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
              {editError ? (
                <View style={styles.editErrorBox}>
                  <Text style={styles.editErrorText}>{editError}</Text>
                </View>
              ) : null}
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
                onPress={() => setIsEditModalVisible(false)}
                disabled={savingEdit}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSaveEdit}
                disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                )}
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
  progressContainer: {
    marginTop: 14,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#15803D',
    borderRadius: 3,
  },
  codeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  codeHeaderRow: {
    alignItems: 'center',
    gap: 4,
  },
  codeBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    borderWidth: 1,
    borderColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  codeBadgeText: {
    color: '#2DD4BF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  codeSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  codeBoxRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  codeCell: {
    width: 48,
    height: 58,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
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
  sessionIzinNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginBottom: 12,
  },
  sessionIzinNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  sessionIzinNoticeSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  sessionIzinNoticeAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  filterTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
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
  izinBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-end',
  },
  izinBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  izinMenungguBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'flex-end',
  },
  izinMenungguBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  izinAiSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
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
  editErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  editErrorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B91C1C',
  },
});
