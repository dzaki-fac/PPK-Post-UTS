import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { usePraktikum } from '@/context/praktikum-context';
import { Praktikan } from '@/types/praktikum';

type FilterKelas = 'semua' | 'A' | 'B';

export default function AsistenMahasiswaScreen() {
  const {
    daftarPraktikan,
    tambahPraktikan,
    editPraktikan,
    hapusPraktikan,
    presensiList,
  } = usePraktikum();

  const [filterKelas, setFilterKelas] = useState<FilterKelas>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tambah Praktikan
  const [modalTambahVisible, setModalTambahVisible] = useState(false);
  const [namaBaru, setNamaBaru] = useState('');
  const [nimBaru, setNimBaru] = useState('');
  const [kelasBaru, setKelasBaru] = useState<'A' | 'B'>('A');

  // Modal Edit Praktikan
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [selectedPraktikan, setSelectedPraktikan] = useState<Praktikan | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNim, setEditNim] = useState('');
  const [editKelas, setEditKelas] = useState<'A' | 'B'>('A');

  // Modal Hapus Praktikan
  const [modalHapusVisible, setModalHapusVisible] = useState(false);
  const [praktikanToDelete, setPraktikanToDelete] = useState<Praktikan | null>(null);

  // Modal Feedback / Notifikasi
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // Metrik ringkasan
  const totalMahasiswa = daftarPraktikan.length;
  const totalKelasA = daftarPraktikan.filter((p) => p.kelas === 'A').length;
  const totalKelasB = daftarPraktikan.filter((p) => p.kelas === 'B').length;
  const totalPresensiMasuk = presensiList.length;

  // Filter & Search List
  const filteredList = useMemo(() => {
    return daftarPraktikan.filter((p) => {
      const matchKelas = filterKelas === 'semua' || p.kelas === filterKelas;
      const matchSearch =
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nim.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [daftarPraktikan, filterKelas, searchQuery]);

  const getInitials = (name: string) => {
    return name
      .replace(/^Kak\s+/i, '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  };

  // Handler: Tambah Praktikan
  const handleOpenTambah = () => {
    setNamaBaru('');
    // Auto generate suggestion NIM format UNDIP
    const nextSeq = String(daftarPraktikan.length + 1).padStart(4, '0');
    setNimBaru(`2406012214${nextSeq}`);
    setKelasBaru('A');
    setModalTambahVisible(true);
  };

  const handleSimpanTambah = () => {
    if (!namaBaru.trim()) {
      alert('Nama mahasiswa wajib diisi.');
      return;
    }
    if (!nimBaru.trim()) {
      alert('NIM mahasiswa wajib diisi.');
      return;
    }

    tambahPraktikan({
      nama: namaBaru.trim(),
      nim: nimBaru.trim(),
      kelas: kelasBaru,
    });

    setModalTambahVisible(false);
    setFeedbackTitle('Praktikan Berhasil Ditambahkan');
    setFeedbackMessage(
      `Data praktikan ${namaBaru.trim()} (NIM: ${nimBaru.trim()}) untuk Kelas ${kelasBaru} telah tersimpan dan dapat langsung mengakses presensi.`
    );
    setFeedbackVisible(true);
  };

  // Handler: Edit Praktikan
  const handleOpenEdit = (item: Praktikan) => {
    setSelectedPraktikan(item);
    setEditNama(item.nama);
    setEditNim(item.nim);
    setEditKelas(item.kelas === 'B' ? 'B' : 'A');
    setModalEditVisible(true);
  };

  const handleSimpanEdit = () => {
    if (!selectedPraktikan) return;
    if (!editNama.trim() || !editNim.trim()) {
      alert('Nama dan NIM mahasiswa wajib diisi.');
      return;
    }

    editPraktikan(selectedPraktikan.id, {
      nama: editNama.trim(),
      nim: editNim.trim(),
      kelas: editKelas,
    });

    setModalEditVisible(false);
    setFeedbackTitle('Data Praktikan Diperbarui');
    setFeedbackMessage(
      `Pembaruan data mahasiswa ${editNama.trim()} (NIM: ${editNim.trim()}) telah berhasil disimpan.`
    );
    setFeedbackVisible(true);
  };

  // Handler: Hapus Praktikan
  const handleOpenHapus = (item: Praktikan) => {
    setPraktikanToDelete(item);
    setModalHapusVisible(true);
  };

  const handleConfirmHapus = () => {
    if (!praktikanToDelete) return;
    const deletedName = praktikanToDelete.nama;
    hapusPraktikan(praktikanToDelete.id);
    setModalHapusVisible(false);
    setPraktikanToDelete(null);

    setFeedbackTitle('Praktikan Telah Dihapus');
    setFeedbackMessage(
      `Mahasiswa ${deletedName} beserta seluruh catatan presensinya telah dihapus dari sistem.`
    );
    setFeedbackVisible(true);
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
          <Text style={styles.liveTagText}>Master Data Praktikan</Text>
        </View>
      </View>

      <View style={styles.titleActionRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>Data Praktikan</Text>
          <Text style={styles.headerSubtitle}>
            Kelola data induk praktikan, tambah mahasiswa baru, perbarui data kelas/NIM, atau hapus praktikan
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.tambahBtn, pressed && styles.btnPressed]}
          onPress={handleOpenTambah}
          accessibilityRole="button"
          accessibilityLabel="Tambah Praktikan Baru">
          <Text style={styles.tambahBtnText}>+ Tambah Praktikan</Text>
        </Pressable>
      </View>

      {/* Metrics Overview Cards (Matching E-Stock style) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalMahasiswa}</Text>
          <Text style={styles.metricLbl}>Total Praktikan</Text>
          <Text style={styles.metricDesc}>Terdaftar Sistem</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardTeal]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalKelasA}</Text>
          <Text style={styles.metricLbl}>Kelas A</Text>
          <Text style={styles.metricDesc}>Praktikan Aktif</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardOrange]}>
          <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalKelasB}</Text>
          <Text style={styles.metricLbl}>Kelas B</Text>
          <Text style={styles.metricDesc}>Praktikan Aktif</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{totalPresensiMasuk}</Text>
          <Text style={styles.metricLbl}>Presensi Masuk</Text>
          <Text style={styles.metricDesc}>Seluruh Sesi</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari berdasarkan nama mahasiswa atau NIM..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
            <Text style={styles.searchClearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter Berdasarkan Kelas:</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Semua"
            count={totalMahasiswa}
            active={filterKelas === 'semua'}
            onPress={() => setFilterKelas('semua')}
          />
          <FilterChip
            label="Kelas A"
            count={totalKelasA}
            active={filterKelas === 'A'}
            onPress={() => setFilterKelas('A')}
          />
          <FilterChip
            label="Kelas B"
            count={totalKelasB}
            active={filterKelas === 'B'}
            onPress={() => setFilterKelas('B')}
          />
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Praktikan }) => {
    const initials = getInitials(item.nama);
    const kehadiranCount = presensiList.filter((p) => p.praktikanId === item.id).length;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardContent}>
          {/* Avatar & Info */}
          <View style={styles.studentMainRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.studentInfo}>
              <View style={styles.nameClassRow}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {item.nama}
                </Text>
                <View
                  style={[
                    styles.classChip,
                    item.kelas === 'A' ? styles.classChipA : styles.classChipB,
                  ]}>
                  <Text
                    style={[
                      styles.classChipText,
                      item.kelas === 'A' ? styles.classChipTextA : styles.classChipTextB,
                    ]}>
                    Kelas {item.kelas}
                  </Text>
                </View>
              </View>

              <Text style={styles.studentNim}>NIM: {item.nim}</Text>

              {/* Attendance count badge */}
              <View style={styles.metaRow}>
                <View style={styles.kehadiranBadge}>
                  <View style={styles.miniDotGreen} />
                  <Text style={styles.kehadiranBadgeText}>
                    {kehadiranCount > 0 ? `${kehadiranCount} Sesi Hadir` : 'Belum Ada Presensi'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons: Edit & Hapus */}
          <View style={styles.cardActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtnEdit, pressed && styles.btnPressed]}
              onPress={() => handleOpenEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit mahasiswa ${item.nama}`}>
              <Text style={styles.actionBtnEditText}>Edit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtnDelete, pressed && styles.btnPressed]}
              onPress={() => handleOpenHapus(item)}
              accessibilityRole="button"
              accessibilityLabel={`Hapus mahasiswa ${item.nama}`}>
              <Text style={styles.actionBtnDeleteText}>Hapus</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Tidak Ada Praktikan"
            message={
              searchQuery
                ? `Tidak ditemukan praktikan dengan kata kunci "${searchQuery}".`
                : `Belum ada praktikan terdaftar untuk Kelas ${filterKelas}.`
            }
            actionText={searchQuery ? 'Reset Pencarian' : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        }
      />

      {/* Modal Tambah Praktikan */}
      <Modal
        visible={modalTambahVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTambahVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Tambah Praktikan Baru</Text>
                <Text style={styles.modalSubtitle}>
                  Tambahkan mahasiswa ke daftar induk praktikan laboratorium
                </Text>
              </View>
              <Pressable
                onPress={() => setModalTambahVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Lengkap Mahasiswa *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Mis. Dewi Anggraini"
                  placeholderTextColor="#94A3B8"
                  value={namaBaru}
                  onChangeText={setNamaBaru}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>NIM Mahasiswa (14 Digit) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Mis. 24060122140011"
                  placeholderTextColor="#94A3B8"
                  value={nimBaru}
                  onChangeText={setNimBaru}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Pilihan Kelas Praktikum *</Text>
                <View style={styles.kelasToggleRow}>
                  <Pressable
                    style={[
                      styles.kelasToggleBtn,
                      kelasBaru === 'A' && styles.kelasToggleBtnActive,
                    ]}
                    onPress={() => setKelasBaru('A')}>
                    <Text
                      style={[
                        styles.kelasToggleText,
                        kelasBaru === 'A' && styles.kelasToggleTextActive,
                      ]}>
                      Kelas A
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.kelasToggleBtn,
                      kelasBaru === 'B' && styles.kelasToggleBtnActive,
                    ]}
                    onPress={() => setKelasBaru('B')}>
                    <Text
                      style={[
                        styles.kelasToggleText,
                        kelasBaru === 'B' && styles.kelasToggleTextActive,
                      ]}>
                      Kelas B
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalTambahVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={handleSimpanTambah}>
                <Text style={styles.submitBtnText}>Simpan Praktikan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Praktikan */}
      <Modal
        visible={modalEditVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Data Praktikan</Text>
                <Text style={styles.modalSubtitle}>
                  Perbarui nama, NIM, atau kelas mahasiswa
                </Text>
              </View>
              <Pressable
                onPress={() => setModalEditVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Lengkap Mahasiswa *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editNama}
                  onChangeText={setEditNama}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>NIM Mahasiswa *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editNim}
                  onChangeText={setEditNim}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Pilihan Kelas Praktikum *</Text>
                <View style={styles.kelasToggleRow}>
                  <Pressable
                    style={[
                      styles.kelasToggleBtn,
                      editKelas === 'A' && styles.kelasToggleBtnActive,
                    ]}
                    onPress={() => setEditKelas('A')}>
                    <Text
                      style={[
                        styles.kelasToggleText,
                        editKelas === 'A' && styles.kelasToggleTextActive,
                      ]}>
                      Kelas A
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.kelasToggleBtn,
                      editKelas === 'B' && styles.kelasToggleBtnActive,
                    ]}
                    onPress={() => setEditKelas('B')}>
                    <Text
                      style={[
                        styles.kelasToggleText,
                        editKelas === 'B' && styles.kelasToggleTextActive,
                      ]}>
                      Kelas B
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalEditVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={handleSimpanEdit}>
                <Text style={styles.submitBtnText}>Perbarui Data</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal Hapus Praktikan */}
      <ConfirmationModal
        visible={modalHapusVisible}
        title="Hapus Data Praktikan?"
        description={
          praktikanToDelete
            ? `Apakah Anda yakin ingin menghapus mahasiswa ${praktikanToDelete.nama} (NIM: ${praktikanToDelete.nim})? Seluruh riwayat presensinya juga akan dihapus dari sistem.`
            : ''
        }
        confirmText="Ya, Hapus Praktikan"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={handleConfirmHapus}
        onCancel={() => setModalHapusVisible(false)}
      />

      {/* Feedback Alert Modal */}
      <ConfirmationModal
        visible={feedbackVisible}
        title={feedbackTitle}
        description={feedbackMessage}
        confirmText="Mengerti"
        confirmVariant="primary"
        onConfirm={() => setFeedbackVisible(false)}
        onCancel={() => setFeedbackVisible(false)}
      />
    </View>
  );
}

interface FilterChipProps {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, count, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.btnPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button">
      <Text
        style={[
          styles.chipText,
          active ? styles.chipTextActive : styles.chipTextInactive,
        ]}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text
            style={[
              styles.countText,
              active && styles.countTextActive,
            ]}>
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
    paddingTop: 16,
    paddingBottom: 90,
  },
  header: {
    marginBottom: 16,
    gap: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  eyebrowBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.8,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  titleActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 260,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 19,
  },
  tambahBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tambahBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardTeal: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  metricCardOrange: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  metricDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  searchClearBtn: {
    padding: 6,
  },
  searchClearText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  filterSection: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 12,
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
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    padding: 14,
  },
  studentCardContent: {
    gap: 12,
  },
  studentMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0D9488',
  },
  studentInfo: {
    flex: 1,
    gap: 3,
  },
  nameClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  classChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classChipA: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  classChipB: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  classChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  classChipTextA: {
    color: '#0D9488',
  },
  classChipTextB: {
    color: '#EA580C',
  },
  studentNim: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  kehadiranBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  kehadiranBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtnEdit: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  actionBtnDelete: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionBtnDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 460,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  modalForm: {
    gap: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  kelasToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kelasToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  kelasToggleBtnActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  kelasToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  kelasToggleTextActive: {
    color: '#0D9488',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0D9488',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
