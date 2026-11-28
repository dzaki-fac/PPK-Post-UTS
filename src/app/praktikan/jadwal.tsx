import { router, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SesiCard } from '@/components/sesi-card';
import { useAuth } from '@/context/auth-context';
import {
  normalizeClassCode,
  subscribeStudentAttendances,
} from '@/services/attendance-service';
import {
  buildFallbackDefaultLabs,
  subscribeLabs,
} from '@/services/lab-service';
import {
  LeaveRequestDocument,
  subscribeStudentLeaveRequests,
} from '@/services/leave-service';
import {
  subscribeSessions,
} from '@/services/session-service';
import {
  AttendanceDocument,
  LabLocationDocument,
  SessionDocument,
  SessionStatus,
} from '@/types/praktikum';

type FilterType = 'semua' | 'kelas-saya' | SessionStatus;

export default function PraktikanJadwalScreen() {
  const { user, userDoc } = useAuth();
  const [sesiList, setSesiList] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>(() => buildFallbackDefaultLabs());
  const [myAttendances, setMyAttendances] = useState<AttendanceDocument[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestDocument[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filter, setFilter] = useState<FilterType>('semua');

  const studentUid = userDoc?.uid || user?.uid;

  useEffect(() => {
    const unsubSessions = subscribeSessions(
      (items) => {
        setSesiList(items);
        setLoadingSessions(false);
      },
      () => {
        setLoadingSessions(false);
      },
      { autoCloseExpired: false }
    );

    const unsubLabs = subscribeLabs(
      (items) => setLabs(items.length > 0 ? items : buildFallbackDefaultLabs()),
      () => setLabs(buildFallbackDefaultLabs())
    );

    let unsubAttendances: (() => void) | null = null;
    let unsubLeaves: (() => void) | null = null;

    if (studentUid) {
      unsubAttendances = subscribeStudentAttendances(studentUid, (items) => {
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
      if (unsubAttendances) {
        unsubAttendances();
      }
      if (unsubLeaves) {
        unsubLeaves();
      }
    };
  }, [studentUid, userDoc?.nim]);

  const studentClass = normalizeClassCode(userDoc?.kelas);
  const studentLabId = userDoc?.labId;
  const studentLabName = useMemo(() => {
    if (!studentLabId) return 'Semua Lab';
    return labs.find((l) => l.id === studentLabId)?.nama ?? studentLabId;
  }, [labs, studentLabId]);

  const scopedSesiList = useMemo(() => {
    if (!studentLabId) return sesiList;
    return sesiList.filter((s) => {
      if (s.labId) return s.labId === studentLabId;
      return !studentClass || normalizeClassCode(s.kelas) === studentClass;
    });
  }, [sesiList, studentLabId, studentClass]);

  const otherLabOpenSessions = useMemo(() => {
    if (!studentLabId) return [];
    return sesiList.filter((s) => s.status === 'dibuka' && s.labId && s.labId !== studentLabId);
  }, [sesiList, studentLabId]);

  const otherOpenLabNames = useMemo(() => {
    const names = Array.from(
      new Set(
        otherLabOpenSessions.map(
          (s) => labs.find((l) => l.id === s.labId)?.nama || s.ruang || s.labId || 'Lab Lain'
        )
      )
    );
    return names.join(', ');
  }, [otherLabOpenSessions, labs]);

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return scopedSesiList;
    if (filter === 'kelas-saya') {
      if (studentLabId) return scopedSesiList;
      if (!studentClass) return scopedSesiList;
      return scopedSesiList.filter((s) => normalizeClassCode(s.kelas) === studentClass);
    }
    return scopedSesiList.filter((s) => s.status === filter);
  }, [scopedSesiList, filter, studentClass, studentLabId]);

  const totalSesi = scopedSesiList.length;
  const totalDibuka = scopedSesiList.filter((s) => s.status === 'dibuka').length;
  const totalSudahHadir = myAttendances.filter((a) => a.attendanceStatus !== 'izin').length;
  const totalBelumBuka = scopedSesiList.filter((s) => s.status === 'belum-dibuka').length;
  const totalIzinDisetujui = myLeaves.filter((l) => l.status === 'disetujui').length;
  const totalIzinMenunggu = myLeaves.filter((l) => l.status === 'menunggu').length;

  const handleCardPress = (sesi: SessionDocument) => {
    router.push({
      pathname: '/praktikan/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const renderItem = ({ item }: { item: SessionDocument }) => {
    const presensiItem = myAttendances.find((p) => p.sessionId === item.id);
    const leaveItem = myLeaves.find((l) => l.sessionId === item.id);
    const isExcused = presensiItem?.attendanceStatus === 'izin';
    const isHadir = Boolean(presensiItem && !isExcused);
    const effectiveLeaveStatus = isExcused ? 'disetujui' : leaveItem?.status;

    return (
      <SesiCard
        sesi={item}
        role="praktikan"
        isHadir={isHadir}
        waktuHadir={presensiItem?.waktuKehadiran}
        leaveStatus={effectiveLeaveStatus}
        leaveCategory={leaveItem?.aiClassification?.category}
        onPress={() => handleCardPress(item)}
        onPresensiPress={
          item.status === 'dibuka' &&
          !isHadir &&
          effectiveLeaveStatus !== 'disetujui' &&
          effectiveLeaveStatus !== 'menunggu'
            ? () =>
                router.push({
                  pathname: '/praktikan/presensi',
                  params: { sessionId: item.id },
                } as unknown as Href)
            : undefined
        }
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Eyebrow & Live Indicator */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>PORTAL MAHASISWA</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>Sesi Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
      <Text style={styles.headerSubtitle}>
        Pilih sesi praktikum untuk mengisi formulir presensi mandiri atau melihat detail materi
      </Text>
      <View style={styles.scopePill}>
        <Text style={styles.scopePillText}>
          Lab Terdaftar: {studentLabName}
          {studentClass ? ` • Kelas ${studentClass}` : ''}
        </Text>
      </View>

      {/* Banner Ajukan Izin */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajukan Izin Praktikum"
        onPress={() => router.push('/praktikan/pengajuan-izin')}
        style={({ pressed }) => [styles.izinBanner, pressed && styles.cardPressed]}>
        <View style={styles.izinBannerLeft}>
          <Text style={styles.izinBannerTitle}>Pengajuan Izin Praktikum</Text>
          <Text style={styles.izinBannerSub}>
            Berhalangan hadir? Ajukan izin dengan analisis rekomendasi Model AI EDOM
          </Text>
        </View>
        <View style={styles.izinBannerBtn}>
          <Text style={styles.izinBannerBtnText}>Ajukan Izin →</Text>
        </View>
      </Pressable>

      {/* Banner Peta Laboratorium */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Peta Laboratorium Interaktif"
        onPress={() => router.push('/praktikan/peta-lab' as any)}
        style={({ pressed }) => [styles.mapBanner, pressed && styles.cardPressed]}>
        <View style={styles.mapBannerLeft}>
          <View style={styles.mapBannerTagRow}>
            <Text style={styles.mapBannerTitle}>Peta Laboratorium Interaktif</Text>
            <View style={styles.mapTag}>
              <Text style={styles.mapTagText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.mapBannerSub}>
            Lihat ruang lab Informatika, posisi Anda secara langsung, dan status aktivitas sesi
          </Text>
        </View>
        <View style={styles.mapBannerBtn}>
          <Text style={styles.mapBannerBtnText}>Buka Peta →</Text>
        </View>
      </Pressable>

      {/* Info bila di lab sendiri belum ada sesi dibuka, tetapi ada sesi dibuka di lab lain */}
      {totalDibuka === 0 && otherLabOpenSessions.length > 0 && (
        <View style={styles.otherLabNotice}>
          <Text style={styles.otherLabTitle}>
            Belum ada sesi dibuka di {studentLabName}
          </Text>
          <Text style={styles.otherLabSub}>
            Saat ini terdapat {otherLabOpenSessions.length} sesi dibuka di lab lain ({otherOpenLabNames}). Untuk mencoba presensi dari akun ini, buka sesi di {studentLabName} pada akun Asprak.
          </Text>
        </View>
      )}

      {/* Notice jika ada izin yang sedang menunggu keputusan */}
      {totalIzinMenunggu > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pantau Status Izin Menunggu"
          onPress={() => router.push('/praktikan/riwayat')}
          style={({ pressed }) => [styles.pendingStudentNotice, pressed && styles.cardPressed]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingStudentTitle}>
              {totalIzinMenunggu} Pengajuan Izin Menunggu Verifikasi Asprak
            </Text>
            <Text style={styles.pendingStudentSub}>
              Rekomendasi AI telah disematkan. Klik untuk memantau status persetujuan.
            </Text>
          </View>
          <Text style={styles.pendingStudentAction}>Cek Status →</Text>
        </Pressable>
      )}

      {/* Metrics Overview Cards (Matching Halaman 1 style) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalSesi}</Text>
          <Text style={styles.metricLbl}>Total Sesi</Text>
          <Text style={styles.metricDesc}>Modul PPK & BDD</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardDibuka]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{totalDibuka}</Text>
          <Text style={styles.metricLbl}>Sesi Dibuka</Text>
          <Text style={styles.metricDesc}>Presensi Aktif</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardHadir]}>
          <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalSudahHadir}</Text>
          <Text style={styles.metricLbl}>Sudah Hadir</Text>
          <Text style={styles.metricDesc}>Tercatat Sistem</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lihat Riwayat Izin"
          onPress={() => router.push('/praktikan/riwayat')}
          style={({ pressed }) => [
            styles.metricCard,
            styles.metricCardIzin,
            pressed && styles.cardPressed,
          ]}>
          <Text style={[styles.metricVal, { color: '#2563EB' }]}>
            {totalIzinDisetujui}
          </Text>
          <Text style={styles.metricLbl}>Izin Disetujui</Text>
          <Text style={styles.metricDesc}>
            {totalIzinMenunggu > 0 ? `${totalIzinMenunggu} Menunggu →` : 'Riwayat Izin'}
          </Text>
        </Pressable>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalBelumBuka}</Text>
          <Text style={styles.metricLbl}>Belum Buka</Text>
          <Text style={styles.metricDesc}>Sesi Mendatang</Text>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Berdasarkan Status & Kelas:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <FilterChip
            label="Semua"
            active={filter === 'semua'}
            count={scopedSesiList.length}
            onPress={() => setFilter('semua')}
          />
          {userDoc && studentClass ? (
            <FilterChip
              label={`Kelas Saya (${studentClass})`}
              active={filter === 'kelas-saya'}
              count={scopedSesiList.filter((s) => normalizeClassCode(s.kelas) === studentClass).length}
              onPress={() => setFilter('kelas-saya')}
            />
          ) : null}
          <FilterChip
            label="Dibuka"
            active={filter === 'dibuka'}
            count={scopedSesiList.filter((s) => s.status === 'dibuka').length}
            variant="dibuka"
            onPress={() => setFilter('dibuka')}
          />
          <FilterChip
            label="Belum Dibuka"
            active={filter === 'belum-dibuka'}
            count={scopedSesiList.filter((s) => s.status === 'belum-dibuka').length}
            variant="belum-dibuka"
            onPress={() => setFilter('belum-dibuka')}
          />
          <FilterChip
            label="Ditutup"
            active={filter === 'ditutup'}
            count={scopedSesiList.filter((s) => s.status === 'ditutup').length}
            variant="ditutup"
            onPress={() => setFilter('ditutup')}
          />
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSesiList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loadingSessions ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.loadingStateText}>
                Menyinkronkan jadwal praktikum dari Firestore...
              </Text>
            </View>
          ) : (
            <EmptyState
              title="Tidak Ada Sesi"
              message={
                filter === 'kelas-saya'
                  ? `Tidak ada sesi praktikum yang terdaftar untuk Kelas ${studentClass || '-'}.`
                  : filter === 'semua'
                  ? 'Belum ada jadwal praktikum yang tersedia saat ini.'
                  : `Tidak ada sesi praktikum dengan status "${filter}".`
              }
              actionText={filter !== 'semua' ? 'Tampilkan Semua Sesi' : undefined}
              onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
            />
          )
        }
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  variant?: SessionStatus;
  onPress: () => void;
}) {
  const getBadgeStyle = () => {
    if (active) return styles.chipActive;
    return styles.chipInactive;
  };

  const getTextStyle = () => {
    if (active) return styles.chipTextActive;
    return styles.chipTextInactive;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        getBadgeStyle(),
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}>
      <Text style={[styles.chipText, getTextStyle()]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
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
    paddingTop: 20,
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
  scopePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scopePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  otherLabNotice: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  otherLabTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#9A3412',
  },
  otherLabSub: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#C2410C',
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
  metricCardDibuka: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  metricCardHadir: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  metricCardIzin: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  pendingStudentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  pendingStudentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingStudentSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  pendingStudentAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
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
  filterSection: {
    gap: 8,
    marginTop: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  mapBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  mapBannerLeft: {
    flex: 1,
    gap: 3,
  },
  mapBannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  mapTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mapTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },
  mapBannerSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  mapBannerBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  izinBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  izinBannerLeft: {
    flex: 1,
    gap: 2,
  },
  izinBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
  },
  izinBannerSub: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 16,
  },
  izinBannerBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  izinBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardPressed: {
    opacity: 0.85,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
