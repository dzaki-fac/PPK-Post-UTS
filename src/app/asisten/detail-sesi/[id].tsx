import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AttendanceRoster,
  AttendanceRosterRow,
} from '@/components/attendance-roster';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { SessionQRCode } from '@/components/session-qr-code';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import { recordManualAttendance } from '@/services/attendance-admin-service';
import {
  normalizeClassCode,
  subscribePraktikanUsers,
  subscribeSessionAttendances,
} from '@/services/attendance-service';
import { buildFallbackDefaultLabs, subscribeLabs } from '@/services/lab-service';
import { LeaveRequestDocument, subscribeLeaveRequests } from '@/services/leave-service';
import { subscribeSessionById, updateSessionStatus } from '@/services/session-service';
import {
  AttendanceDocument,
  LabLocationDocument,
  SessionDocument,
  UserDocument,
} from '@/types/praktikum';
import { buildSessionQrPayload } from '@/utils/qr-payload';
import { formatWib } from '@/utils/wib';

type ModalAction = 'buka' | 'tutup' | 'buka-kembali';

export default function DetailSesiAsprakScreen() {
  const insets = useSafeAreaInsets();
  const { userDoc } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;

  const [sesi, setSesi] = useState<SessionDocument | null>(null);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId));
  const [presensiSesi, setPresensiSesi] = useState<AttendanceDocument[]>([]);
  const [praktikanUsers, setPraktikanUsers] = useState<UserDocument[]>([]);
  const [sessionLeaves, setSessionLeaves] = useState<LeaveRequestDocument[]>([]);
  const [showQrCode, setShowQrCode] = useState(false);

  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const unsubSession = subscribeSessionById(
      sessionId,
      (item) => {
        setSesi(item);
        setLoadingSession(false);
      },
      () => setLoadingSession(false)
    );

    const unsubLabs = subscribeLabs(
      (items) => setLabs(items.length > 0 ? items : buildFallbackDefaultLabs()),
      () => setLabs(buildFallbackDefaultLabs())
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
      unsubLabs();
      unsubAttendances();
      unsubStudents();
      unsubLeaves();
    };
  }, [sessionId]);

  const assignedLabIds = useMemo(() => userDoc?.labIds ?? [], [userDoc?.labIds]);

  const isOutOfScope = useMemo(() => {
    if (!sesi || assignedLabIds.length === 0 || !sesi.labId) return false;
    return !assignedLabIds.includes(sesi.labId);
  }, [sesi, assignedLabIds]);

  const mahasiswaKelas = useMemo(() => {
    if (!sesi) return [];
    if (sesi.labId) {
      const byLab = praktikanUsers.filter((p) => p.labId === sesi.labId);
      if (byLab.length > 0) return byLab;
    }
    const kodeKelas = normalizeClassCode(sesi.kelas);
    return praktikanUsers.filter((p) => normalizeClassCode(p.kelas) === kodeKelas);
  }, [sesi, praktikanUsers]);

  const rosterRows = useMemo<AttendanceRosterRow[]>(() => {
    const attendanceMap = new Map<string, AttendanceDocument>();
    presensiSesi.forEach((rec) => {
      attendanceMap.set(rec.studentId, rec);
    });

    const leaveMap = new Map<string, LeaveRequestDocument>();
    sessionLeaves.forEach((l) => {
      leaveMap.set(l.studentId, l);
    });

    const rows: AttendanceRosterRow[] = mahasiswaKelas.map((p) => {
      const record = attendanceMap.get(p.uid);
      if (record) {
        attendanceMap.delete(p.uid);
      }
      const leave = leaveMap.get(p.uid);
      const effectiveStatus = record
        ? record.attendanceStatus ?? 'hadir'
        : leave?.status === 'disetujui'
        ? 'izin'
        : undefined;

      return {
        id: p.uid,
        nama: p.nama,
        nim: p.nim ?? '-',
        kelas: p.kelas ?? '-',
        attendanceStatus: effectiveStatus,
        lateMinutes: record?.lateness?.minutesAfterStart,
        waktuHadir: record?.waktuKehadiran,
        distanceMeters: record?.locationSnapshot?.distanceMeters,
        verificationMethod: record?.verificationMethod,
        leaveStatus: leave?.status,
        aiCategory: leave?.aiClassification?.category,
      };
    });

    attendanceMap.forEach((rec) => {
      const leave = leaveMap.get(rec.studentId);
      rows.unshift({
        id: rec.studentId,
        nama: rec.studentName,
        nim: rec.studentNim,
        kelas: rec.studentClass,
        attendanceStatus: rec.attendanceStatus ?? 'hadir',
        lateMinutes: rec.lateness?.minutesAfterStart,
        waktuHadir: rec.waktuKehadiran,
        distanceMeters: rec.locationSnapshot?.distanceMeters,
        verificationMethod: rec.verificationMethod,
        leaveStatus: leave?.status,
        aiCategory: leave?.aiClassification?.category,
      });
    });

    return rows;
  }, [mahasiswaKelas, presensiSesi, sessionLeaves]);

  // Tingkat kehadiran = (hadir + terlambat) / praktikan aktif (izin tidak dihitung hadir)
  const totalPresent = rosterRows.filter(
    (r) => r.attendanceStatus === 'hadir' || r.attendanceStatus === 'terlambat'
  ).length;
  const totalIzinMenunggu = sessionLeaves.filter((l) => l.status === 'menunggu').length;
  const totalMahasiswa = rosterRows.length;
  const persentaseHadir =
    totalMahasiswa > 0 ? Math.round((totalPresent / totalMahasiswa) * 100) : 0;

  const linkedLab = useMemo(() => {
    if (!sesi) return null;
    if (sesi.labId) {
      const byId = labs.find((l) => l.id === sesi.labId);
      if (byId) return byId;
    }
    const roomLower = (sesi.ruang ?? '').trim().toLowerCase();
    return (
      labs.find(
        (l) =>
          l.nama.trim().toLowerCase() === roomLower ||
          l.kode.trim().toLowerCase() === roomLower
      ) ?? null
    );
  }, [sesi, labs]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/asisten/jadwal');
    }
  };

  const handleManualAttend = async (row: AttendanceRosterRow, note: string) => {
    if (!sesi || !userDoc?.uid) return;
    await recordManualAttendance({
      session: sesi,
      studentId: row.id,
      studentName: row.nama,
      studentNim: row.nim,
      studentClass: row.kelas === 'B' ? 'B' : 'A',
      asprakUid: userDoc.uid,
      note,
    });
    setFeedbackMessage(`Presensi manual untuk ${row.nama} berhasil dicatat sebagai Hadir.`);
  };

  const handleEksekusiAksi = async () => {
    if (!modalAction || !sesi) return;

    setActionLoading(true);
    try {
      if (modalAction === 'buka') {
        await updateSessionStatus(sesi.id, 'dibuka');
        setModalAction(null);
        setFeedbackMessage(
          'Sesi berhasil dibuka. Praktikan kini dapat melakukan presensi kehadiran.'
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
          'Sesi berhasil dibuka kembali. Waktu mulai pertama sesi tetap dipertahankan.'
        );
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
          <Pressable style={styles.backButton} onPress={handleBack} accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali ke Jadwal</Text>
          </Pressable>
        </View>
        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum yang Anda cari tidak terdaftar dalam jadwal Firestore."
          actionText="← Kembali ke Jadwal"
          onAction={handleBack}
        />
      </View>
    );
  }

  if (isOutOfScope) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable style={styles.backButton} onPress={handleBack} accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali ke Jadwal</Text>
          </Pressable>
        </View>
        <EmptyState
          title="Akses Lab Dibatasi"
          message="Anda tidak mengampu laboratorium ini. Asprak hanya dapat mengelola sesi pada laboratorium yang ditugaskan."
          actionText="← Kembali ke Jadwal Saya"
          onAction={() => router.replace('/asisten/jadwal')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          <Pressable style={styles.backButton} onPress={handleBack} accessibilityRole="button">
            <Text style={styles.backButtonText}>← Kembali ke Jadwal Praktikum</Text>
          </Pressable>

          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Pelaksanaan Sesi Praktikum</Text>
            <Text style={styles.pageSubtitle}>
              Buka sesi saat praktikum dimulai, pantau presensi mahasiswa real-time, dan tutup sesi setelah selesai.
            </Text>
          </View>

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
                  <Text style={styles.gridLabel}>Ruang & Radius Geofencing</Text>
                  <Text style={styles.gridValue}>
                    {sesi.ruang}
                    {sesi.radiusOverride ?? linkedLab?.radiusMeter
                      ? ` • ${sesi.radiusOverride ?? linkedLab?.radiusMeter}m`
                      : ''}
                  </Text>
                </View>
              ) : null}

              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Tingkat Kehadiran</Text>
                <Text style={[styles.gridValue, { color: '#15803D' }]}>
                  {totalPresent}/{totalMahasiswa} Mahasiswa ({persentaseHadir}%)
                </Text>
              </View>

              {sesi.startedAt ? (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Pertama Kali Dibuka</Text>
                  <Text style={styles.gridValue}>{formatWib(sesi.startedAt)}</Text>
                </View>
              ) : null}
            </View>

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

          {sesi.kodeSesi && sesi.status === 'dibuka' ? (
            <View style={styles.codeCard}>
              <View style={styles.codeHeaderRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeBadgeText}>KODE & QR PRESENSI SESI</Text>
                </View>
                <Text style={styles.codeSubtitle}>
                  Bagikan 4 digit kode atau tampilkan QR Code kepada mahasiswa di dalam radius laboratorium
                </Text>
              </View>
              <View style={styles.codeBoxRow}>
                {sesi.kodeSesi.split('').map((char, index) => (
                  <View key={index} style={styles.codeCell}>
                    <Text style={styles.codeDigit}>{char}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowQrCode((prev) => !prev)}
                style={({ pressed }) => [
                  styles.qrToggleBtn,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.qrToggleBtnText}>
                  {showQrCode ? 'Sembunyikan QR Code Sesi' : 'Tampilkan QR Code Presensi'}
                </Text>
              </Pressable>

              {showQrCode ? (
                <View style={styles.qrDisplayWrap}>
                  <SessionQRCode
                    value={sesi.qrPayload || buildSessionQrPayload(sesi.id, sesi.kodeSesi)}
                    size={184}
                  />
                  <Text style={styles.qrDisplayCaption}>
                    Pindai dari Halaman Presensi Praktikan (tetap memerlukan validasi radius GPS)
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Kontrol Buka / Tutup Sesi Asprak */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Kontrol Sesi Praktikum</Text>

            {sesi.status === 'belum-dibuka' ? (
              <View style={styles.actionNoticeBox}>
                <View style={styles.actionNoticeInfo}>
                  <Text style={styles.actionNoticeTitle}>Sesi Belum Dimulai</Text>
                  <Text style={styles.actionNoticeSubtitle}>
                    Buka sesi agar praktikan dapat melakukan presensi secara real-time.
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
          </View>

          <AttendanceRoster
            kelasLabel={sesi.kelas}
            rows={rosterRows}
            totalIzinMenunggu={totalIzinMenunggu}
            onManualAttend={handleManualAttend}
          />
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={modalAction !== null}
        title={
          modalAction === 'buka'
            ? 'Buka Sesi Praktikum?'
            : modalAction === 'tutup'
            ? 'Tutup Sesi Praktikum?'
            : 'Buka Kembali Sesi Praktikum?'
        }
        description={
          modalAction === 'buka'
            ? `Buka sesi "${sesi.praktikum} (${sesi.kelas})"? Praktikan akan dapat langsung melakukan presensi.`
            : modalAction === 'tutup'
            ? `Apakah Anda yakin ingin menutup sesi "${sesi.praktikum} (${sesi.kelas})"? Setelah ditutup, praktikan tidak dapat melakukan presensi lagi.`
            : `Buka kembali sesi "${sesi.praktikum} (${sesi.kelas})"? Mahasiswa yang belum presensi akan dapat mengisi kehadiran susulan.`
        }
        confirmText={
          modalAction === 'buka'
            ? 'Ya, Buka Sesi'
            : modalAction === 'tutup'
            ? 'Ya, Tutup Sesi'
            : 'Ya, Buka Kembali'
        }
        cancelText="Batal"
        confirmVariant={modalAction === 'tutup' ? 'danger' : 'primary'}
        isLoading={actionLoading}
        onConfirm={handleEksekusiAksi}
        onCancel={() => !actionLoading && setModalAction(null)}
      />

      <ConfirmationModal
        visible={feedbackMessage !== null}
        title="Informasi Sesi"
        description={feedbackMessage ?? ''}
        confirmText="Mengerti"
        cancelText="Tutup"
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
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 100 : 32,
  },
  contentWrap: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  praktikumTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  kelasChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  materiBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
    padding: 10,
    borderRadius: 8,
    gap: 2,
  },
  materiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  materiContent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    minWidth: 140,
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  gridValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressContainer: {
    marginTop: 2,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  codeCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  codeHeaderRow: {
    gap: 4,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  codeSubtitle: {
    fontSize: 12,
    color: '#9A3412',
  },
  codeBoxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeCell: {
    width: 52,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    fontSize: 28,
    fontWeight: '900',
    color: '#EA580C',
  },
  qrToggleBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  qrDisplayWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  qrDisplayCaption: {
    fontSize: 11.5,
    color: '#9A3412',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionNoticeBox: {
    gap: 12,
  },
  actionNoticeInfo: {
    gap: 4,
  },
  actionNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionNoticeSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  closedNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  closedNoticeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  closedNoticeSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  openBtn: {
    backgroundColor: '#16A34A',
  },
  closeBtn: {
    backgroundColor: '#DC2626',
  },
  reopenBtn: {
    backgroundColor: '#0D9488',
  },
  btnTextWhite: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
