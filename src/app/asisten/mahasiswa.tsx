import React, { useEffect, useMemo, useState } from 'react';
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
import {
  createPraktikanUser,
  deletePraktikanUser,
  subscribePraktikanUsers,
  updatePraktikanUser,
} from '@/services/attendance-service';
import { Asisten, Praktikan, UserDocument } from '@/types/praktikum';

type UserTab = 'praktikan' | 'asisten';
type FilterKelas = 'semua' | 'A' | 'B';

export default function AsistenMahasiswaScreen() {
  const {
    daftarPraktikan,
    tambahPraktikan,
    editPraktikan,
    hapusPraktikan,
    daftarAsisten,
    tambahAsisten,
    editAsisten,
    hapusAsisten,
    presensiList,
    sesiList,
  } = usePraktikum();

  const [activeTab, setActiveTab] = useState<UserTab>('praktikan');
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

  // Modal Tambah Asisten
  const [modalTambahAsistenVisible, setModalTambahAsistenVisible] = useState(false);
  const [namaAsistenBaru, setNamaAsistenBaru] = useState('');
  const [peranLabBaru, setPeranLabBaru] = useState('');

  // Modal Edit Asisten
  const [modalEditAsistenVisible, setModalEditAsistenVisible] = useState(false);
  const [selectedAsisten, setSelectedAsisten] = useState<Asisten | null>(null);
  const [editNamaAsisten, setEditNamaAsisten] = useState('');
  const [editPeranLab, setEditPeranLab] = useState('');

  // Modal Hapus Asisten
  const [modalHapusAsistenVisible, setModalHapusAsistenVisible] = useState(false);
  const [asistenToDelete, setAsistenToDelete] = useState<Asisten | null>(null);

  // Modal Feedback / Notifikasi
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // Subscribe ke data mahasiswa di Cloud Firestore /users
  const [firestoreStudents, setFirestoreStudents] = useState<UserDocument[]>([]);

  useEffect(() => {
    const unsub = subscribePraktikanUsers((items) => {
      setFirestoreStudents(items);
    });
    return () => unsub();
  }, []);

  // Gabungkan data praktikan dari Firestore dan lokal
  const allPraktikan = useMemo(() => {
    const map = new Map<string, Praktikan>();
    daftarPraktikan.forEach((p) => map.set(p.nim, p));
    firestoreStudents.forEach((fs) => {
      map.set(fs.nim || fs.uid, {
        id: fs.uid,
        nama: fs.nama,
        nim: fs.nim || '-',
        kelas: (fs.kelas || 'A') as 'A' | 'B',
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [daftarPraktikan, firestoreStudents]);

  // Metrik ringkasan Praktikan
  const totalMahasiswa = allPraktikan.length;
  const totalKelasA = allPraktikan.filter((p) => p.kelas === 'A').length;
  const totalKelasB = allPraktikan.filter((p) => p.kelas === 'B').length;
  const totalPresensiMasuk = presensiList.length;

  // Metrik ringkasan Asisten
  const totalAsisten = daftarAsisten.length;
  const totalSesiAktif = sesiList.length;

  // Filter & Search List Praktikan
  const filteredPraktikanList = useMemo(() => {
    return allPraktikan.filter((p) => {
      const matchKelas = filterKelas === 'semua' || p.kelas === filterKelas;
      const matchSearch =
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nim.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [allPraktikan, filterKelas, searchQuery]);

  // Filter & Search List Asisten
  const filteredAsistenList = useMemo(() => {
    return daftarAsisten.filter((a) => {
      return a.nama.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [daftarAsisten, searchQuery]);

  const getInitials = (name: string) => {
    return name
      .replace(/^Kak\s+/i, '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  };

  // --- Handlers: Praktikan ---
  const handleOpenTambahPraktikan = () => {
    setNamaBaru('');
    const nextSeq = String(daftarPraktikan.length + 1).padStart(4, '0');
    setNimBaru(`2406012214${nextSeq}`);
    setKelasBaru('A');
    setModalTambahVisible(true);
  };

  const handleSimpanTambahPraktikan = async () => {
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

    try {
      await createPraktikanUser({
        nama: namaBaru.trim(),
        nim: nimBaru.trim(),
        kelas: kelasBaru,
      });
    } catch (err) {
      console.warn('Gagal menyimpan praktikan ke Firestore:', err);
    }

    setModalTambahVisible(false);
    setFeedbackTitle('Praktikan Berhasil Ditambahkan');
    setFeedbackMessage(
      `Data praktikan ${namaBaru.trim()} (NIM: ${nimBaru.trim()}) untuk Kelas ${kelasBaru} telah tersimpan dan dapat langsung mengakses portal presensi.`
    );
    setFeedbackVisible(true);
  };

  const handleOpenEditPraktikan = (item: Praktikan) => {
    setSelectedPraktikan(item);
    setEditNama(item.nama);
    setEditNim(item.nim);
    setEditKelas(item.kelas === 'B' ? 'B' : 'A');
    setModalEditVisible(true);
  };

  const handleSimpanEditPraktikan = async () => {
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

    try {
      await updatePraktikanUser(selectedPraktikan.id, {
        nama: editNama.trim(),
        nim: editNim.trim(),
        kelas: editKelas,
      });
    } catch (err) {
      console.warn('Gagal memperbarui praktikan di Firestore:', err);
    }

    setModalEditVisible(false);
    setFeedbackTitle('Data Praktikan Diperbarui');
    setFeedbackMessage(
      `Pembaruan data mahasiswa ${editNama.trim()} (NIM: ${editNim.trim()}) telah berhasil disimpan.`
    );
    setFeedbackVisible(true);
  };

  const handleOpenHapusPraktikan = (item: Praktikan) => {
    setPraktikanToDelete(item);
    setModalHapusVisible(true);
  };

  const handleConfirmHapusPraktikan = async () => {
    if (!praktikanToDelete) return;
    const deletedName = praktikanToDelete.nama;
    hapusPraktikan(praktikanToDelete.id);

    try {
      await deletePraktikanUser(praktikanToDelete.id);
    } catch (err) {
      console.warn('Gagal menghapus praktikan di Firestore:', err);
    }

    setModalHapusVisible(false);
    setPraktikanToDelete(null);

    setFeedbackTitle('Praktikan Telah Dihapus');
    setFeedbackMessage(
      `Mahasiswa ${deletedName} beserta seluruh catatan presensinya telah dihapus dari sistem.`
    );
    setFeedbackVisible(true);
  };

  // --- Handlers: Asisten ---
  const handleOpenTambahAsisten = () => {
    setNamaAsistenBaru('');
    setPeranLabBaru('Pengampu Laboratorium Komputasi');
    setModalTambahAsistenVisible(true);
  };

  const handleSimpanTambahAsisten = () => {
    if (!namaAsistenBaru.trim()) {
      alert('Nama asisten wajib diisi.');
      return;
    }

    tambahAsisten({
      nama: namaAsistenBaru.trim(),
      peranLab: peranLabBaru.trim() || 'Pengampu Laboratorium Komputasi',
    });

    setModalTambahAsistenVisible(false);
    setFeedbackTitle('Asisten Berhasil Ditambahkan');
    setFeedbackMessage(
      `Asisten ${namaAsistenBaru.trim()} telah terdaftar sebagai pengampu dan dapat masuk untuk mengelola sesi laboratorium.`
    );
    setFeedbackVisible(true);
  };

  const handleOpenEditAsisten = (item: Asisten) => {
    setSelectedAsisten(item);
    setEditNamaAsisten(item.nama);
    setEditPeranLab(item.peranLab || 'Pengampu Laboratorium Komputasi');
    setModalEditAsistenVisible(true);
  };

  const handleSimpanEditAsisten = () => {
    if (!selectedAsisten) return;
    if (!editNamaAsisten.trim()) {
      alert('Nama asisten wajib diisi.');
      return;
    }

    editAsisten(selectedAsisten.id, {
      nama: editNamaAsisten.trim(),
      peranLab: editPeranLab.trim(),
    });

    setModalEditAsistenVisible(false);
    setFeedbackTitle('Data Asisten Diperbarui');
    setFeedbackMessage(
      `Pembaruan identitas asisten ${editNamaAsisten.trim()} telah berhasil disimpan.`
    );
    setFeedbackVisible(true);
  };

  const handleOpenHapusAsisten = (item: Asisten) => {
    if (daftarAsisten.length <= 1) {
      alert('Tidak dapat menghapus asisten terakhir. Sistem membutuhkan minimal 1 akun asisten aktif.');
      return;
    }
    setAsistenToDelete(item);
    setModalHapusAsistenVisible(true);
  };

  const handleConfirmHapusAsisten = () => {
    if (!asistenToDelete) return;
    const deletedName = asistenToDelete.nama;
    hapusAsisten(asistenToDelete.id);
    setModalHapusAsistenVisible(false);
    setAsistenToDelete(null);

    setFeedbackTitle('Asisten Telah Dihapus');
    setFeedbackMessage(`Akun asisten ${deletedName} telah dihapus dari sistem pengampu.`);
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
          <Text style={styles.liveTagText}>Master Data Pengguna</Text>
        </View>
      </View>

      {/* Segmented Switcher: Praktikan vs Asisten */}
      <View style={styles.tabSwitcherContainer}>
        <Pressable
          style={[
            styles.tabSwitcherBtn,
            activeTab === 'praktikan' && styles.tabSwitcherBtnActive,
          ]}
          onPress={() => {
            setActiveTab('praktikan');
            setSearchQuery('');
          }}>
          <Text
            style={[
              styles.tabSwitcherText,
              activeTab === 'praktikan' && styles.tabSwitcherTextActive,
            ]}>
            Praktikan ({totalMahasiswa})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabSwitcherBtn,
            activeTab === 'asisten' && styles.tabSwitcherBtnActive,
          ]}
          onPress={() => {
            setActiveTab('asisten');
            setSearchQuery('');
          }}>
          <Text
            style={[
              styles.tabSwitcherText,
              activeTab === 'asisten' && styles.tabSwitcherTextActive,
            ]}>
            Asisten Lab ({totalAsisten})
          </Text>
        </Pressable>
      </View>

      {/* Title & Action Button */}
      <View style={styles.titleActionRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>
            {activeTab === 'praktikan' ? 'Data Praktikan' : 'Data Asisten Lab'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'praktikan'
              ? 'Kelola data induk praktikan, tambah mahasiswa baru, perbarui data kelas/NIM, atau hapus praktikan'
              : 'Kelola data asisten pengampu, tambah asisten baru, perbarui identitas, atau hapus asisten'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.tambahBtn, pressed && styles.btnPressed]}
          onPress={
            activeTab === 'praktikan'
              ? handleOpenTambahPraktikan
              : handleOpenTambahAsisten
          }
          accessibilityRole="button"
          accessibilityLabel={
            activeTab === 'praktikan' ? 'Tambah Praktikan Baru' : 'Tambah Asisten Baru'
          }>
          <Text style={styles.tambahBtnText}>
            {activeTab === 'praktikan' ? '+ Tambah Praktikan' : '+ Tambah Asisten'}
          </Text>
        </Pressable>
      </View>

      {/* Metrics Overview Cards (Matching E-Stock style) */}
      {activeTab === 'praktikan' ? (
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
      ) : (
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalAsisten}</Text>
            <Text style={styles.metricLbl}>Total Asisten</Text>
            <Text style={styles.metricDesc}>Pengampu Terdaftar</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardTeal]}>
            <Text style={[styles.metricVal, { color: '#0D9488' }]}>{totalSesiAktif}</Text>
            <Text style={styles.metricLbl}>Sesi Praktikum</Text>
            <Text style={styles.metricDesc}>Jadwal Pengelolaan</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardOrange]}>
            <Text style={[styles.metricVal, { color: '#EA580C' }]}>{totalMahasiswa}</Text>
            <Text style={styles.metricLbl}>Mahasiswa Terbimbing</Text>
            <Text style={styles.metricDesc}>Kelas A & B</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#16A34A' }]}>Aktif</Text>
            <Text style={styles.metricLbl}>Status Pengampu</Text>
            <Text style={styles.metricDesc}>Lab Komputasi</Text>
          </View>
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'praktikan'
              ? 'Cari berdasarkan nama mahasiswa atau NIM...'
              : 'Cari berdasarkan nama asisten laboratorium...'
          }
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

      {/* Filter Section (only for Praktikan) */}
      {activeTab === 'praktikan' ? (
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
      ) : null}
    </View>
  );

  // Render Item Praktikan
  const renderItemPraktikan = ({ item }: { item: Praktikan }) => {
    const initials = getInitials(item.nama);
    const kehadiranCount = presensiList.filter((p) => p.praktikanId === item.id).length;

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardContent}>
          <View style={styles.userMainRow}>
            <View style={styles.avatarCirclePraktikan}>
              <Text style={styles.avatarTextPraktikan}>{initials}</Text>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameClassRow}>
                <Text style={styles.userName} numberOfLines={1}>
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

              <Text style={styles.userMeta}>NIM: {item.nim}</Text>

              <View style={styles.metaRow}>
                <View style={styles.kehadiranBadge}>
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
              onPress={() => handleOpenEditPraktikan(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit mahasiswa ${item.nama}`}>
              <Text style={styles.actionBtnEditText}>Edit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtnDelete, pressed && styles.btnPressed]}
              onPress={() => handleOpenHapusPraktikan(item)}
              accessibilityRole="button"
              accessibilityLabel={`Hapus mahasiswa ${item.nama}`}>
              <Text style={styles.actionBtnDeleteText}>Hapus</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Render Item Asisten
  const renderItemAsisten = ({ item }: { item: Asisten }) => {
    const initials = getInitials(item.nama);

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardContent}>
          <View style={styles.userMainRow}>
            <View style={styles.avatarCircleAsisten}>
              <Text style={styles.avatarTextAsisten}>{initials}</Text>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameClassRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.nama}
                </Text>
                <View style={styles.asistenBadge}>
                  <Text style={styles.asistenBadgeText}>Asisten Lab</Text>
                </View>
              </View>

              <Text style={styles.userMeta}>
                {item.peranLab || 'Pengampu Laboratorium Komputasi'}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.asistenStatusTag}>
                  <Text style={styles.asistenStatusText}>Hak Akses Pengampu Aktif</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons: Edit & Hapus */}
          <View style={styles.cardActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtnEdit, pressed && styles.btnPressed]}
              onPress={() => handleOpenEditAsisten(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit asisten ${item.nama}`}>
              <Text style={styles.actionBtnEditText}>Edit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtnDelete,
                totalAsisten <= 1 && styles.actionBtnDisabled,
                pressed && totalAsisten > 1 && styles.btnPressed,
              ]}
              onPress={() => handleOpenHapusAsisten(item)}
              disabled={totalAsisten <= 1}
              accessibilityRole="button"
              accessibilityLabel={`Hapus asisten ${item.nama}`}>
              <Text
                style={[
                  styles.actionBtnDeleteText,
                  totalAsisten <= 1 && styles.actionBtnTextDisabled,
                ]}>
                Hapus
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {activeTab === 'praktikan' ? (
        <FlatList
          data={filteredPraktikanList}
          keyExtractor={(item) => item.id}
          renderItem={renderItemPraktikan}
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
      ) : (
        <FlatList
          data={filteredAsistenList}
          keyExtractor={(item) => item.id}
          renderItem={renderItemAsisten}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Tidak Ada Asisten"
              message={
                searchQuery
                  ? `Tidak ditemukan asisten dengan kata kunci "${searchQuery}".`
                  : 'Belum ada asisten laboratorium yang terdaftar.'
              }
              actionText={searchQuery ? 'Reset Pencarian' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
            />
          }
        />
      )}

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
                onPress={handleSimpanTambahPraktikan}>
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
                onPress={handleSimpanEditPraktikan}>
                <Text style={styles.submitBtnText}>Perbarui Data</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Asisten */}
      <Modal
        visible={modalTambahAsistenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTambahAsistenVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Tambah Asisten Laboratorium</Text>
                <Text style={styles.modalSubtitle}>
                  Tambahkan akun asisten baru untuk pengampu praktikum
                </Text>
              </View>
              <Pressable
                onPress={() => setModalTambahAsistenVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Lengkap Asisten *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Mis. Kak Farhan A."
                  placeholderTextColor="#94A3B8"
                  value={namaAsistenBaru}
                  onChangeText={setNamaAsistenBaru}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tugas / Penugasan Lab</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Mis. Pengampu Laboratorium Komputasi"
                  placeholderTextColor="#94A3B8"
                  value={peranLabBaru}
                  onChangeText={setPeranLabBaru}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalTambahAsistenVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={handleSimpanTambahAsisten}>
                <Text style={styles.submitBtnText}>Simpan Asisten</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Asisten */}
      <Modal
        visible={modalEditAsistenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditAsistenVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Data Asisten Lab</Text>
                <Text style={styles.modalSubtitle}>
                  Perbarui identitas atau penugasan asisten pengampu
                </Text>
              </View>
              <Pressable
                onPress={() => setModalEditAsistenVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nama Lengkap Asisten *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editNamaAsisten}
                  onChangeText={setEditNamaAsisten}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tugas / Penugasan Lab</Text>
                <TextInput
                  style={styles.formInput}
                  value={editPeranLab}
                  onChangeText={setEditPeranLab}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalEditAsistenVisible(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={handleSimpanEditAsisten}>
                <Text style={styles.submitBtnText}>Perbarui Asisten</Text>
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
        onConfirm={handleConfirmHapusPraktikan}
        onCancel={() => setModalHapusVisible(false)}
      />

      {/* Confirmation Modal Hapus Asisten */}
      <ConfirmationModal
        visible={modalHapusAsistenVisible}
        title="Hapus Akun Asisten?"
        description={
          asistenToDelete
            ? `Apakah Anda yakin ingin menghapus akun asisten ${asistenToDelete.nama}? Akun tidak akan dapat lagi masuk untuk mengelola sesi.`
            : ''
        }
        confirmText="Ya, Hapus Asisten"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={handleConfirmHapusAsisten}
        onCancel={() => setModalHapusAsistenVisible(false)}
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
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabSwitcherBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabSwitcherBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabSwitcherText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabSwitcherTextActive: {
    color: '#0D9488',
    fontWeight: '800',
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
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    padding: 14,
  },
  userCardContent: {
    gap: 12,
  },
  userMainRow: {
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
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextPraktikan: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
  },
  avatarCircleAsisten: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextAsisten: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0D9488',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  nameClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
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
  asistenBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  asistenBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  userMeta: {
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
  asistenStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  kehadiranBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  asistenStatusText: {
    fontSize: 11,
    color: '#0F766E',
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
  actionBtnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  actionBtnTextDisabled: {
    color: '#94A3B8',
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
