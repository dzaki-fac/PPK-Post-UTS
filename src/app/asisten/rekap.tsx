import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { usePraktikum } from '@/context/praktikum-context';
import { Praktikan, Sesi } from '@/types/praktikum';

type RekapSesiItem = {
  sesi: Sesi;
  totalKelas: number;
  totalHadir: number;
  persentase: number;
  daftarMahasiswa: {
    praktikan: Praktikan;
    hadir: boolean;
    waktuHadir?: string;
  }[];
};

export default function RekapAsistenScreen() {
  const { sesiList, presensiList, daftarPraktikan } = usePraktikum();
  const [expandedSesiId, setExpandedSesiId] = useState<string | null>(null);

  // Bangun rekap data untuk setiap sesi (dibuka dan ditutup diutamakan)
  const rekapData: RekapSesiItem[] = useMemo(() => {
    return sesiList
      .filter((s) => s.status === 'dibuka' || s.status === 'ditutup')
      .map((sesi) => {
        const kodeKelas = sesi.kelas.replace(/[^A-Za-z]/g, '').slice(-1);
        const kelasMahasiswa = daftarPraktikan.filter(
          (p) =>
            p.kelas.toUpperCase() === kodeKelas.toUpperCase() ||
            sesi.kelas.includes(p.kelas)
        );
        const mahasiswaFinal =
          kelasMahasiswa.length > 0 ? kelasMahasiswa : daftarPraktikan;

        const presensiSesi = presensiList.filter((p) => p.sesiId === sesi.id);

        const daftar = mahasiswaFinal.map((m) => {
          const record = presensiSesi.find((pres) => pres.praktikanId === m.id);
          return {
            praktikan: m,
            hadir: !!record,
            waktuHadir: record?.waktuKehadiran,
          };
        });

        const totalHadir = presensiSesi.length;
        const totalKelas = mahasiswaFinal.length;
        const persentase =
          totalKelas > 0 ? Math.round((totalHadir / totalKelas) * 100) : 0;

        return {
          sesi,
          totalKelas,
          totalHadir,
          persentase,
          daftarMahasiswa: daftar,
        };
      });
  }, [sesiList, presensiList, daftarPraktikan]);

  const totalSesiDiproses = rekapData.length;
  const totalPresensiMasuk = useMemo(
    () => presensiList.length,
    [presensiList]
  );
  const rataRataKehadiran = useMemo(() => {
    if (rekapData.length === 0) return 0;
    const totalPersen = rekapData.reduce((acc, curr) => acc + curr.persentase, 0);
    return Math.round(totalPersen / rekapData.length);
  }, [rekapData]);

  const toggleExpand = (id: string) => {
    setExpandedSesiId((prev) => (prev === id ? null : id));
  };

  const renderRekapCard = ({ item }: { item: RekapSesiItem }) => {
    const isExpanded = expandedSesiId === item.sesi.id;

    return (
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeaderPressable}
          onPress={() => toggleExpand(item.sesi.id)}>
          <View style={styles.cardHeaderTop}>
            <View style={styles.titleWrap}>
              <Text style={styles.praktikumTitle}>{item.sesi.praktikum}</Text>
              <View style={styles.kelasChip}>
                <Text style={styles.kelasText}>{item.sesi.kelas}</Text>
              </View>
            </View>
            <StatusBadge status={item.sesi.status} size="small" />
          </View>

          {item.sesi.materi ? (
            <Text style={styles.materiText} numberOfLines={2}>
              {item.sesi.materi}
            </Text>
          ) : null}

          {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>Kehadiran:</Text>
              <Text style={styles.quickStatValue}>
                {item.totalHadir}/{item.totalKelas} Mahasiswa
              </Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>Persentase:</Text>
              <Text
                style={[
                  styles.quickStatValue,
                  { color: item.persentase >= 75 ? '#15803D' : '#D97706' },
                ]}>
                {item.persentase}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(item.persentase, 100)}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isExpanded ? 'Sembunyikan Roster Mahasiswa ▲' : 'Lihat Detail Roster Mahasiswa ▼'}
            </Text>
          </View>
        </Pressable>

        {/* Collapsible Student Roster List */}
        {isExpanded ? (
          <View style={styles.rosterContainer}>
            <View style={styles.rosterDivider} />
            <Text style={styles.rosterSectionTitle}>
              Roster Mahasiswa ({item.daftarMahasiswa.length})
            </Text>

            <View style={styles.studentList}>
              {item.daftarMahasiswa.map(({ praktikan, hadir, waktuHadir }) => (
                <View key={praktikan.id} style={styles.studentRow}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {praktikan.nama.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.studentMeta}>
                    <Text style={styles.studentName}>{praktikan.nama}</Text>
                    <Text style={styles.studentSub}>NIM: {praktikan.nim}</Text>
                  </View>

                  <View style={styles.statusCol}>
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
          </View>
        ) : null}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>REKAPITULASI KELAS</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Sinkron Real-Time</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Rekapitulasi Presensi</Text>
      <Text style={styles.headerSubtitle}>
        Pantau ringkasan kehadiran mahasiswa per sesi praktikum dan periksa roster kelas
      </Text>

      {/* Aggregate Stats Banner */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalSesiDiproses}</Text>
          <Text style={styles.metricLbl}>Sesi Berjalan</Text>
          <Text style={styles.metricDesc}>Dibuka & Ditutup</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPresensi]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalPresensiMasuk}</Text>
          <Text style={styles.metricLbl}>Presensi Masuk</Text>
          <Text style={styles.metricDesc}>Kehadiran Tercatat</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardActive]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{rataRataKehadiran}%</Text>
          <Text style={styles.metricLbl}>Rata-rata Hadir</Text>
          <Text style={styles.metricDesc}>Persentase Kehadiran</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rekapData}
        keyExtractor={(item) => item.sesi.id}
        renderItem={renderRekapCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Rekap Presensi"
            message="Rekap kehadiran akan muncul setelah Anda membuka sesi praktikum pada tab Jadwal."
            actionText="Buka Jadwal Praktikum"
            onAction={() => router.push('/asisten/jadwal')}
          />
        }
      />
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
    paddingHorizontal: 20,
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
  metricCardPresensi: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  metricCardActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
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
  },
  cardHeaderPressable: {
    gap: 8,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  praktikumTitle: {
    fontSize: 16,
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
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  toggleRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  rosterContainer: {
    marginTop: 8,
  },
  rosterDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  rosterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  studentList: {
    gap: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 10,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  studentSub: {
    fontSize: 11,
    color: '#64748B',
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  hadirBadge: {
    alignItems: 'flex-end',
  },
  hadirBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  hadirTimeText: {
    fontSize: 10,
    color: '#16A34A',
  },
  belumHadirBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  belumHadirBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
});
