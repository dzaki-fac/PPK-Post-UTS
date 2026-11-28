import React, { useEffect, useMemo, useState } from 'react';
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
import { SesiCard } from '@/components/sesi-card';
import {
  MAX_GRACE_MINUTES,
  MAX_RADIUS_METER,
  MIN_GRACE_MINUTES,
  MIN_RADIUS_METER,
} from '@/constants/praktikum-config';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { buildFallbackDefaultLabs, subscribeLabs } from '@/services/lab-service';
import {
  createSession,
  deleteSession,
  subscribeSessions,
  updateSession,
} from '@/services/session-service';
import { LabLocationDocument, SessionDocument, SessionStatus } from '@/types/praktikum';
import { toWibDateString } from '@/utils/wib';

type FilterType = 'semua' | SessionStatus;

export default function AslabJadwalScreen() {
  const { userDoc } = useAuth();
  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterType>('semua');
  const [filterLabId, setFilterLabId] = useState<string>('semua');

  // Form Modal State (Tambah / Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionDocument | null>(null);
  const [praktikum, setPraktikum] = useState('Praktikum PPK');
  const [materi, setMateri] = useState('');
  const [kelas, setKelas] = useState<'Kelas A' | 'Kelas B'>('Kelas A');
  const [labId, setLabId] = useState('');
  const [tanggal, setTanggal] = useState(() => toWibDateString(new Date()));
  const [waktuMulai, setWaktuMulai] = useState('07:30');
  const [waktuSelesai, setWaktuSelesai] = useState('09:30');
  const [radiusOverride, setRadiusOverride] = useState('');
  const [graceOverride, setGraceOverride] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [sessionToDelete, setSessionToDelete] = useState<SessionDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubSessions = subscribeSessions(
      (items) => {
        setSessions(items);
        setLoading(false);
      },
      () => setLoading(false),
      { autoCloseExpired: false }
    );

    const unsubLabs = subscribeLabs(
      (items) => {
        setLabs(items.length > 0 ? items : buildFallbackDefaultLabs());
      },
      () => {
        setLabs(buildFallbackDefaultLabs());
      }
    );

    return () => {
      unsubSessions();
      unsubLabs();
    };
  }, []);

  const managedCourseIds = useMemo(
    () => userDoc?.managedCourseIds ?? [],
    [userDoc?.managedCourseIds]
  );

  const scopedLabs = useMemo(() => {
    const active = labs.filter((l) => l.isActive);
    if (managedCourseIds.length === 0) return active;
    const set = new Set(managedCourseIds);
    return active.filter((l) => !l.courseId || set.has(l.courseId));
  }, [labs, managedCourseIds]);

  const scopedSessions = useMemo(() => {
    if (managedCourseIds.length === 0) return sessions;
    const set = new Set(managedCourseIds);
    return sessions.filter((s) => !s.courseId || set.has(s.courseId));
  }, [sessions, managedCourseIds]);

  const filteredSessions = useMemo(() => {
    return scopedSessions.filter((s) => {
      const matchStatus = filterStatus === 'semua' || s.status === filterStatus;
      const matchLab = filterLabId === 'semua' || s.labId === filterLabId;
      return matchStatus && matchLab;
    });
  }, [scopedSessions, filterStatus, filterLabId]);

  const totalSesi = scopedSessions.length;
  const totalDibuka = scopedSessions.filter((s) => s.status === 'dibuka').length;
  const totalBelum = scopedSessions.filter((s) => s.status === 'belum-dibuka').length;
  const totalDitutup = scopedSessions.filter((s) => s.status === 'ditutup').length;

  const openAddModal = () => {
    setEditingSession(null);
    setPraktikum('Praktikum PPK');
    setMateri('');
    setKelas('Kelas A');
    setLabId(scopedLabs[0]?.id ?? '');
    setTanggal(toWibDateString(new Date()));
    setWaktuMulai('07:30');
    setWaktuSelesai('09:30');
    setRadiusOverride('');
    setGraceOverride('');
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (sesi: SessionDocument) => {
    setEditingSession(sesi);
    setPraktikum(sesi.praktikum);
    setMateri(sesi.materi);
    setKelas(sesi.kelas);
    setLabId(sesi.labId || scopedLabs[0]?.id || '');
    setTanggal(sesi.tanggal);
    setWaktuMulai(sesi.waktuMulai);
    setWaktuSelesai(sesi.waktuSelesai);
    setRadiusOverride(
      sesi.radiusOverride !== undefined ? String(sesi.radiusOverride) : ''
    );
    setGraceOverride(
      sesi.graceMinutesOverride !== undefined ? String(sesi.graceMinutesOverride) : ''
    );
    setFormError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!materi.trim()) {
      setFormError('Materi praktikum wajib diisi.');
      return;
    }
    const selectedLab = scopedLabs.find((l) => l.id === labId);
    if (!selectedLab) {
      setFormError('Laboratorium tujuan (labId) wajib dipilih.');
      return;
    }
    if (!tanggal.trim() || !waktuMulai.trim() || !waktuSelesai.trim()) {
      setFormError('Tanggal, jam mulai, dan jam selesai wajib diisi.');
      return;
    }

    let parsedRadius: number | undefined;
    if (radiusOverride.trim()) {
      const n = Number(radiusOverride.trim());
      if (!Number.isFinite(n) || n < MIN_RADIUS_METER || n > MAX_RADIUS_METER) {
        setFormError(
          `Radius khusus sesi harus antara ${MIN_RADIUS_METER} sampai ${MAX_RADIUS_METER} meter.`
        );
        return;
      }
      parsedRadius = Math.round(n);
    }

    let parsedGrace: number | undefined;
    if (graceOverride.trim()) {
      const g = Number(graceOverride.trim());
      if (!Number.isFinite(g) || g < MIN_GRACE_MINUTES || g > MAX_GRACE_MINUTES) {
        setFormError(
          `Toleransi keterlambatan harus antara ${MIN_GRACE_MINUTES} sampai ${MAX_GRACE_MINUTES} menit.`
        );
        return;
      }
      parsedGrace = Math.round(g);
    }

    setSaving(true);
    try {
      if (editingSession) {
        await updateSession(editingSession.id, {
          praktikum: praktikum.trim() || 'Praktikum PPK',
          materi: materi.trim(),
          kelas,
          labId: selectedLab.id,
          ruang: selectedLab.nama,
          ...(selectedLab.courseId ? { courseId: selectedLab.courseId } : {}),
          tanggal: tanggal.trim(),
          waktuMulai: waktuMulai.trim(),
          waktuSelesai: waktuSelesai.trim(),
          radiusOverride: parsedRadius ?? null,
          graceMinutesOverride: parsedGrace ?? null,
        });
      } else {
        await createSession({
          praktikum: praktikum.trim() || 'Praktikum PPK',
          materi: materi.trim(),
          kelas,
          labId: selectedLab.id,
          ruang: selectedLab.nama,
          ...(selectedLab.courseId ? { courseId: selectedLab.courseId } : {}),
          tanggal: tanggal.trim(),
          waktuMulai: waktuMulai.trim(),
          waktuSelesai: waktuSelesai.trim(),
          createdBy: userDoc?.uid || 'aslab',
          status: 'belum-dibuka',
          ...(parsedRadius !== undefined ? { radiusOverride: parsedRadius } : {}),
          ...(parsedGrace !== undefined ? { graceMinutesOverride: parsedGrace } : {}),
        });
      }
      setModalVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal sesi.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.eyebrowBadge}>
        <Text style={styles.eyebrowText}>MANAJEMEN JADWAL SESI (ASLAB)</Text>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.screenTitle}>Jadwal Sesi Laboratorium</Text>
          <Text style={styles.screenSubtitle}>
            Buat, perbarui, atau hapus jadwal sesi praktikum dan tautkan langsung ke laboratorium terkait.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tambah Sesi Baru"
          onPress={openAddModal}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <Text style={styles.addBtnText}>+ Tambah Sesi</Text>
        </Pressable>
      </View>

      {/* MetricsGrid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: Colors.aslabPrimary }]}>{totalSesi}</Text>
          <Text style={styles.metricLbl}>Total Sesi</Text>
          <Text style={styles.metricDesc}>Terdaftar</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>{totalDibuka}</Text>
          <Text style={styles.metricLbl}>Dibuka</Text>
          <Text style={styles.metricDesc}>Sedang berjalan</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Text style={[styles.metricVal, { color: '#D97706' }]}>{totalBelum}</Text>
          <Text style={styles.metricLbl}>Belum Dibuka</Text>
          <Text style={styles.metricDesc}>Terjadwal</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: '#64748B' }]}>{totalDitutup}</Text>
          <Text style={styles.metricLbl}>Ditutup</Text>
          <Text style={styles.metricDesc}>Selesai</Text>
        </View>
      </View>

      {/* Filter Status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {(
          [
            { key: 'semua', label: 'Semua Status' },
            { key: 'dibuka', label: 'Dibuka' },
            { key: 'belum-dibuka', label: 'Belum Dibuka' },
            { key: 'ditutup', label: 'Ditutup' },
          ] as const
        ).map((item) => {
          const active = filterStatus === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilterStatus(item.key)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Filter Lab */}
      {scopedLabs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setFilterLabId('semua')}
            style={({ pressed }) => [
              styles.chip,
              filterLabId === 'semua' && styles.chipActive,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.chipText,
                filterLabId === 'semua' && styles.chipTextActive,
              ]}>
              Semua Lab
            </Text>
          </Pressable>
          {scopedLabs.map((l) => {
            const active = filterLabId === l.id;
            return (
              <Pressable
                key={l.id}
                onPress={() => setFilterLabId(l.id)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {l.kode} • {l.nama}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.sessionWrapper}>
            <SesiCard
              sesi={item}
              role="aslab"
              onPress={() => openEditModal(item)}
            />
            <View style={styles.cardActionsBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openEditModal(item)}
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                <Text style={styles.editBtnText}>Edit Sesi</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSessionToDelete(item)}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}>
                <Text style={styles.deleteBtnText}>Hapus Sesi</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.aslabPrimary} />
              <Text style={styles.loadingText}>Memuat daftar sesi laboratorium...</Text>
            </View>
          ) : (
            <EmptyState
              title="Belum Ada Jadwal Sesi"
              message="Tekan tombol + Tambah Sesi untuk menjadwalkan modul praktikum baru pada laboratorium."
            />
          )
        }
      />

      {/* Modal Tambah / Edit Sesi */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingSession ? 'Edit Informasi Sesi' : 'Tambah Jadwal Sesi Baru'}
                </Text>
                <Text style={styles.modalSub}>
                  Pilih laboratorium tujuan agar koordinat geofencing dan batas keterlambatan aktif.
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Laboratorium Tujuan (Wajib)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.labSelectorRow}>
                {scopedLabs.map((l) => {
                  const selected = l.id === labId;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => setLabId(l.id)}
                      style={[
                        styles.labOptionChip,
                        selected && styles.labOptionChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.labOptionText,
                          selected && styles.labOptionTextActive,
                        ]}>
                        {l.kode} — {l.nama}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Nama Praktikum</Text>
              <TextInput
                style={styles.input}
                value={praktikum}
                onChangeText={setPraktikum}
                placeholder="Praktikum PPK"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Materi Modul</Text>
              <TextInput
                style={styles.input}
                value={materi}
                onChangeText={setMateri}
                placeholder="Modul 4: Payment Gateway & Denda"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Kelas</Text>
              <View style={styles.kelasRow}>
                {(['Kelas A', 'Kelas B'] as const).map((k) => {
                  const active = kelas === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setKelas(k)}
                      style={[styles.kelasBtn, active && styles.kelasBtnActive]}>
                      <Text style={[styles.kelasBtnText, active && styles.kelasBtnTextActive]}>
                        {k}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Tanggal (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={tanggal}
                onChangeText={setTanggal}
                placeholder="2026-11-26"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Jam Mulai (WIB)</Text>
                  <TextInput
                    style={styles.input}
                    value={waktuMulai}
                    onChangeText={setWaktuMulai}
                    placeholder="07:30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Jam Selesai (WIB)</Text>
                  <TextInput
                    style={styles.input}
                    value={waktuSelesai}
                    onChangeText={setWaktuSelesai}
                    placeholder="09:30"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Radius Khusus (m, Opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={radiusOverride}
                    onChangeText={setRadiusOverride}
                    placeholder="Default lab"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Grace Khusus (mnt, Opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={graceOverride}
                    onChangeText={setGraceOverride}
                    placeholder="Default lab"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.cancelModalBtn}
                disabled={saving}>
                <Text style={styles.cancelModalText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={styles.saveModalBtn}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalText}>
                    {editingSession ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={Boolean(sessionToDelete)}
        title="Hapus Jadwal Sesi?"
        description={`Sesi "${sessionToDelete?.materi || sessionToDelete?.praktikum || ''}" beserta seluruh catatan presensinya akan dihapus permanen.`}
        confirmText="Ya, Hapus Sesi"
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSessionToDelete(null)}
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
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 100 : 32,
  },
  header: {
    gap: 12,
    marginBottom: 14,
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.aslabPrimary,
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flex: 1,
    minWidth: 230,
    gap: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.aslabPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 2,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
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
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.aslabPrimary,
    borderColor: Colors.aslabPrimary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sessionWrapper: {
    gap: 6,
  },
  cardActionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.aslabPrimary,
  },
  deleteBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeX: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  modalBody: {
    maxHeight: 420,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  labSelectorRow: {
    gap: 8,
    paddingVertical: 2,
  },
  labOptionChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
  },
  labOptionChipActive: {
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabPrimary,
  },
  labOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  labOptionTextActive: {
    color: Colors.aslabPrimary,
  },
  kelasRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kelasBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kelasBtnActive: {
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabPrimary,
  },
  kelasBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  kelasBtnTextActive: {
    color: Colors.aslabPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  cancelModalBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveModalBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.aslabPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
