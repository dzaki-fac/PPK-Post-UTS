import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { DeviceStatusBanner } from '@/components/device-status-banner';
import { EmptyState } from '@/components/empty-state';
import { LocationStatusCard } from '@/components/location-status-card';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/context/auth-context';
import { useDeviceResilience } from '@/hooks/use-device-resilience';
import {
  normalizeClassCode,
  submitAttendance,
  subscribeStudentAttendances,
} from '@/services/attendance-service';
import {
  DEFAULT_LAB_RADIUS_METER,
  buildFallbackDefaultLabs,
  clampRadiusMeter,
  resolveLabForSession,
  subscribeLabs,
} from '@/services/lab-service';
import {
  LeaveRequestDocument,
  subscribeStudentLeaveRequests,
} from '@/services/leave-service';
import {
  formatDistanceMeters,
  openDeviceLocationSettings,
  verifyUserLocationForLab,
} from '@/services/location-service';
import { requestServerLatenessEvaluation } from '@/services/payment-service';
import { subscribeSessions } from '@/services/session-service';
import {
  AttendanceDocument,
  LabLocationDocument,
  LocationVerificationResult,
  SessionDocument,
} from '@/types/praktikum';
import { parseSessionQrPayload } from '@/utils/qr-payload';

type VerificationInputMode = 'code-location' | 'qr-location';

export default function PraktikanPresensiScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const paramSessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  const { user, userDoc } = useAuth();
  const device = useDeviceResilience({ checkLocation: false });
  const studentUid = userDoc?.uid || user?.uid;
  const studentClass = normalizeClassCode(userDoc?.kelas);

  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [myAttendances, setMyAttendances] = useState<AttendanceDocument[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSessionId, setSelectedSessionId] = useState<string>(paramSessionId ?? '');
  const [prevParamSessionId, setPrevParamSessionId] = useState(paramSessionId);

  // Form & Geofencing State
  const [verificationMode, setVerificationMode] =
    useState<VerificationInputMode>('code-location');
  const [kodeInput, setKodeInput] = useState('');
  const [qrPayloadInput, setQrPayloadInput] = useState('');
  const [qrVerifiedCode, setQrVerifiedCode] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(true);

  const [resolvedLab, setResolvedLab] = useState<LabLocationDocument | null>(null);
  const [locationResult, setLocationResult] = useState<LocationVerificationResult | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);

  // QR Scanner Modal State
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Submission Modals
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sinkronkan param route jika pengguna membuka halaman presensi dari sesi berbeda
  if (paramSessionId !== prevParamSessionId) {
    setPrevParamSessionId(paramSessionId);
    if (paramSessionId) {
      setSelectedSessionId(paramSessionId);
    }
    setKodeInput('');
    setQrPayloadInput('');
    setQrVerifiedCode(null);
    setCatatan('');
    setLocationResult(null);
    setErrorMessage(null);
  }

  useEffect(() => {
    const unsubSessions = subscribeSessions(
      (items) => {
        setSessions(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    const unsubLabs = subscribeLabs(
      (items) => {
        setLabs(items.length > 0 ? items : buildFallbackDefaultLabs());
      },
      () => {
        setLabs(buildFallbackDefaultLabs());
      }
    );

    let unsubAtt: (() => void) | null = null;
    let unsubLeaves: (() => void) | null = null;

    if (studentUid) {
      unsubAtt = subscribeStudentAttendances(studentUid, (items) => {
        setMyAttendances(items);
      });
      unsubLeaves = subscribeStudentLeaveRequests(
        studentUid,
        (items) => {
          setMyLeaves(items);
        },
        userDoc?.nim
      );
    }

    return () => {
      unsubSessions();
      unsubLabs();
      if (unsubAtt) unsubAtt();
      if (unsubLeaves) unsubLeaves();
    };
  }, [studentUid, userDoc?.nim]);

  const studentLabId = userDoc?.labId;

  // Urutkan sesi: tampilkan seluruh sesi dibuka (termasuk lintas lab bila baru dibuka),
  // lalu prioritaskan sesi kelas mahasiswa & lab terdaftar terbaru
  const orderedSessions = useMemo(() => {
    const relevant = sessions.filter((s) => {
      if (paramSessionId && s.id === paramSessionId) return true;
      if (s.status === 'dibuka') return true;
      if (!studentLabId) return true;
      if (s.labId) return s.labId === studentLabId;
      return !studentClass || normalizeClassCode(s.kelas) === studentClass;
    });
    const baseList = relevant.length > 0 ? relevant : sessions;

    const statusRank = (status: SessionDocument['status']) =>
      status === 'dibuka' ? 0 : status === 'belum-dibuka' ? 1 : 2;

    return [...baseList].sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status);
      if (rankDiff !== 0) return rankDiff;

      const aClassMatch = studentClass && normalizeClassCode(a.kelas) === studentClass ? 0 : 1;
      const bClassMatch = studentClass && normalizeClassCode(b.kelas) === studentClass ? 0 : 1;
      if (aClassMatch !== bClassMatch) return aClassMatch - bClassMatch;

      if (studentLabId) {
        const aLabMatch = a.labId === studentLabId ? 0 : 1;
        const bLabMatch = b.labId === studentLabId ? 0 : 1;
        if (aLabMatch !== bLabMatch) return aLabMatch - bLabMatch;
      }

      const aTime = a.openedAt || a.updatedAt || a.createdAt;
      const bTime = b.openedAt || b.updatedAt || b.createdAt;
      return bTime.localeCompare(aTime);
    });
  }, [sessions, studentClass, studentLabId, paramSessionId]);

  const activeSession = useMemo(() => {
    if (selectedSessionId) {
      const found = orderedSessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    return orderedSessions[0] ?? null;
  }, [orderedSessions, selectedSessionId]);

  const activeSessionId = activeSession?.id ?? '';

  // Reset input lokal ketika pengguna mengganti sesi di pemilih sesi
  const [prevActiveSessionId, setPrevActiveSessionId] = useState(activeSessionId);
  if (activeSessionId !== prevActiveSessionId) {
    setPrevActiveSessionId(activeSessionId);
    setKodeInput('');
    setQrPayloadInput('');
    setQrVerifiedCode(null);
    setCatatan('');
    setResolvedLab(null);
    setLocationResult(null);
  }

  const allowedRadiusMeters =
    activeSession?.radiusOverride !== undefined
      ? clampRadiusMeter(activeSession.radiusOverride)
      : resolvedLab
      ? clampRadiusMeter(resolvedLab.radiusMeter)
      : DEFAULT_LAB_RADIUS_METER;

  const runLocationCheck = useCallback(
    async (targetLab: LabLocationDocument, radiusOverride?: number) => {
      setCheckingLocation(true);
      try {
        const res = await verifyUserLocationForLab(targetLab, {
          radiusOverride,
          requestPermission: true,
        });
        setLocationResult(res);
      } finally {
        setCheckingLocation(false);
      }
    },
    []
  );

  // Selesaikan lab acuan dan lakukan pemeriksaan lokasi otomatis setiap kali sesi aktif berubah
  useEffect(() => {
    if (!activeSession) {
      return;
    }

    let cancelled = false;
    (async () => {
      const lab = await resolveLabForSession(activeSession, labs);
      if (cancelled) return;
      setResolvedLab(lab);
      if (lab && activeSession.status === 'dibuka') {
        await runLocationCheck(lab, activeSession.radiusOverride);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSession, labs, runLocationCheck]);

  const activeAttendanceRecord = activeSessionId
    ? myAttendances.find((a) => a.sessionId === activeSessionId) ?? null
    : null;
  const activeAttendanceId = activeAttendanceRecord?.id ?? '';
  const activeAttendanceEvaluatedBy = activeAttendanceRecord?.lateness?.evaluatedBy;
  const activeAttendanceStatus = activeAttendanceRecord?.attendanceStatus;

  // Pemulihan otomatis: jika presensi masih dievaluasi client, picu ulang verifikasi server
  useEffect(() => {
    if (
      activeAttendanceId &&
      activeAttendanceEvaluatedBy === 'client' &&
      activeAttendanceStatus !== 'izin'
    ) {
      void requestServerLatenessEvaluation(activeAttendanceId);
    }
  }, [activeAttendanceId, activeAttendanceEvaluatedBy, activeAttendanceStatus]);

  const handleRefreshLocation = async () => {
    if (!activeSession) return;
    const lab = resolvedLab ?? (await resolveLabForSession(activeSession, labs));
    if (!lab) {
      setErrorMessage('Data koordinat laboratorium untuk sesi ini belum tersedia.');
      return;
    }
    setResolvedLab(lab);
    await runLocationCheck(lab, activeSession.radiusOverride);
  };

  const handleOpenQrScanner = async () => {
    setQrError(null);
    if (Platform.OS === 'web') {
      setQrError(
        'Pemindai kamera QR Code tersedia pada aplikasi Android/iOS. Pada browser web, gunakan metode Input Kode 4 Digit.'
      );
      return;
    }
    if (!cameraPermission?.granted) {
      const grantedRes = await requestCameraPermission();
      if (!grantedRes.granted) {
        setQrError(
          'Izin kamera ditolak. Aktifkan izin kamera pada Pengaturan perangkat atau gunakan Input Kode 4 Digit.'
        );
        return;
      }
    }
    setQrModalVisible(true);
  };

  const handleBarcodeScanned = (scan: BarcodeScanningResult) => {
    const parsed = parseSessionQrPayload(scan.data);
    if (!parsed) {
      setQrError('QR Code tidak dikenali sebagai QR resmi presensi PPK LabPortal.');
      setQrModalVisible(false);
      return;
    }

    // Jika QR merujuk sesi lain yang terdaftar di database, arahkan otomatis ke sesi tersebut
    if (activeSession && parsed.sessionId !== activeSession.id) {
      const matchedSession =
        orderedSessions.find((s) => s.id === parsed.sessionId) ??
        sessions.find((s) => s.id === parsed.sessionId);
      if (matchedSession) {
        setSelectedSessionId(matchedSession.id);
      } else {
        setQrError('QR Code yang dipindai bukan milik sesi praktikum yang sedang dipilih.');
        setQrModalVisible(false);
        return;
      }
    }

    setQrPayloadInput(scan.data);
    setQrVerifiedCode(parsed.kodeSesi);
    setKodeInput(parsed.kodeSesi);
    setVerificationMode('qr-location');
    setQrError(null);
    setQrModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat halaman presensi berbasis lokasi...</Text>
      </View>
    );
  }

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Belum Ada Sesi Praktikum"
          message="Jadwal sesi praktikum belum tersedia di Firestore. Silakan periksa kembali nanti."
          actionText="← Kembali ke Jadwal"
          onAction={() => router.replace('/praktikan/jadwal')}
        />
      </View>
    );
  }

  const attendanceRecord = myAttendances.find((a) => a.sessionId === activeSession.id) ?? null;
  const alreadyPresensi = Boolean(attendanceRecord);
  const leaveRecord = myLeaves.find((l) => l.sessionId === activeSession.id) ?? null;
  const hasActiveLeave = Boolean(
    leaveRecord && (leaveRecord.status === 'disetujui' || leaveRecord.status === 'menunggu')
  );

  const sessionClass = normalizeClassCode(activeSession.kelas);
  const isClassMismatch = Boolean(
    studentClass && sessionClass && studentClass !== sessionClass
  );

  const isLocationValid = Boolean(
    locationResult?.isWithinRadius && locationResult.status === 'within_radius'
  );

  const isCodeReady =
    verificationMode === 'qr-location'
      ? Boolean(qrPayloadInput && qrVerifiedCode)
      : !activeSession.kodeSesi || kodeInput.trim().length === 4;

  const isSubmitDisabled =
    submitting ||
    checkingLocation ||
    !device.isOnline ||
    !userDoc ||
    !agreementChecked ||
    isClassMismatch ||
    hasActiveLeave ||
    alreadyPresensi ||
    activeSession.status !== 'dibuka' ||
    !isLocationValid ||
    !isCodeReady;

  const handleConfirmPresensi = async () => {
    if (!userDoc || !activeSession) return;
    if (!device.isOnline) {
      setConfirmVisible(false);
      setErrorMessage(
        'Koneksi internet terputus. Presensi membutuhkan koneksi internet agar dapat tercatat di server.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitAttendance({
        session: activeSession,
        student: userDoc,
        kodeInput: kodeInput.trim(),
        catatan,
        verificationMethod: verificationMode,
        qrPayloadInput: verificationMode === 'qr-location' ? qrPayloadInput : undefined,
        lab: resolvedLab,
        locationResult,
      });

      if (response.locationResult) {
        setLocationResult(response.locationResult);
      }

      setConfirmVisible(false);
      if (response.success) {
        setSuccessMessage(response.message);
      } else {
        setErrorMessage(response.message);
      }
    } catch (err) {
      setConfirmVisible(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal mencatat presensi ke Cloud Firestore. Periksa koneksi internet Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitButtonLabel = (() => {
    if (!device.isOnline) return 'Koneksi Terputus - Cek Jaringan';
    if (isClassMismatch) return 'Beda Kelas - Tidak Dapat Presensi';
    if (checkingLocation) return 'Memeriksa Lokasi GPS...';
    if (!isLocationValid) {
      if (locationResult?.status === 'outside_radius') {
        return 'Di Luar Radius Laboratorium';
      }
      return 'Lokasi Belum Terverifikasi';
    }
    if (!isCodeReady) {
      return verificationMode === 'qr-location'
        ? 'Pindai QR Code Terlebih Dahulu'
        : 'Masukkan 4 Digit Kode Sesi';
    }
    return 'Kirim Presensi Kehadiran';
  })();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrap}>
          {/* Breadcrumb Back Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Jadwal Praktikum"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/praktikan/jadwal');
              }
            }}
            style={({ pressed }) => [styles.breadcrumbPill, pressed && styles.btnPressed]}>
            <Text style={styles.breadcrumbText}>← Kembali ke Jadwal Praktikum</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.pageHeader}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>PRESENSI GEOFENCING</Text>
              </View>
            </View>
            <Text style={styles.pageTitle}>Halaman Presensi Praktikum</Text>
            <Text style={styles.pageSubtitle}>
              Kehadiran hanya dicatat jika perangkat Anda berada di dalam radius laboratorium dan sesi sedang dibuka
            </Text>
          </View>

          {!device.isOnline ? (
            <DeviceStatusBanner type="offline" onRetry={device.refresh} />
          ) : null}

          {/* Session Picker (ketika tersedia lebih dari 1 sesi) */}
          {orderedSessions.length > 1 ? (
            <View style={styles.selectorCard}>
              <View style={styles.selectorHeaderRow}>
                <Text style={styles.selectorTitle}>Pilih Sesi Praktikum</Text>
                <Text style={styles.selectorCount}>{orderedSessions.length} Sesi</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorList}>
                {orderedSessions.map((item) => {
                  const selected = item.id === activeSession.id;
                  const itemAttended = myAttendances.some((a) => a.sessionId === item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => setSelectedSessionId(item.id)}
                      style={[
                        styles.sessionChip,
                        selected && styles.sessionChipActive,
                      ]}>
                      <View style={styles.sessionChipTop}>
                        <Text
                          style={[
                            styles.sessionChipTitle,
                            selected && styles.sessionChipTitleActive,
                          ]}
                          numberOfLines={1}>
                          {item.praktikum}
                        </Text>
                        <View
                          style={[
                            styles.sessionStatusPill,
                            item.status === 'dibuka'
                              ? styles.pillOpen
                              : item.status === 'ditutup'
                              ? styles.pillClosed
                              : styles.pillWait,
                          ]}>
                          <Text
                            style={[
                              styles.sessionStatusPillText,
                              item.status === 'dibuka'
                                ? { color: '#15803D' }
                                : item.status === 'ditutup'
                                ? { color: '#B91C1C' }
                                : { color: '#B45309' },
                            ]}>
                            {itemAttended
                              ? 'Hadir'
                              : item.status === 'dibuka'
                              ? 'Dibuka'
                              : item.status === 'ditutup'
                              ? 'Ditutup'
                              : 'Menunggu'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sessionChipMeta} numberOfLines={1}>
                        {item.kelas} • {item.ruang}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Session Detail Summary Card */}
          <View style={styles.card}>
            <View style={styles.sessionHeaderRow}>
              <View style={styles.sessionTitleWrap}>
                <Text style={styles.praktikumName}>{activeSession.praktikum}</Text>
                <View style={styles.kelasChip}>
                  <Text style={styles.kelasChipText}>{activeSession.kelas}</Text>
                </View>
              </View>
              <StatusBadge status={activeSession.status} />
            </View>

            {activeSession.materi ? (
              <View style={styles.materiBox}>
                <Text style={styles.materiLabel}>Materi Modul:</Text>
                <Text style={styles.materiContent}>{activeSession.materi}</Text>
              </View>
            ) : null}

            <View style={styles.metaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Tanggal & Waktu</Text>
                <Text style={styles.metaValue}>
                  {activeSession.tanggal} • {activeSession.waktuMulai} - {activeSession.waktuSelesai} WIB
                </Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Ruang Laboratorium</Text>
                <Text style={styles.metaValue}>
                  {resolvedLab ? `${resolvedLab.nama} (${resolvedLab.kode})` : activeSession.ruang}
                </Text>
              </View>
            </View>
          </View>

          {/* Status & Attendance Flow */}
          {attendanceRecord?.attendanceStatus === 'izin' ? (
            <View style={styles.leaveBlockedCard}>
              <Text style={styles.leaveBlockedTitle}>Anda Tercatat Izin pada Sesi Ini</Text>
              <Text style={styles.leaveBlockedDesc}>
                Pengajuan izin Anda telah disetujui Asprak sebagai tidak hadir dengan izin (excused absence) dan dibebaskan dari denda keterlambatan.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/praktikan/riwayat')}
                style={styles.secondaryActionBtn}>
                <Text style={styles.secondaryActionBtnText}>Lihat Riwayat & Izin →</Text>
              </Pressable>
            </View>
          ) : alreadyPresensi ? (
            <View style={styles.verifiedCard}>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>
                  {attendanceRecord?.attendanceStatus === 'terlambat'
                    ? 'TERCATAT TERLAMBAT'
                    : 'HADIR TEPAT WAKTU'}
                </Text>
              </View>
              <Text style={styles.verifiedTitle}>
                {attendanceRecord?.attendanceStatus === 'terlambat'
                  ? `Terlambat ${attendanceRecord.lateness?.minutesAfterStart ?? 0} Menit`
                  : 'Anda Sudah Melakukan Presensi'}
              </Text>
              <Text style={styles.verifiedSub}>
                Kehadiran tercatat pada {attendanceRecord?.waktuKehadiran ?? '-'} •{' '}
                {attendanceRecord?.lateness?.evaluatedBy === 'server'
                  ? 'Terverifikasi Server'
                  : 'Memverifikasi status di server...'}
              </Text>

              {attendanceRecord?.locationSnapshot ? (
                <View style={styles.snapshotBox}>
                  <Text style={styles.snapshotTitle}>Bukti Validasi Lokasi Geofencing</Text>
                  <Text style={styles.snapshotRow}>
                    Laboratorium: {attendanceRecord.locationSnapshot.labName}
                  </Text>
                  <Text style={styles.snapshotRow}>
                    Jarak Terukur:{' '}
                    {formatDistanceMeters(attendanceRecord.locationSnapshot.distanceMeters)} (Batas:{' '}
                    {attendanceRecord.locationSnapshot.allowedRadiusMeters} meter)
                  </Text>
                  <Text style={styles.snapshotRow}>
                    Metode:{' '}
                    {attendanceRecord.verificationMethod === 'qr-location'
                      ? 'QR Code + GPS Geofencing'
                      : 'Kode 4 Digit + GPS Geofencing'}
                  </Text>
                </View>
              ) : null}

              {attendanceRecord?.attendanceStatus === 'terlambat' ||
              attendanceRecord?.fineId ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      (attendanceRecord?.fineId
                        ? `/praktikan/tagihan/${attendanceRecord.fineId}`
                        : '/praktikan/tagihan') as Href
                    )
                  }
                  style={({ pressed }) => [
                    styles.secondaryActionBtn,
                    pressed && styles.btnPressed,
                  ]}>
                  <Text style={styles.secondaryActionBtnText}>Lihat Tagihan Denda →</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/praktikan/riwayat')}
                style={({ pressed }) => [
                  styles.secondaryActionBtn,
                  pressed && styles.btnPressed,
                ]}>
                <Text style={styles.secondaryActionBtnText}>Lihat Riwayat Kehadiran →</Text>
              </Pressable>
            </View>
          ) : hasActiveLeave ? (
            <View style={styles.leaveBlockedCard}>
              <Text style={styles.leaveBlockedTitle}>Pengajuan Izin Aktif pada Sesi Ini</Text>
              <Text style={styles.leaveBlockedDesc}>
                Status izin Anda saat ini:{' '}
                {leaveRecord?.status === 'disetujui' ? 'Disetujui Asprak' : 'Menunggu Verifikasi'}.
                Praktikan dengan izin aktif tidak dapat mencatat presensi kehadiran pada sesi yang sama.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/praktikan/riwayat')}
                style={styles.secondaryActionBtn}>
                <Text style={styles.secondaryActionBtnText}>Cek Status Izin di Riwayat →</Text>
              </Pressable>
            </View>
          ) : activeSession.status === 'belum-dibuka' ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Sesi Belum Dibuka oleh Asprak</Text>
              <Text style={styles.warningDesc}>
                Formulir presensi berbasis lokasi akan otomatis aktif setelah Asprak membuka sesi praktikum ini.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/praktikan/pengajuan-izin',
                    params: { sessionId: activeSession.id },
                  })
                }
                style={styles.leaveShortcutBtn}>
                <Text style={styles.leaveShortcutText}>Berhalangan Hadir? Ajukan Izin →</Text>
              </Pressable>
            </View>
          ) : activeSession.status === 'ditutup' ? (
            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>Sesi Praktikum Telah Ditutup</Text>
              <Text style={styles.dangerDesc}>
                Waktu presensi untuk sesi ini sudah berakhir dan ditutup oleh Asprak. Sistem menolak pencatatan kehadiran baru.
              </Text>
            </View>
          ) : (
            <>
              {/* Class Mismatch Guard */}
              {isClassMismatch ? (
                <View style={styles.dangerCard}>
                  <Text style={styles.dangerTitle}>Perhatian: Kelas Tidak Sesuai</Text>
                  <Text style={styles.dangerDesc}>
                    Anda terdaftar di Kelas {studentClass}, sedangkan sesi ini khusus untuk Kelas{' '}
                    {sessionClass}. Presensi hanya diizinkan untuk kelas sesuai jadwal Anda.
                  </Text>
                </View>
              ) : null}

              {/* Location Geofencing Status Card */}
              <LocationStatusCard
                lab={resolvedLab}
                allowedRadiusMeters={allowedRadiusMeters}
                result={locationResult}
                checking={checkingLocation}
                onRefresh={handleRefreshLocation}
                accentColor="#EA580C"
              />

              {/* Verification Form Card */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Verifikasi Kehadiran Sesi</Text>

                {/* Method Switcher: Kode 4 Digit vs Pindai QR Code */}
                <View style={styles.modeSwitchRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setVerificationMode('code-location');
                      setQrError(null);
                    }}
                    style={[
                      styles.modeBtn,
                      verificationMode === 'code-location' && styles.modeBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.modeBtnText,
                        verificationMode === 'code-location' && styles.modeBtnTextActive,
                      ]}>
                      Kode 4 Digit
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setVerificationMode('qr-location');
                      setQrError(null);
                    }}
                    style={[
                      styles.modeBtn,
                      verificationMode === 'qr-location' && styles.modeBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.modeBtnText,
                        verificationMode === 'qr-location' && styles.modeBtnTextActive,
                      ]}>
                      Pindai QR Code
                    </Text>
                  </Pressable>
                </View>

                {verificationMode === 'code-location' ? (
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>Kode Sesi Presensi (4 Digit)</Text>
                      <View style={styles.requiredTag}>
                        <Text style={styles.requiredTagText}>Wajib</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="Masukkan 4 digit kode (mis. 2401)"
                      placeholderTextColor="#94A3B8"
                      value={kodeInput}
                      onChangeText={(t) => setKodeInput(t.replace(/[^0-9]/g, '').slice(0, 4))}
                      keyboardType="number-pad"
                      maxLength={4}
                      editable={!isClassMismatch}
                    />
                    <Text style={styles.helperText}>
                      Dapatkan kode 4 digit dari layar Asprak di dalam ruang laboratorium.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.qrSection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Buka Pemindai QR Code"
                      onPress={handleOpenQrScanner}
                      disabled={isClassMismatch}
                      style={({ pressed }) => [
                        styles.qrScanBtn,
                        pressed && !isClassMismatch && styles.btnPressed,
                        isClassMismatch && styles.btnDisabled,
                      ]}>
                      <Text style={styles.qrScanBtnText}>
                        {qrVerifiedCode
                          ? 'Pindai Ulang QR Code Sesi'
                          : 'Buka Pemindai QR Code'}
                      </Text>
                    </Pressable>

                    {qrVerifiedCode ? (
                      <View style={styles.qrVerifiedBox}>
                        <Text style={styles.qrVerifiedTitle}>QR Code Sesi Terbaca</Text>
                        <Text style={styles.qrVerifiedMeta}>
                          Kode Sesi Terdeteksi: {qrVerifiedCode} • Tetap memerlukan validasi lokasi di dalam radius lab.
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.helperText}>
                        Arahkan kamera ke QR Code sesi yang ditampilkan Asprak di laboratorium.
                      </Text>
                    )}

                    {qrError ? (
                      <View style={styles.qrErrorBox}>
                        <Text style={styles.qrErrorText}>{qrError}</Text>
                        {Platform.OS !== 'web' && cameraPermission?.granted === false ? (
                          <Pressable
                            onPress={() => {
                              openDeviceLocationSettings();
                            }}>
                            <Text style={styles.qrErrorLink}>Buka Pengaturan Kamera →</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Catatan Kehadiran (Opsional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mis. Meja Lab 05, perangkat siap praktikum"
                    placeholderTextColor="#94A3B8"
                    value={catatan}
                    onChangeText={setCatatan}
                    editable={!isClassMismatch}
                  />
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreementChecked }}
                  onPress={() => !isClassMismatch && setAgreementChecked((v) => !v)}
                  style={styles.checkboxRow}>
                  <View
                    style={[
                      styles.checkboxBox,
                      agreementChecked && styles.checkboxBoxChecked,
                    ]}>
                    {agreementChecked ? <View style={styles.checkboxInner} /> : null}
                  </View>
                  <Text style={styles.checkboxText}>
                    Saya menyatakan benar hadir secara fisik di ruang laboratorium dan mengisi presensi secara mandiri.
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kirim Presensi Kehadiran"
                  onPress={() => setConfirmVisible(true)}
                  disabled={isSubmitDisabled}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    isSubmitDisabled && styles.submitBtnDisabled,
                    pressed && !isSubmitDisabled && styles.btnPressed,
                  ]}>
                  <Text
                    style={[
                      styles.submitBtnText,
                      isSubmitDisabled && styles.submitBtnTextDisabled,
                    ]}>
                    {submitButtonLabel}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal Pemindai Kamera QR Code */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.qrModalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.qrModalTitle}>Pindai QR Code Presensi</Text>
                <Text style={styles.qrModalSub}>
                  Arahkan kotak bidik ke QR Code aktif milik Asprak
                </Text>
              </View>
              <Pressable
                onPress={() => setQrModalVisible(false)}
                style={styles.qrModalCloseBtn}>
                <Text style={styles.qrModalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.cameraView}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scannerOverlayFrame} pointerEvents="none" />
            </View>

            <Pressable
              onPress={() => setQrModalVisible(false)}
              style={styles.qrModalCancelBtn}>
              <Text style={styles.qrModalCancelText}>Batal & Kembali</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Presensi */}
      <ConfirmationModal
        visible={confirmVisible}
        title="Konfirmasi Presensi Berbasis Lokasi"
        description="Sistem akan memverifikasi ulang status sesi, kode/QR, dan koordinat GPS Anda di Firestore."
        confirmText="Ya, Catat Kehadiran"
        cancelText="Batal"
        confirmVariant="primary"
        isLoading={submitting}
        onConfirm={handleConfirmPresensi}
        onCancel={() => !submitting && setConfirmVisible(false)}>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Praktikan:</Text>
            <Text style={styles.summaryVal}>
              {userDoc?.nama} ({userDoc?.nim ?? '-'})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sesi:</Text>
            <Text style={styles.summaryVal}>
              {activeSession.praktikum} ({activeSession.kelas})
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Lokasi Lab:</Text>
            <Text style={styles.summaryVal}>
              {resolvedLab?.nama ?? activeSession.ruang}
              {locationResult?.distanceMeters !== undefined
                ? ` (${formatDistanceMeters(locationResult.distanceMeters)})`
                : ''}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Metode:</Text>
            <Text style={styles.summaryVal}>
              {verificationMode === 'qr-location'
                ? 'QR Code + GPS Geofencing'
                : `Kode ${kodeInput.trim()} + GPS Geofencing`}
            </Text>
          </View>
        </View>
      </ConfirmationModal>

      {/* Error Feedback Modal */}
      <ConfirmationModal
        visible={errorMessage !== null}
        title="Presensi Tidak Berhasil"
        description={errorMessage ?? ''}
        confirmText="Mengerti"
        cancelText="Tutup"
        confirmVariant="danger"
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}
      />

      {/* Success Modal */}
      <ConfirmationModal
        visible={successMessage !== null}
        title="Presensi Berhasil Tercatat"
        description={successMessage ?? ''}
        confirmText="Lihat Riwayat Presensi"
        cancelText="Tetap di Sini"
        confirmVariant="primary"
        onConfirm={() => {
          setSuccessMessage(null);
          router.push('/praktikan/riwayat');
        }}
        onCancel={() => setSuccessMessage(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 104 : 36,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 14,
  },
  pageHeader: {
    gap: 6,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  breadcrumbText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.7,
  },
  liveTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectorCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectorList: {
    gap: 10,
    paddingRight: 4,
  },
  sessionChip: {
    width: 215,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  sessionChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  sessionChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sessionChipTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  sessionChipTitleActive: {
    color: '#C2410C',
  },
  sessionChipMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  sessionStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillOpen: {
    backgroundColor: '#DCFCE7',
  },
  pillWait: {
    backgroundColor: '#FEF3C7',
  },
  pillClosed: {
    backgroundColor: '#FEE2E2',
  },
  sessionStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sessionTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  praktikumName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kelasChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  materiBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
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
    color: '#1E293B',
    lineHeight: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaCell: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  verifiedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14532D',
  },
  verifiedSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  snapshotBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  snapshotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 2,
  },
  snapshotRow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  leaveBlockedCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  leaveBlockedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  leaveBlockedDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
  },
  warningDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },
  leaveShortcutBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  leaveShortcutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C1C',
  },
  dangerDesc: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 19,
  },
  secondaryActionBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  modeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inputLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  requiredTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  codeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 4,
    minHeight: 48,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 44,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  qrSection: {
    gap: 10,
  },
  qrScanBtn: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  qrScanBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qrVerifiedBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    gap: 3,
  },
  qrVerifiedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  qrVerifiedMeta: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  qrErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  qrErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 17,
  },
  qrErrorLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxBoxChecked: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  checkboxInner: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  submitBtnTextDisabled: {
    color: '#64748B',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  qrModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  qrModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  cameraContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#0F172A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraView: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scannerOverlayFrame: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#EA580C',
    backgroundColor: 'transparent',
  },
  qrModalCancelBtn: {
    minHeight: 46,
    margin: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalCancelText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryVal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
});
