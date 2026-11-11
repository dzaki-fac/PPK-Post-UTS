import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SesiCard } from '@/components/sesi-card';
import { usePraktikum } from '@/context/praktikum-context';
import { Sesi, SesiStatus } from '@/types/praktikum';

type FilterType = 'semua' | SesiStatus;

export default function JadwalAsistenScreen() {
  const { sesiList, presensiList, tambahSesi } = usePraktikum();
  const [filter, setFilter] = useState<FilterType>('semua');

  // Add Session Modal State
  const [modalTambahVisible, setModalTambahVisible] = useState(false);
  const [newPraktikum, setNewPraktikum] = useState('Praktikum PPK');
  const [newMateri, setNewMateri] = useState('');
  const [newKelas, setNewKelas] = useState<'Kelas A' | 'Kelas B'>('Kelas A');
  const [newTanggal, setNewTanggal] = useState('05 Nov 2026');
  const [newWaktuMulai, setNewWaktuMulai] = useState('07.30');
  const [newWaktuSelesai, setNewWaktuSelesai] = useState('09.30');
  const [newRuang, setNewRuang] = useState('Lab Komputasi 1');

  const filteredSesiList = useMemo(() => {
    if (filter === 'semua') return sesiList;
    return sesiList.filter((s) => s.status === filter);
  }, [sesiList, filter]);

  const totalSesi = sesiList.length;
  const totalDibuka = sesiList.filter((s) => s.status === 'dibuka').length;
  const totalPresensiMasuk = presensiList.length;
  const totalDitutup = sesiList.filter((s) => s.status === 'ditutup').length;

  const handleCardPress = (sesi: Sesi) => {
    router.push({
      pathname: '/asisten/detail-sesi/[id]',
      params: { id: sesi.id },
    });
  };

  const handleSimpanSesiBaru = () => {
    if (!newMateri.trim()) {
      alert('Materi praktikum harus diisi.');
      return;
    }
    tambahSesi({
      praktikum: newPraktikum.trim() || 'Praktikum PPK',
      kelas: newKelas,
      tanggal: newTanggal.trim() || '05 Nov 2026',
      waktuMulai: newWaktuMulai.trim() || '07.30',
      waktuSelesai: newWaktuSelesai.trim() || '09.30',
      ruang: newRuang.trim() || 'Lab Komputasi 1',
      materi: newMateri.trim(),
      status: 'belum-dibuka',
    });
    setNewMateri('');
    setModalTambahVisible(false);
  };

  const renderItem = ({ item }: { item: Sesi }) => {
    const totalHadir = presensiList.filter((p) => p.sesiId === item.id).length;

    return (
      <SesiCard
        sesi={item}
        role="asisten"
        totalHadir={totalHadir}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Eyebrow & Live Indicator */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>ASISTEN LABORATORIUM</Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Kontrol Real-Time</Text>
        </View>
      </View>

      <View style={styles.titleActionRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>Pengelolaan Sesi Praktikum</Text>
          <Text style={styles.headerSubtitle}>
            Buka sesi praktikum, pantau presensi kehadiran mahasiswa, atau tutup sesi setelah kegiatan selesai
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.tambahBtn, pressed && styles.chipPressed]}
          onPress={() => setModalTambahVisible(true)}>
          <Text style={styles.tambahBtnText}>+ Tambah Sesi</Text>
        </Pressable>
      </View>

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

        <View style={[styles.metricCard, styles.metricCardPresensi]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalPresensiMasuk}</Text>
          <Text style={styles.metricLbl}>Total Presensi</Text>
          <Text style={styles.metricDesc}>Mahasiswa Hadir</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalDitutup}</Text>
          <Text style={styles.metricLbl}>Sesi Ditutup</Text>
          <Text style={styles.metricDesc}>Selesai Dikelola</Text>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Berdasarkan Status Sesi:</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Semua"
            active={filter === 'semua'}
            count={sesiList.length}
            onPress={() => setFilter('semua')}
          />
          <FilterChip
            label="Dibuka"
            active={filter === 'dibuka'}
            count={sesiList.filter((s) => s.status === 'dibuka').length}
            variant="dibuka"
            onPress={() => setFilter('dibuka')}
          />
          <FilterChip
            label="Belum Dibuka"
            active={filter === 'belum-dibuka'}
            count={sesiList.filter((s) => s.status === 'belum-dibuka').length}
            variant="belum-dibuka"
            onPress={() => setFilter('belum-dibuka')}
          />
          <FilterChip
            label="Ditutup"
            active={filter === 'ditutup'}
            count={sesiList.filter((s) => s.status === 'ditutup').length}
            variant="ditutup"
            onPress={() => setFilter('ditutup')}
          />
        </View>
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
          <EmptyState
            title="Tidak Ada Sesi"
            message={
              filter === 'semua'
                ? 'Belum ada jadwal praktikum yang tersedia saat ini.'
                : `Tidak ada sesi praktikum dengan status "${filter}".`
            }
            actionText={filter !== 'semua' ? 'Tampilkan Semua Sesi' : undefined}
            onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
          />
        }
      />

      {/* Modal Tambah Sesi Praktikum Baru */}
      <Modal
        visible={modalTambahVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTambahVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setModalTambahVisible(false)}
          />
          <View style={styles.modalPopupCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Tambah Sesi Praktikum</Text>
                <Text style={styles.modalSubtitle}>
                  Jadwalkan sesi praktikum baru untuk mahasiswa
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtnCircle, pressed && styles.chipPressed]}
                onPress={() => setModalTambahVisible(false)}>
                <Text style={styles.closeBtnCircleText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mata Praktikum</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPraktikum}
                  onChangeText={setNewPraktikum}
                  placeholder="Praktikum PPK"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Materi Praktikum *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newMateri}
                  onChangeText={setNewMateri}
                  placeholder="Mis. Modul 4: Integrasi Form & Modal"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kelas Praktikum</Text>
                <View style={styles.kelasOptionRow}>
                  <Pressable
                    style={[
                      styles.kelasOptionBtn,
                      newKelas === 'Kelas A' && styles.kelasOptionBtnActive,
                    ]}
                    onPress={() => setNewKelas('Kelas A')}>
                    <Text
                      style={[
                        styles.kelasOptionText,
                        newKelas === 'Kelas A' && styles.kelasOptionTextActive,
                      ]}>
                      Kelas A
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.kelasOptionBtn,
                      newKelas === 'Kelas B' && styles.kelasOptionBtnActive,
                    ]}
                    onPress={() => setNewKelas('Kelas B')}>
                    <Text
                      style={[
                        styles.kelasOptionText,
                        newKelas === 'Kelas B' && styles.kelasOptionTextActive,
                      ]}>
                      Kelas B
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tanggal Pelaksanaan</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTanggal}
                  onChangeText={setNewTanggal}
                  placeholder="05 Nov 2026"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Jam Mulai</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newWaktuMulai}
                    onChangeText={setNewWaktuMulai}
                    placeholder="07.30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Jam Selesai</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newWaktuSelesai}
                    onChangeText={setNewWaktuSelesai}
                    placeholder="09.30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ruang Laboratorium</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRuang}
                  onChangeText={setNewRuang}
                  placeholder="Lab Komputasi 1"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => setModalTambahVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.chipPressed,
                ]}
                onPress={handleSimpanSesiBaru}>
                <Text style={styles.saveBtnText}>Simpan & Buat Sesi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({
  label,
  active,
  count,
  variant,
  onPress,
}: {
  label: string;
  active: boolean;
  count?: number;
  variant?: SesiStatus;
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

  const getDotColor = () => {
    switch (variant) {
      case 'dibuka':
        return '#16A34A';
      case 'belum-dibuka':
        return '#EAB308';
      case 'ditutup':
        return '#DC2626';
      default:
        return undefined;
    }
  };

  const dotColor = getDotColor();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        getBadgeStyle(),
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}>
      {dotColor ? (
        <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
      ) : null}
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
  metricCardDibuka: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  metricCardPresensi: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
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
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
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
  titleActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flex: 1,
    minWidth: 260,
    gap: 4,
  },
  tambahBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  tambahBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* Add Session Modal Styles */
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
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
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
  modalBody: {
    maxHeight: 400,
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
  kelasOptionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kelasOptionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  kelasOptionBtnActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  kelasOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  kelasOptionTextActive: {
    color: '#0F766E',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalFooter: {
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
