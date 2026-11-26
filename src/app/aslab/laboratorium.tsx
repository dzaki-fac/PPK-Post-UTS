import { router, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { MetricsGrid, type MetricGridItem } from '@/components/metrics-grid';
import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_RADIUS_METER,
} from '@/constants/praktikum-config';
import { useAuth } from '@/context/auth-context';
import {
  ensureDefaultCourse,
  subscribeManagedCourses,
} from '@/services/course-service';
import {
  createLab,
  deleteLabSafely,
  subscribeLabs,
  updateLab,
} from '@/services/lab-service';
import {
  getCurrentDeviceLocation,
  openDeviceLocationSettings,
} from '@/services/location-service';
import type { CourseDocument, LabLocationDocument } from '@/types/praktikum';
import { formatRupiah } from '@/utils/format';

const ASLAB_ACCENT = '#4F46E5';
const ASLAB_TINT = '#EEF2FF';
const ASLAB_BORDER = '#C7D2FE';

export default function AslabLaboratoriumScreen() {
  const { userDoc } = useAuth();
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Modal Tambah/Edit
  const [formVisible, setFormVisible] = useState(false);
  const [editingLab, setEditingLab] = useState<LabLocationDocument | null>(null);
  const [courseIdInput, setCourseIdInput] = useState('');
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [gedung, setGedung] = useState('');
  const [kapasitasText, setKapasitasText] = useState('');
  const [kelasText, setKelasText] = useState('');
  const [latText, setLatText] = useState('-7.049120');
  const [lngText, setLngText] = useState('110.440820');
  const [radiusText, setRadiusText] = useState(String(DEFAULT_RADIUS_METER));
  const [graceText, setGraceText] = useState(String(DEFAULT_GRACE_MINUTES));
  const [fineText, setFineText] = useState(String(DEFAULT_FINE_AMOUNT));
  const [deskripsi, setDeskripsi] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // GPS
  const [capturingGps, setCapturingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [gpsNeedsSettings, setGpsNeedsSettings] = useState(false);

  // Delete / Nonaktifkan modal
  const [deleteTarget, setDeleteTarget] = useState<LabLocationDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deactivateOffer, setDeactivateOffer] = useState<string | null>(null);

  useEffect(() => {
    if (!userDoc?.uid) return;
    void ensureDefaultCourse(userDoc.uid).catch(() => {});

    const unsubCourses = subscribeManagedCourses(
      userDoc.uid,
      userDoc.managedCourseIds,
      (list) => {
        setCourses(list);
      }
    );
    const unsubLabs = subscribeLabs(
      (list) => {
        setLabs(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubCourses();
      unsubLabs();
    };
  }, [userDoc?.uid, userDoc?.managedCourseIds]);

  const filteredLabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return labs.filter((lab) => {
      if (selectedCourseId !== 'ALL' && lab.courseId !== selectedCourseId) {
        return false;
      }
      if (!q) return true;
      return (
        lab.nama.toLowerCase().includes(q) ||
        lab.kode.toLowerCase().includes(q) ||
        lab.gedung.toLowerCase().includes(q) ||
        (lab.courseNama ?? '').toLowerCase().includes(q)
      );
    });
  }, [labs, selectedCourseId, searchQuery]);

  const metrics: MetricGridItem[] = useMemo(() => {
    const activeLabs = filteredLabs.filter((l) => l.isActive).length;
    const avgGrace =
      filteredLabs.length > 0
        ? Math.round(
            filteredLabs.reduce(
              (acc, l) => acc + (l.graceMinutes ?? DEFAULT_GRACE_MINUTES),
              0
            ) / filteredLabs.length
          )
        : DEFAULT_GRACE_MINUTES;
    const maxFine =
      filteredLabs.length > 0
        ? Math.max(...filteredLabs.map((l) => l.fineAmount ?? DEFAULT_FINE_AMOUNT))
        : DEFAULT_FINE_AMOUNT;

    return [
      { key: 'total', label: 'Total Lab', value: filteredLabs.length, tone: 'primary' },
      { key: 'active', label: 'Lab Aktif', value: activeLabs, tone: 'success' },
      { key: 'grace', label: 'Rata Tenggang', value: `${avgGrace} mnt`, tone: 'info' },
      { key: 'fine', label: 'Denda Tertinggi', value: formatRupiah(maxFine), tone: 'warning' },
    ];
  }, [filteredLabs]);

  const openCreateModal = () => {
    const defaultCourse =
      (selectedCourseId !== 'ALL'
        ? courses.find((c) => c.id === selectedCourseId)
        : courses[0]) ?? null;
    setEditingLab(null);
    setCourseIdInput(defaultCourse?.id ?? '');
    setNama('');
    setKode('');
    setGedung('Gedung E FSM UNDIP');
    setKapasitasText('');
    setKelasText('');
    setLatText('-7.049120');
    setLngText('110.440820');
    setRadiusText(String(DEFAULT_RADIUS_METER));
    setGraceText(String(DEFAULT_GRACE_MINUTES));
    setFineText(String(DEFAULT_FINE_AMOUNT));
    setDeskripsi('');
    setIsActive(true);
    setFormError(null);
    setGpsNotice(null);
    setGpsNeedsSettings(false);
    setFormVisible(true);
  };

  const openEditModal = (lab: LabLocationDocument) => {
    setEditingLab(lab);
    setCourseIdInput(lab.courseId ?? courses[0]?.id ?? '');
    setNama(lab.nama);
    setKode(lab.kode);
    setGedung(lab.gedung);
    setKapasitasText(lab.kapasitas ? String(lab.kapasitas) : '');
    setKelasText(lab.kelas ?? '');
    setLatText(String(lab.latitude));
    setLngText(String(lab.longitude));
    setRadiusText(String(lab.radiusMeter));
    setGraceText(String(lab.graceMinutes ?? DEFAULT_GRACE_MINUTES));
    setFineText(String(lab.fineAmount ?? DEFAULT_FINE_AMOUNT));
    setDeskripsi(lab.deskripsi ?? '');
    setIsActive(lab.isActive);
    setFormError(null);
    setGpsNotice(null);
    setGpsNeedsSettings(false);
    setFormVisible(true);
  };

  const handleCaptureLocation = async () => {
    setCapturingGps(true);
    setGpsNotice(null);
    setGpsNeedsSettings(false);
    setFormError(null);
    const loc = await getCurrentDeviceLocation({ requestPermission: true });
    setCapturingGps(false);

    if (loc.status === 'ready' && loc.latitude !== undefined && loc.longitude !== undefined) {
      setLatText(loc.latitude.toFixed(6));
      setLngText(loc.longitude.toFixed(6));
      setGpsNotice(
        `Koordinat GPS terambil${
          loc.accuracy !== undefined ? ` (akurasi +/- ${Math.round(loc.accuracy)} m)` : ''
        }.`
      );
    } else {
      setGpsNotice(loc.message);
      setGpsNeedsSettings(
        Platform.OS !== 'web' &&
          (loc.status === 'permission_denied' || loc.status === 'services_disabled')
      );
    }
  };

  const handleSave = async () => {
    if (!userDoc?.uid) return;
    setFormError(null);

    const lat = Number(latText.replace(',', '.').trim());
    const lng = Number(lngText.replace(',', '.').trim());
    const radiusMeter = Number(radiusText.trim());
    const graceMinutes = Number(graceText.trim());
    const fineAmount = Number(fineText.replace(/[.\s]/g, '').trim());
    const kapasitas = kapasitasText.trim() ? Number(kapasitasText.trim()) : undefined;

    const chosenCourse = courses.find((c) => c.id === courseIdInput);

    setSaving(true);
    try {
      const payload = {
        courseId: chosenCourse?.id ?? (courseIdInput || undefined),
        courseNama: chosenCourse?.nama,
        nama,
        kode,
        gedung,
        latitude: lat,
        longitude: lng,
        radiusMeter,
        graceMinutes,
        fineAmount,
        kapasitas,
        kelas: kelasText.trim() || undefined,
        deskripsi,
        isActive,
      };

      if (editingLab) {
        await updateLab(editingLab.id, payload, userDoc.uid);
        setBannerMsg({ type: 'success', text: `Laboratorium "${nama.trim()}" berhasil diperbarui.` });
      } else {
        await createLab(payload, userDoc.uid);
        setBannerMsg({ type: 'success', text: `Laboratorium "${nama.trim()}" berhasil ditambahkan.` });
      }
      setFormVisible(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan data lab.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteOrDeactivate = async () => {
    if (!deleteTarget || !userDoc?.uid) return;
    setDeleting(true);
    try {
      if (deactivateOffer) {
        await updateLab(deleteTarget.id, { isActive: false }, userDoc.uid);
        setBannerMsg({
          type: 'success',
          text: `Laboratorium "${deleteTarget.nama}" dinonaktifkan agar data histori tetap aman.`,
        });
        setDeleteTarget(null);
        setDeactivateOffer(null);
      } else {
        await deleteLabSafely(deleteTarget.id);
        setBannerMsg({
          type: 'success',
          text: `Laboratorium "${deleteTarget.nama}" berhasil dihapus.`,
        });
        setDeleteTarget(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus lab.';
      setDeactivateOffer(message);
    } finally {
      setDeleting(false);
    }
  };

  const renderLabCard = ({ item }: { item: LabLocationDocument }) => (
    <View style={styles.labCard}>
      <View style={styles.labHeader}>
        <View style={styles.labTitleWrap}>
          <View style={styles.kodeRow}>
            <View style={styles.kodeChip}>
              <Text style={styles.kodeChipText}>{item.kode}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                item.isActive ? styles.statusActive : styles.statusInactive,
              ]}>
              <Text
                style={[
                  styles.statusText,
                  item.isActive ? styles.statusActiveText : styles.statusInactiveText,
                ]}>
                {item.isActive ? 'Aktif' : 'Nonaktif'}
              </Text>
            </View>
            {item.courseNama ? (
              <Text style={styles.courseTag} numberOfLines={1}>
                {item.courseNama}
              </Text>
            ) : null}
          </View>
          <Text style={styles.labName}>{item.nama}</Text>
          <Text style={styles.labBuilding}>{item.gedung}</Text>
        </View>
      </View>

      <View style={styles.specGrid}>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>Radius Geofence</Text>
          <Text style={styles.specValue}>{item.radiusMeter} m</Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>Masa Tenggang</Text>
          <Text style={styles.specValue}>{item.graceMinutes ?? DEFAULT_GRACE_MINUTES} mnt</Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>Nominal Denda</Text>
          <Text style={[styles.specValue, { color: '#B45309' }]}>
            {formatRupiah(item.fineAmount ?? DEFAULT_FINE_AMOUNT)}
          </Text>
        </View>
        <View style={styles.specBox}>
          <Text style={styles.specLabel}>Kapasitas / Kelas</Text>
          <Text style={styles.specValue}>
            {item.kapasitas ? `${item.kapasitas} mhs` : '-'}
            {item.kelas ? ` (${item.kelas})` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.coordText}>
        Koordinat: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          onPress={() => openEditModal(item)}>
          <Text style={styles.btnSecondaryText}>Edit Konfigurasi</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnDangerOutline, pressed && styles.pressed]}
          onPress={() => {
            setDeactivateOffer(null);
            setDeleteTarget(item);
          }}>
          <Text style={styles.btnDangerOutlineText}>Hapus / Nonaktifkan</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredLabs}
        keyExtractor={(item) => item.id}
        renderItem={renderLabCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.screenTitle}>Manajemen Laboratorium</Text>
                <Text style={styles.screenSubtitle}>
                  Kelola lokasi GPS, radius check-in, toleransi keterlambatan, dan tarif denda tiap lab.
                </Text>
              </View>
            </View>

            <View style={styles.topButtonRow}>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                onPress={openCreateModal}>
                <Text style={styles.btnPrimaryText}>+ Tambah Lab</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnOutlineIndigo, pressed && styles.pressed]}
                onPress={() => router.push('/aslab/impor-lab' as Href)}>
                <Text style={styles.btnOutlineIndigoText}>Impor / Generator Lab</Text>
              </Pressable>
            </View>

            {bannerMsg ? (
              <View
                style={[
                  styles.bannerBox,
                  bannerMsg.type === 'success' ? styles.bannerSuccess : styles.bannerError,
                ]}>
                <Text
                  style={[
                    styles.bannerText,
                    bannerMsg.type === 'success'
                      ? styles.bannerSuccessText
                      : styles.bannerErrorText,
                  ]}>
                  {bannerMsg.text}
                </Text>
              </View>
            ) : null}

            <MetricsGrid items={metrics} accentColor={ASLAB_ACCENT} />

            {/* Filter Mata Kuliah */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  selectedCourseId === 'ALL' && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCourseId('ALL')}>
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCourseId === 'ALL' && styles.filterChipTextActive,
                  ]}>
                  Semua Mata Kuliah
                </Text>
              </Pressable>
              {courses.map((c) => {
                const active = selectedCourseId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setSelectedCourseId(c.id)}>
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}>
                      {c.kode} - {c.nama}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari nama lab, kode lab, atau gedung..."
              placeholderTextColor="#94A3B8"
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={ASLAB_ACCENT} />
              <Text style={styles.loadingLabel}>Memuat daftar laboratorium...</Text>
            </View>
          ) : (
            <EmptyState
              title="Belum Ada Laboratorium"
              message="Tambahkan laboratorium pertama atau gunakan Impor / Generator Lab untuk membuat banyak ruang sekaligus."
              actionText="Tambah Lab Sekarang"
              onAction={openCreateModal}
            />
          )
        }
      />

      {/* Modal Form Tambah/Edit Lab */}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLab ? 'Edit Konfigurasi Lab' : 'Tambah Laboratorium Baru'}
              </Text>
              <Pressable onPress={() => setFormVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {formError ? (
                <View style={[styles.bannerBox, styles.bannerError]}>
                  <Text style={[styles.bannerText, styles.bannerErrorText]}>{formError}</Text>
                </View>
              ) : null}

              {courses.length > 0 ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mata Kuliah</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterChipRow}>
                    {courses.map((c) => {
                      const active = courseIdInput === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => setCourseIdInput(c.id)}>
                          <Text
                            style={[
                              styles.filterChipText,
                              active && styles.filterChipTextActive,
                            ]}>
                            {c.kode} - {c.nama}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nama Laboratorium *</Text>
                <TextInput
                  style={styles.input}
                  value={nama}
                  onChangeText={setNama}
                  placeholder="Contoh: Lab Komputasi 1"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Kode Lab *</Text>
                  <TextInput
                    style={styles.input}
                    value={kode}
                    onChangeText={setKode}
                    autoCapitalize="characters"
                    placeholder="LAB-PPK-1"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Kelas (Opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={kelasText}
                    onChangeText={setKelasText}
                    placeholder="Kelas A"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Gedung / Lokasi *</Text>
                  <TextInput
                    style={styles.input}
                    value={gedung}
                    onChangeText={setGedung}
                    placeholder="Gedung E Lt. 2 FSM UNDIP"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.fieldGroup, { width: 110 }]}>
                  <Text style={styles.label}>Kapasitas</Text>
                  <TextInput
                    style={styles.input}
                    value={kapasitasText}
                    onChangeText={setKapasitasText}
                    keyboardType="numeric"
                    placeholder="36"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.gpsPanel}>
                <View style={styles.gpsHeader}>
                  <Text style={styles.gpsTitle}>Koordinat GPS Laboratorium</Text>
                  <Pressable
                    style={({ pressed }) => [styles.btnGps, pressed && styles.pressed]}
                    onPress={handleCaptureLocation}
                    disabled={capturingGps}>
                    {capturingGps ? (
                      <ActivityIndicator size="small" color={ASLAB_ACCENT} />
                    ) : (
                      <Text style={styles.btnGpsText}>Gunakan Lokasi Saya Saat Ini</Text>
                    )}
                  </Pressable>
                </View>
                {gpsNotice ? <Text style={styles.gpsNoticeText}>{gpsNotice}</Text> : null}
                {gpsNeedsSettings ? (
                  <Pressable onPress={() => void openDeviceLocationSettings()}>
                    <Text style={styles.gpsSettingsLink}>Buka Pengaturan Lokasi →</Text>
                  </Pressable>
                ) : null}

                <View style={styles.rowTwo}>
                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.label}>Latitude *</Text>
                    <TextInput
                      style={styles.input}
                      value={latText}
                      onChangeText={setLatText}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.label}>Longitude *</Text>
                    <TextInput
                      style={styles.input}
                      value={lngText}
                      onChangeText={setLngText}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rowThree}>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Radius (15-500m) *</Text>
                  <TextInput
                    style={styles.input}
                    value={radiusText}
                    onChangeText={setRadiusText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Tenggang (0-120m) *</Text>
                  <TextInput
                    style={styles.input}
                    value={graceText}
                    onChangeText={setGraceText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldGroup, styles.flexOne]}>
                  <Text style={styles.label}>Denda (Rp) *</Text>
                  <TextInput
                    style={styles.input}
                    value={fineText}
                    onChangeText={setFineText}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Catatan / Deskripsi</Text>
                <TextInput
                  style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                  multiline
                  placeholder="Keterangan ruang, fasilitas, atau catatan khusus."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.label}>Status Laboratorium Aktif</Text>
                  <Text style={styles.switchHint}>
                    Lab nonaktif tidak muncul pada pilihan pembuatan sesi baru.
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#CBD5E1', true: ASLAB_ACCENT }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, styles.flexOne, pressed && styles.pressed]}
                onPress={() => setFormVisible(false)}
                disabled={saving}>
                <Text style={styles.btnSecondaryText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, styles.flexOne, pressed && styles.pressed]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {editingLab ? 'Simpan Perubahan' : 'Simpan Lab'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Hapus / Nonaktifkan */}
      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title={
          deactivateOffer
            ? `Nonaktifkan ${deleteTarget?.nama ?? 'Lab'}?`
            : `Hapus ${deleteTarget?.nama ?? 'Lab'}?`
        }
        description={
          deactivateOffer ??
          'Laboratorium ini akan dihapus permanen jika belum memiliki anggota aktif maupun histori sesi.'
        }
        confirmText={deactivateOffer ? 'Nonaktifkan Lab' : 'Ya, Hapus'}
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleConfirmDeleteOrDeactivate}
        onCancel={() => {
          setDeleteTarget(null);
          setDeactivateOffer(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 96 : 32,
  },
  headerBlock: {
    marginBottom: 12,
  },
  titleRow: {
    marginBottom: 12,
  },
  titleCopy: {
    gap: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
  },
  topButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  btnPrimary: {
    backgroundColor: ASLAB_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnOutlineIndigo: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineIndigoText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: ASLAB_ACCENT,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  btnDangerOutline: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  pressed: {
    opacity: 0.85,
  },
  bannerBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bannerSuccessText: {
    color: '#15803D',
  },
  bannerErrorText: {
    color: '#B91C1C',
  },
  filterChipRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: ASLAB_TINT,
    borderColor: ASLAB_ACCENT,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: ASLAB_ACCENT,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 44,
  },
  labCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  labHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  labTitleWrap: {
    flex: 1,
    gap: 4,
  },
  kodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  kodeChip: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kodeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: ASLAB_ACCENT,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#15803D',
  },
  statusInactiveText: {
    color: '#64748B',
  },
  courseTag: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  labName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  labBuilding: {
    fontSize: 13,
    color: '#64748B',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specBox: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  coordText: {
    fontSize: 12,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalBody: {
    padding: 18,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 44,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  rowThree: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  flexOne: {
    flex: 1,
    minWidth: 110,
  },
  gpsPanel: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  gpsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnGps: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnGpsText: {
    fontSize: 12,
    fontWeight: '700',
    color: ASLAB_ACCENT,
  },
  gpsNoticeText: {
    fontSize: 12,
    color: '#475569',
  },
  gpsSettingsLink: {
    fontSize: 12,
    fontWeight: '700',
    color: ASLAB_ACCENT,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  switchHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
});
