import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import {
  DEFAULT_LAB_RADIUS_METER,
  MAX_LAB_RADIUS_METER,
  MIN_LAB_RADIUS_METER,
  buildFallbackDefaultLabs,
  createLab,
  deleteLab,
  seedDefaultLabsIfEmpty,
  subscribeLabs,
  updateLab,
} from '@/services/lab-service';
import {
  getCurrentDeviceLocation,
  openDeviceLocationSettings,
} from '@/services/location-service';
import { LabLocationDocument } from '@/types/praktikum';

const RADIUS_PRESETS = [25, 50, 100, 150];

export default function AsistenLokasiLabScreen() {
  const { userDoc } = useAuth();
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const seededAttemptedRef = useRef(false);

  // Form Modal State (Tambah / Edit)
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingLab, setEditingLab] = useState<LabLocationDocument | null>(null);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [gedung, setGedung] = useState('Gedung E, FSM UNDIP');
  const [deskripsi, setDeskripsi] = useState('');
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [radiusText, setRadiusText] = useState(String(DEFAULT_LAB_RADIUS_METER));
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // GPS Capture State inside Modal
  const [capturingGps, setCapturingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [gpsNeedsSettings, setGpsNeedsSettings] = useState(false);

  // Delete & Feedback Modals
  const [labToDelete, setLabToDelete] = useState<LabLocationDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeLabs(
      (items) => {
        setSyncWarning(null);
        if (items.length === 0 && !seededAttemptedRef.current && userDoc?.uid) {
          seededAttemptedRef.current = true;
          seedDefaultLabsIfEmpty(userDoc.uid).catch((err) => {
            setSyncWarning(
              err instanceof Error
                ? `Gagal mengisi seed awal /labs di Firestore (${err.message}). Menampilkan data referensi lokal.`
                : 'Gagal menyinkronkan koleksi /labs di Firestore.'
            );
            setLabs(buildFallbackDefaultLabs());
          });
        } else {
          setLabs(items);
        }
        setLoading(false);
      },
      (err) => {
        setSyncWarning(
          `Akses koleksi /labs di Firestore terbatas (${err.message}). Pastikan aturan keamanan Firestore untuk /labs telah di-deploy.`
        );
        setLabs(buildFallbackDefaultLabs());
        setLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [userDoc?.uid]);

  const filteredLabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter(
      (l) =>
        l.nama.toLowerCase().includes(q) ||
        l.kode.toLowerCase().includes(q) ||
        l.gedung.toLowerCase().includes(q)
    );
  }, [labs, searchQuery]);

  const totalLabs = labs.length;
  const activeLabs = labs.filter((l) => l.isActive).length;
  const avgRadius = useMemo(() => {
    if (labs.length === 0) return DEFAULT_LAB_RADIUS_METER;
    const sum = labs.reduce((acc, item) => acc + item.radiusMeter, 0);
    return Math.round(sum / labs.length);
  }, [labs]);

  const openAddModal = () => {
    setEditingLab(null);
    setNama('');
    setKode('');
    setGedung('Gedung E Lantai 2, FSM UNDIP');
    setDeskripsi('');
    setLatText('-7.049120');
    setLngText('110.440820');
    setRadiusText(String(DEFAULT_LAB_RADIUS_METER));
    setIsActive(true);
    setFormError(null);
    setGpsNotice(null);
    setGpsNeedsSettings(false);
    setFormModalVisible(true);
  };

  const openEditModal = (lab: LabLocationDocument) => {
    setEditingLab(lab);
    setNama(lab.nama);
    setKode(lab.kode);
    setGedung(lab.gedung);
    setDeskripsi(lab.deskripsi ?? '');
    setLatText(String(lab.latitude));
    setLngText(String(lab.longitude));
    setRadiusText(String(lab.radiusMeter));
    setIsActive(lab.isActive);
    setFormError(null);
    setGpsNotice(null);
    setGpsNeedsSettings(false);
    setFormModalVisible(true);
  };

  const handleUseCurrentLocation = async () => {
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
        `Koordinat berhasil diambil dari GPS perangkat${
          loc.accuracy !== undefined ? ` (akurasi +/- ${Math.round(loc.accuracy)} meter)` : ''
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

  const handleSaveLab = async () => {
    setFormError(null);
    if (!userDoc?.uid) {
      setFormError('Identitas asisten tidak ditemukan. Silakan masuk ulang.');
      return;
    }

    const parsedLat = Number(latText.replace(',', '.').trim());
    const parsedLng = Number(lngText.replace(',', '.').trim());
    const parsedRadius = Number(radiusText.trim());

    if (!nama.trim()) {
      setFormError('Nama laboratorium wajib diisi.');
      return;
    }
    if (!kode.trim()) {
      setFormError('Kode singkat laboratorium wajib diisi.');
      return;
    }
    if (!gedung.trim()) {
      setFormError('Lokasi gedung wajib diisi.');
      return;
    }
    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setFormError('Latitude harus berupa angka valid antara -90 dan 90.');
      return;
    }
    if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setFormError('Longitude harus berupa angka valid antara -180 dan 180.');
      return;
    }
    if (
      !Number.isFinite(parsedRadius) ||
      parsedRadius < MIN_LAB_RADIUS_METER ||
      parsedRadius > MAX_LAB_RADIUS_METER
    ) {
      setFormError(
        `Radius validasi harus berada antara ${MIN_LAB_RADIUS_METER} sampai ${MAX_LAB_RADIUS_METER} meter.`
      );
      return;
    }

    setSaving(true);
    try {
      if (editingLab) {
        await updateLab(
          editingLab.id,
          {
            nama: nama.trim(),
            kode: kode.trim(),
            gedung: gedung.trim(),
            deskripsi: deskripsi.trim(),
            latitude: parsedLat,
            longitude: parsedLng,
            radiusMeter: parsedRadius,
            isActive,
          },
          userDoc.uid
        );
        setFormModalVisible(false);
        setFeedbackTitle('Lokasi Lab Diperbarui');
        setFeedbackMessage(
          `Koordinat dan radius ${nama.trim()} (${parsedRadius} meter) telah tersimpan di Cloud Firestore.`
        );
      } else {
        await createLab(
          {
            nama: nama.trim(),
            kode: kode.trim(),
            gedung: gedung.trim(),
            deskripsi: deskripsi.trim(),
            latitude: parsedLat,
            longitude: parsedLng,
            radiusMeter: parsedRadius,
            isActive,
          },
          userDoc.uid
        );
        setFormModalVisible(false);
        setFeedbackTitle('Laboratorium Ditambahkan');
        setFeedbackMessage(
          `${nama.trim()} telah tersimpan di Firestore dan langsung tersedia sebagai acuan geofencing sesi praktikum.`
        );
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan lokasi laboratorium ke Cloud Firestore.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!labToDelete) return;
    setDeleting(true);
    try {
      const targetName = labToDelete.nama;
      await deleteLab(labToDelete.id);
      setLabToDelete(null);
      setFeedbackTitle('Laboratorium Dihapus');
      setFeedbackMessage(`Data lokasi ${targetName} telah dihapus dari koleksi /labs.`);
    } catch (err) {
      setLabToDelete(null);
      setFeedbackTitle('Gagal Menghapus');
      setFeedbackMessage(
        err instanceof Error ? err.message : 'Gagal menghapus lokasi laboratorium di Firestore.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleManualSeed = async () => {
    if (!userDoc?.uid) return;
    try {
      const created = await seedDefaultLabsIfEmpty(userDoc.uid);
      setFeedbackTitle(created ? 'Data Awal Lab Dimuat' : 'Data Lab Sudah Tersedia');
      setFeedbackMessage(
        created
          ? '5 titik laboratorium Departemen Informatika FSM UNDIP berhasil ditambahkan ke Firestore.'
          : 'Koleksi /labs di Firestore sudah memiliki data laboratorium.'
      );
    } catch (err) {
      setFeedbackTitle('Gagal Memuat Data Awal');
      setFeedbackMessage(
        err instanceof Error ? err.message : 'Tidak dapat menulis data awal ke Firestore /labs.'
      );
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>ASISTEN LABORATORIUM</Text>
        </View>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>Geofencing Firestore</Text>
        </View>
      </View>

      <View style={styles.titleActionRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.headerTitle}>Lokasi & Radius Lab</Text>
          <Text style={styles.headerSubtitle}>
            Atur titik koordinat GPS dan radius validasi presensi untuk setiap ruang laboratorium Informatika
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah Lokasi Laboratorium"
          onPress={openAddModal}
          style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}>
          <Text style={styles.addBtnText}>+ Tambah Lab</Text>
        </Pressable>
      </View>

      {syncWarning ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerTitle}>Catatan Sinkronisasi Firestore</Text>
          <Text style={styles.warningBannerText}>{syncWarning}</Text>
        </View>
      ) : null}

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{totalLabs}</Text>
          <Text style={styles.metricLbl}>Total Lab</Text>
          <Text style={styles.metricDesc}>Titik Terdaftar</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardActive]}>
          <Text style={[styles.metricVal, { color: '#0D9488' }]}>{activeLabs}</Text>
          <Text style={styles.metricLbl}>Lab Aktif</Text>
          <Text style={styles.metricDesc}>Siap Geofencing</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#1E293B' }]}>{avgRadius}m</Text>
          <Text style={styles.metricLbl}>Rata-rata Radius</Text>
          <Text style={styles.metricDesc}>Batas Validasi</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama lab, kode (LAB-K1), atau gedung..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bersihkan Pencarian"
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderLabItem = ({ item }: { item: LabLocationDocument }) => (
    <View style={styles.labCard}>
      <View style={styles.labCardHeader}>
        <View style={styles.labTitleRow}>
          <View style={styles.kodePill}>
            <Text style={styles.kodePillText}>{item.kode}</Text>
          </View>
          <Text style={styles.labName} numberOfLines={2}>
            {item.nama}
          </Text>
        </View>
        <View
          style={[
            styles.activeBadge,
            item.isActive ? styles.activeBadgeOn : styles.activeBadgeOff,
          ]}>
          <Text
            style={[
              styles.activeBadgeText,
              item.isActive ? styles.activeBadgeTextOn : styles.activeBadgeTextOff,
            ]}>
            {item.isActive ? 'Aktif' : 'Nonaktif'}
          </Text>
        </View>
      </View>

      <Text style={styles.gedungText}>{item.gedung}</Text>
      {item.deskripsi ? <Text style={styles.descText}>{item.deskripsi}</Text> : null}

      <View style={styles.geoGrid}>
        <View style={styles.geoCell}>
          <Text style={styles.geoLabel}>Latitude</Text>
          <Text style={styles.geoValue}>{item.latitude.toFixed(6)}</Text>
        </View>
        <View style={styles.geoCell}>
          <Text style={styles.geoLabel}>Longitude</Text>
          <Text style={styles.geoValue}>{item.longitude.toFixed(6)}</Text>
        </View>
        <View style={[styles.geoCell, styles.geoCellRadius]}>
          <Text style={styles.geoLabel}>Radius Presensi</Text>
          <Text style={styles.geoRadiusValue}>{item.radiusMeter} meter</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.nama}`}
          onPress={() => openEditModal(item)}
          style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}>
          <Text style={styles.editBtnText}>Edit Koordinat & Radius</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hapus ${item.nama}`}
          onPress={() => setLabToDelete(item)}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}>
          <Text style={styles.deleteBtnText}>Hapus</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredLabs}
        keyExtractor={(item) => item.id}
        renderItem={renderLabItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingStateText}>Memuat data lokasi lab dari Firestore...</Text>
            </View>
          ) : (
            <EmptyState
              title="Belum Ada Lokasi Lab"
              message={
                searchQuery
                  ? `Tidak ditemukan laboratorium dengan kata kunci "${searchQuery}".`
                  : 'Belum ada titik koordinat laboratorium yang tersimpan di Firestore.'
              }
              actionText={searchQuery ? 'Reset Pencarian' : 'Muat Data Awal Lab UNDIP'}
              onAction={searchQuery ? () => setSearchQuery('') : handleManualSeed}
            />
          )
        }
      />

      {/* Modal Tambah / Edit Lokasi Lab */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !saving && setFormModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => !saving && setFormModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {editingLab ? 'Edit Lokasi Laboratorium' : 'Tambah Lokasi Laboratorium'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Koordinat dan radius akan menjadi acuan geofencing presensi mahasiswa
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup Modal"
                onPress={() => !saving && setFormModalVisible(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Laboratorium *</Text>
                <TextInput
                  style={styles.textInput}
                  value={nama}
                  onChangeText={setNama}
                  placeholder="Mis. Lab Komputasi 1"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Kode Lab *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={kode}
                    onChangeText={setKode}
                    placeholder="LAB-K1"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.4 }]}>
                  <Text style={styles.inputLabel}>Gedung / Lokasi *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={gedung}
                    onChangeText={setGedung}
                    placeholder="Gedung E Lt. 2"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* GPS Capture Section */}
              <View style={styles.gpsCaptureBox}>
                <View style={styles.gpsCaptureHeader}>
                  <Text style={styles.gpsCaptureTitle}>Titik Koordinat GPS Laboratorium</Text>
                  <Text style={styles.gpsCaptureSub}>
                    Berdirilah di tengah ruangan lab lalu tekan tombol di bawah untuk mengisi koordinat otomatis.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gunakan Lokasi Saya Saat Ini"
                  onPress={handleUseCurrentLocation}
                  disabled={capturingGps}
                  style={({ pressed }) => [
                    styles.gpsBtn,
                    pressed && !capturingGps && styles.btnPressed,
                    capturingGps && styles.btnDisabled,
                  ]}>
                  {capturingGps ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.gpsBtnText}>Gunakan Lokasi Saya Saat Ini</Text>
                  )}
                </Pressable>

                {gpsNotice ? (
                  <View style={styles.gpsNoticeBox}>
                    <Text style={styles.gpsNoticeText}>{gpsNotice}</Text>
                    {gpsNeedsSettings ? (
                      <Pressable
                        onPress={() => {
                          openDeviceLocationSettings();
                        }}
                        style={styles.gpsSettingsLink}>
                        <Text style={styles.gpsSettingsLinkText}>Buka Pengaturan Perangkat →</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Latitude *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={latText}
                      onChangeText={setLatText}
                      placeholder="-7.049120"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Longitude *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={lngText}
                      onChangeText={setLngText}
                      placeholder="110.440820"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </View>

              {/* Radius Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Radius Validasi Presensi ({MIN_LAB_RADIUS_METER} - {MAX_LAB_RADIUS_METER} meter) *
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={radiusText}
                  onChangeText={(t) => setRadiusText(t.replace(/[^0-9]/g, ''))}
                  placeholder="50"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <View style={styles.presetRow}>
                  {RADIUS_PRESETS.map((preset) => {
                    const selected = Number(radiusText) === preset;
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => setRadiusText(String(preset))}
                        style={[
                          styles.presetChip,
                          selected && styles.presetChipActive,
                        ]}>
                        <Text
                          style={[
                            styles.presetChipText,
                            selected && styles.presetChipTextActive,
                          ]}>
                          {preset} m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deskripsi / Kapasitas (Opsional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={deskripsi}
                  onChangeText={setDeskripsi}
                  placeholder="Mis. Kapasitas 40 PC, digunakan untuk praktikum PPK & RPL"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status Operasional Lab</Text>
                <View style={styles.twoColRow}>
                  <Pressable
                    onPress={() => setIsActive(true)}
                    style={[styles.statusToggleBtn, isActive && styles.statusToggleBtnActive]}>
                    <Text
                      style={[
                        styles.statusToggleText,
                        isActive && styles.statusToggleTextActive,
                      ]}>
                      Aktif (Digunakan)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsActive(false)}
                    style={[styles.statusToggleBtn, !isActive && styles.statusToggleBtnInactive]}>
                    <Text
                      style={[
                        styles.statusToggleText,
                        !isActive && styles.statusToggleTextInactive,
                      ]}>
                      Nonaktif
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setFormModalVisible(false)}
                disabled={saving}
                style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveLab}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && !saving && styles.btnPressed,
                  saving && styles.btnDisabled,
                ]}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingLab ? 'Simpan Perubahan' : 'Simpan Lokasi Lab'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Konfirmasi Hapus Lab */}
      <ConfirmationModal
        visible={labToDelete !== null}
        title="Hapus Lokasi Laboratorium?"
        description={
          labToDelete
            ? `Data koordinat dan radius untuk ${labToDelete.nama} (${labToDelete.kode}) akan dihapus dari Firestore.`
            : ''
        }
        confirmText="Ya, Hapus Lab"
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setLabToDelete(null)}
      />

      {/* Feedback Modal */}
      <ConfirmationModal
        visible={feedbackMessage !== null}
        title={feedbackTitle}
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 104 : 36,
    gap: 12,
  },
  header: {
    gap: 12,
    marginBottom: 4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  eyebrowBadge: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
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
    color: '#0F766E',
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
    minWidth: 220,
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  addBtn: {
    backgroundColor: '#0D9488',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  warningBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  warningBannerText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  metricCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
  },
  metricLbl: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 10,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  labCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  labCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  labTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  kodePill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kodePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  labName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeBadgeOn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  activeBadgeOff: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  activeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  activeBadgeTextOn: {
    color: '#15803D',
  },
  activeBadgeTextOff: {
    color: '#64748B',
  },
  gedungText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  descText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  geoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  geoCell: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  geoCellRadius: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  geoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  geoValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  geoRadiusValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0D9488',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  editBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  editBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  deleteBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingStateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  modalHeaderText: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  modalBody: {
    padding: 18,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  inputGroup: {
    gap: 6,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
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
  textArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gpsCaptureBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  gpsCaptureHeader: {
    gap: 2,
  },
  gpsCaptureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  gpsCaptureSub: {
    fontSize: 11.5,
    color: '#115E59',
    lineHeight: 16,
  },
  gpsBtn: {
    backgroundColor: '#0D9488',
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  gpsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  gpsNoticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  gpsNoticeText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 17,
  },
  gpsSettingsLink: {
    alignSelf: 'flex-start',
  },
  gpsSettingsLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  presetChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  statusToggleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  statusToggleBtnInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  statusToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  statusToggleTextActive: {
    color: '#15803D',
  },
  statusToggleTextInactive: {
    color: '#B91C1C',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
