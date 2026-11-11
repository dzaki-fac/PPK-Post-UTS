import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
        // Cari mahasiswa yang sesuai kelas sesi ini
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

  // Statistik agregat untuk banner atas
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
                <Text style={styles.kelasChipText}>{item.sesi.kelas}</Text>
              </View>
            </View>
            <StatusBadge status={item.sesi.status} />
          </View>

          <Text style={styles.jadwalMeta}>
            📅 {item.sesi.tanggal} • {item.sesi.waktuMulai} - {item.sesi.waktuSelesai} WIB
          </Text>

          {/* Progress / Stat Summary */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfoRow}>
              <Text style={styles.progressLabel}>Tingkat Kehadiran:</Text>
              <Text style={styles.progressValue}>
                {item.totalHadir} dari {item.totalKelas} Mahasiswa ({item.persentase}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
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
              {isExpanded ? 'Sembunyikan Daftar Mahasiswa ▲' : 'Lihat Detail Mahasiswa ▼'}
            </Text>
          </View>
        </Pressable>

        {/* Collapsible Student Roster List */}
        {isExpanded ? (
          <View style={styles.rosterContainer}>
            <View style={styles.rosterDivider} />
            <Text style={styles.rosterSectionTitle}>
              Daftar Mahasiswa ({item.daftarMahasiswa.length})
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
                        <Text style={styles.hadirBadgeText}>✓ Hadir</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rekapitulasi Kehadiran</Text>
          <Text style={styles.headerSubtitle}>
            Pantau ringkasan dan detail kehadiran mahasiswa per sesi praktikum
          </Text>

          {/* Aggregate Stats Banner */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalSesiDiproses}</Text>
              <Text style={styles.statLabel}>Sesi Berlangsung</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalPresensiMasuk}</Text>
              <Text style={styles.statLabel}>Total Presensi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#16A34A' }]}>
                {rataRataKehadiran}%
              </Text>
              <Text style={styles.statLabel}>Rata-rata Hadir</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={rekapData}
          keyExtractor={(item) => item.sesi.id}
          renderItem={renderRekapCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="Belum Ada Rekap Presensi"
              message="Rekap kehadiran akan muncul setelah Anda membuka sesi praktikum pada tab Jadwal."
              actionText="Buka Jadwal Praktikum"
              onAction={() => router.push('/asisten/jadwal')}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  listContainer: {
    paddingVertical: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderPressable: {
    gap: 8,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  praktikumTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  jadwalMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  progressSection: {
    marginTop: 6,
    gap: 6,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 3,
  },
  toggleRow: {
    marginTop: 4,
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  rosterContainer: {
    marginTop: 10,
  },
  rosterDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
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
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  statusCol: {
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
});
