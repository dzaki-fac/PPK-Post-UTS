import { router, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePraktikum } from '@/context/praktikum-context';
import { DUMMY_PRAKTIKAN, DUMMY_ASISTEN } from '@/data/dummy';
import { Peran } from '@/data/types';
import { Asisten, Praktikan } from '@/types/praktikum';

export default function IndexScreen() {
  const { setPengguna } = usePraktikum();
  const [langkah, setLangkah] = useState<'pilih-peran' | 'pilih-identitas'>('pilih-peran');
  const [peranDipilih, setPeranDipilih] = useState<Peran>(null);
  const [filterKelas, setFilterKelas] = useState<'semua' | 'A' | 'B'>('semua');

  const handlePilihPeran = (peran: Peran) => {
    if (!peran) return;
    setPeranDipilih(peran);
    setLangkah('pilih-identitas');
  };

  const handlePilihIdentitas = (identitas: Praktikan | Asisten) => {
    if (peranDipilih === 'praktikan') {
      setPengguna({ peran: 'praktikan', data: identitas as Praktikan });
      router.replace('/praktikan/jadwal' as Href);
    } else if (peranDipilih === 'asisten') {
      setPengguna({ peran: 'asisten', data: identitas as Asisten });
      router.replace('/asisten/jadwal' as Href);
    }
  };

  const handleKembali = () => {
    setLangkah('pilih-peran');
    setPeranDipilih(null);
  };

  const getInitials = (name: string) => {
    return name
      .replace(/^Kak\s+/i, '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  };

  if (langkah === 'pilih-identitas' && peranDipilih) {
    const isPraktikan = peranDipilih === 'praktikan';
    const praktikanList = filterKelas === 'semua'
      ? DUMMY_PRAKTIKAN
      : DUMMY_PRAKTIKAN.filter((p) => p.kelas === filterKelas);

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Identity Navigation Bar - Identical to Halaman 1 */}
          <View style={styles.topNavbar}>
            <View style={styles.navInner}>
              <View style={styles.brandRow}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoBadgeText}>PPK</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>PPK LabPortal</Text>
                  <Text style={styles.brandSubtitle}>Presensi & Manajemen Sesi</Text>
                </View>
              </View>

              <View style={styles.rightNavRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>
                    {isPraktikan ? 'Mode Mahasiswa' : 'Mode Asisten'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.identityScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Breadcrumb Back Button - Identical to Gambar 2 */}
            <Pressable
              onPress={handleKembali}
              style={({ pressed }) => [styles.backBreadcrumb, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Pemilihan Peran">
              <Text style={styles.backBreadcrumbText}>← Kembali ke Pemilihan Peran</Text>
            </Pressable>

            <View style={styles.identityHeader}>
              <View
                style={[
                  styles.rolePill,
                  isPraktikan ? styles.rolePillPraktikan : styles.rolePillAsisten,
                ]}>
                <Text
                  style={[
                    styles.rolePillText,
                    isPraktikan ? styles.textPraktikan : styles.textAsisten,
                  ]}>
                  {isPraktikan ? 'PORTAL MAHASISWA' : 'PORTAL ASISTEN LAB'}
                </Text>
              </View>
              <Text style={styles.identityTitle}>
                {isPraktikan ? 'Pilih Identitas Praktikan' : 'Pilih Identitas Asisten'}
              </Text>
              <Text style={styles.identitySubtitle}>
                {isPraktikan
                  ? 'Pilih salah satu profil mahasiswa berikut untuk masuk ke dashboard praktikan dan mencatat presensi:'
                  : 'Pilih profil asisten pengampu berikut untuk membuka sesi dan mengelola rekapitulasi kehadiran:'}
              </Text>

              {/* Class Filter Chips (only for praktikan) */}
              {isPraktikan ? (
                <View style={styles.filterChipsRow}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      filterKelas === 'semua' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterKelas('semua')}>
                    <Text
                      style={[
                        styles.filterChipText,
                        filterKelas === 'semua' && styles.filterChipTextActive,
                      ]}>
                      Semua (10)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.filterChip,
                      filterKelas === 'A' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterKelas('A')}>
                    <Text
                      style={[
                        styles.filterChipText,
                        filterKelas === 'A' && styles.filterChipTextActive,
                      ]}>
                      Kelas A (6)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.filterChip,
                      filterKelas === 'B' && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterKelas('B')}>
                    <Text
                      style={[
                        styles.filterChipText,
                        filterKelas === 'B' && styles.filterChipTextActive,
                      ]}>
                      Kelas B (4)
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Grid of Profile Cards */}
            <View style={styles.identityGrid}>
              {isPraktikan
                ? praktikanList.map((praktikan) => {
                    const initials = getInitials(praktikan.nama);
                    return (
                      <Pressable
                        key={praktikan.id}
                        style={({ pressed }) => [
                          styles.studentGridCard,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => handlePilihIdentitas(praktikan)}
                        accessibilityRole="button"
                        accessibilityLabel={`Masuk sebagai ${praktikan.nama}`}>
                        <View style={styles.cardTopRow}>
                          <View style={styles.avatarCirclePraktikan}>
                            <Text style={styles.avatarTextPraktikan}>{initials}</Text>
                          </View>
                          <View style={styles.cardHeaderInfo}>
                            <Text style={styles.studentCardName}>{praktikan.nama}</Text>
                            <Text style={styles.studentCardNim}>NIM: {praktikan.nim}</Text>
                          </View>
                          <View style={styles.kelasBadge}>
                            <Text style={styles.kelasBadgeText}>Kelas {praktikan.kelas}</Text>
                          </View>
                        </View>

                        <View style={styles.cardBottomRow}>
                          <View style={styles.activeTag}>
                            <View style={styles.greenDot} />
                            <Text style={styles.activeTagText}>Praktikan Aktif</Text>
                          </View>
                          <View style={styles.ctaEnterPill}>
                            <Text style={styles.ctaEnterPillText}>Masuk Portal →</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                : DUMMY_ASISTEN.map((asisten) => {
                    const initials = getInitials(asisten.nama);
                    return (
                      <Pressable
                        key={asisten.id}
                        style={({ pressed }) => [
                          styles.studentGridCard,
                          styles.studentGridCardAsisten,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => handlePilihIdentitas(asisten)}
                        accessibilityRole="button"
                        accessibilityLabel={`Masuk sebagai ${asisten.nama}`}>
                        <View style={styles.cardTopRow}>
                          <View style={styles.avatarCircleAsisten}>
                            <Text style={styles.avatarTextAsisten}>{initials}</Text>
                          </View>
                          <View style={styles.cardHeaderInfo}>
                            <Text style={styles.studentCardNameAsisten}>{asisten.nama}</Text>
                            <Text style={styles.studentCardNim}>Pengampu Laboratorium Komputasi</Text>
                          </View>
                          <View style={[styles.kelasBadge, { backgroundColor: '#CCFBF1' }]}>
                            <Text style={[styles.kelasBadgeText, { color: '#0F766E' }]}>Asisten</Text>
                          </View>
                        </View>

                        <View style={styles.cardBottomRow}>
                          <View style={styles.activeTag}>
                            <View style={[styles.greenDot, { backgroundColor: '#0D9488' }]} />
                            <Text style={[styles.activeTagText, { color: '#0F766E' }]}>Pengelola Lab</Text>
                          </View>
                          <View style={[styles.ctaEnterPill, { backgroundColor: '#0D9488' }]}>
                            <Text style={styles.ctaEnterPillText}>Kelola Praktikum →</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Navbar Header */}
        <View style={styles.topNavbar}>
          <View style={styles.navInner}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>PPK</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>PPK LabPortal</Text>
                <Text style={styles.brandSubtitle}>Presensi & Manajemen Sesi</Text>
              </View>
            </View>

            <View style={styles.systemStatusPill}>
              <View style={styles.liveDot} />
              <Text style={styles.systemStatusText}>Sistem Presensi Aktif</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.liveIndicatorPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>
                Live · Alur Praktikum Asisten & Praktikan Terintegrasi
              </Text>
            </View>

            <Text style={styles.heroHeadline}>
              Presensi Praktikum Pengembangan Platform Khusus.
            </Text>

            <Text style={styles.heroSubtitle}>
              Laboratorium Komputasi · Departemen Informatika, Fakultas Sains dan Matematika,
              Universitas Diponegoro. Platform terpadu pembukaan sesi, presensi mandiri,
              dan rekapitulasi kehadiran kelas secara real-time.
            </Text>
          </View>

          {/* Metric Overview (4 Stat Cards inspired by E-Stock reference) */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>5</Text>
              <Text style={styles.metricLabel}>Total Sesi</Text>
              <Text style={styles.metricDesc}>Modul PPK & BDD</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: '#0D9488' }]}>10</Text>
              <Text style={styles.metricLabel}>Praktikan</Text>
              <Text style={styles.metricDesc}>Kelas A & Kelas B</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: '#EA580C' }]}>2</Text>
              <Text style={styles.metricLabel}>Asisten Lab</Text>
              <Text style={styles.metricDesc}>Pengampu Komputasi</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: '#16A34A' }]}>100%</Text>
              <Text style={styles.metricLabel}>Anti-Duplikasi</Text>
              <Text style={styles.metricDesc}>Integritas Presensi</Text>
            </View>
          </View>

          {/* Role Selection Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pilih Akses Pengguna</Text>
            <Text style={styles.sectionSubtitle}>
              Pilih peran Anda untuk mendemonstrasikan kegiatan praktikum dari dua sudut pandang
            </Text>
          </View>

          <View style={styles.rolesContainer}>
            {/* Mahasiswa Card */}
            <View style={styles.roleCard}>
              <View style={styles.roleCardHeader}>
                <View style={styles.roleIconWrapPraktikan}>
                  <Text style={styles.roleTagMarkPraktikan}>MHS</Text>
                </View>
                <View style={styles.roleBadgePraktikan}>
                  <Text style={styles.roleBadgeTextPraktikan}>PORTAL MAHASISWA</Text>
                </View>
              </View>

              <Text style={styles.roleCardTitle}>Masuk sebagai Praktikan</Text>
              <Text style={styles.roleCardDescription}>
                Lihat jadwal sesi praktikum yang dibuka, isi formulir presensi mandiri dengan
                catatan, dan pantau catatan kehadiran Anda.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Jadwal dan rincian modul praktikum</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Form presensi mandiri saat sesi dibuka</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Validasi anti-duplikasi presensi</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>Riwayat kehadiran dan persentase aktif</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.ctaButtonPraktikan,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => handlePilihPeran('praktikan')}
                accessibilityRole="button"
                accessibilityLabel="Pilih Akun Praktikan">
                <Text style={styles.ctaButtonTextPraktikan}>Pilih Akun Praktikan →</Text>
              </Pressable>
            </View>

            {/* Asisten Card */}
            <View style={[styles.roleCard, styles.roleCardAsisten]}>
              <View style={styles.roleCardHeader}>
                <View style={styles.roleIconWrapAsisten}>
                  <Text style={styles.roleTagMarkAsisten}>AST</Text>
                </View>
                <View style={styles.roleBadgeAsisten}>
                  <Text style={styles.roleBadgeTextAsisten}>ASISTEN LABORATORIUM</Text>
                </View>
              </View>

              <Text style={[styles.roleCardTitle, styles.titleAsisten]}>
                Masuk sebagai Asisten Lab
              </Text>
              <Text style={styles.roleCardDescription}>
                Buka dan tutup sesi praktikum dengan dialog modal, pantau kehadiran kelas
                secara langsung, dan akses rekapitulasi lengkap.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.featureText}>Buka dan tutup sesi praktikum</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.featureText}>Dialog konfirmasi modal interaktif</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.featureText}>Roster kelas (Daftar Hadir & Belum Hadir)</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.featureText}>Rekapitulasi per sesi dengan statistik</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.ctaButtonAsisten,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => handlePilihPeran('asisten')}
                accessibilityRole="button"
                accessibilityLabel="Pilih Akun Asisten">
                <Text style={styles.ctaButtonTextAsisten}>Pilih Akun Asisten →</Text>
              </Pressable>
            </View>
          </View>

          {/* Workflow Showcase */}
          <View style={styles.workflowSection}>
            <Text style={styles.workflowTitle}>Alur Kegiatan Praktikum (Sprint 1)</Text>
            <View style={styles.workflowGrid}>
              <View style={styles.workflowCard}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.workflowStepTitle}>Asisten Membuka Sesi</Text>
                <Text style={styles.workflowStepDesc}>
                  Asisten meninjau jadwal praktikum dan mengonfirmasi pembukaan sesi sebelum kelas dimulai.
                </Text>
              </View>

              <View style={styles.workflowCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#EA580C' }]}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={styles.workflowStepTitle}>Praktikan Presensi</Text>
                <Text style={styles.workflowStepDesc}>
                  Praktikan mengisi catatan kehadiran mandiri; waktu presensi tercatat otomatis dengan proteksi duplikasi.
                </Text>
              </View>

              <View style={styles.workflowCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#0D9488' }]}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <Text style={styles.workflowStepTitle}>Rekap & Penutupan</Text>
                <Text style={styles.workflowStepDesc}>
                  Asisten memantau daftar hadir kelas, melihat rekapitulasi, dan menutup sesi praktikum secara resmi.
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Praktikum Pengembangan Platform Khusus (PPK) · Departemen Informatika, Universitas Diponegoro
            </Text>
            <Text style={styles.footerSubText}>
              Sistem Presensi Praktikum Laboratorium · Fakultas Sains dan Matematika UNDIP
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  topNavbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navInner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  systemStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  mainScrollContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 32,
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  heroHeadline: {
    fontSize: Platform.OS === 'web' ? 44 : 32,
    lineHeight: Platform.OS === 'web' ? 52 : 38,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -1,
    maxWidth: 780,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 700,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  metricDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 600,
  },
  rolesContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    gap: 14,
    shadowColor: '#EA580C',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  roleCardAsisten: {
    borderColor: '#99F6E4',
    shadowColor: '#0D9488',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleIconWrapPraktikan: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  roleIconWrapAsisten: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  roleTagMarkPraktikan: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  roleTagMarkAsisten: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  roleBadgePraktikan: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  roleBadgeTextPraktikan: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  roleBadgeAsisten: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  roleBadgeTextAsisten: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  roleCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: -0.4,
  },
  titleAsisten: {
    color: '#115E59',
  },
  roleCardDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  featureList: {
    gap: 8,
    paddingVertical: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  featureText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  ctaButtonPraktikan: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaButtonTextPraktikan: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaButtonAsisten: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaButtonTextAsisten: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  workflowSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 20,
  },
  workflowTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  workflowGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  workflowCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  workflowStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  workflowStepDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 16,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Identity Selection View Styles */
  rightNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    marginBottom: 16,
  },
  backBreadcrumbText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  identityScrollContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 24,
  },
  identityHeader: {
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  rolePillPraktikan: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  rolePillAsisten: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textPraktikan: {
    color: '#EA580C',
  },
  textAsisten: {
    color: '#0D9488',
  },
  identityTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  identitySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 620,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  identityGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 14,
  },
  studentGridCard: {
    width: Platform.OS === 'web' ? '48.9%' : '100%',
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  studentGridCardAsisten: {
    borderColor: '#99F6E4',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCirclePraktikan: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextPraktikan: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA580C',
  },
  avatarCircleAsisten: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextAsisten: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  studentCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentCardNameAsisten: {
    fontSize: 15,
    fontWeight: '700',
    color: '#115E59',
  },
  studentCardNim: {
    fontSize: 12,
    color: '#64748B',
  },
  kelasBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kelasBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  ctaEnterPill: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaEnterPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
