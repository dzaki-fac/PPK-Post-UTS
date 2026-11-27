import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { ensureDefaultCourse, subscribeManagedCourses } from '@/services/course-service';
import {
  subscribeMembersByCourse,
  subscribeRecentTransfers,
  transferLabMembers,
} from '@/services/lab-member-service';
import { subscribeLabsByCourse } from '@/services/lab-service';
import type {
  CourseDocument,
  LabLocationDocument,
  LabMemberDocument,
  LabTransferDocument,
} from '@/types/praktikum';
import { formatWib } from '@/utils/wib';

export default function AslabPindahAnggotaScreen() {
  const { userDoc } = useAuth();
  const params = useLocalSearchParams<{ memberId?: string; courseId?: string }>();

  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(params.courseId ?? '');
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [sourceLabId, setSourceLabId] = useState('ALL');
  const [targetLabId, setTargetLabId] = useState('');
  const [members, setMembers] = useState<LabMemberDocument[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<LabTransferDocument[]>([]);
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string> | null>(null);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!userDoc?.uid) return;
    void ensureDefaultCourse(userDoc.uid).catch(() => {});

    return subscribeManagedCourses(userDoc.uid, userDoc.managedCourseIds, (list) => {
      setCourses(list);
      setSelectedCourseId((prev) => prev || params.courseId || list[0]?.id || '');
    });
  }, [userDoc?.uid, userDoc?.managedCourseIds, params.courseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId]
  );

  const loading = Boolean(selectedCourse?.id && loadedCourseId !== selectedCourse.id);

  const selectedIds = useMemo(() => {
    if (manualSelectedIds !== null) return manualSelectedIds;
    return params.memberId ? new Set([params.memberId]) : new Set<string>();
  }, [manualSelectedIds, params.memberId]);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    const courseId = selectedCourse.id;
    const unsubLabs = subscribeLabsByCourse(courseId, (list) => {
      setLabs(list);
      setTargetLabId((prev) => (list.some((l) => l.id === prev) ? prev : list[0]?.id ?? ''));
    });
    const unsubMembers = subscribeMembersByCourse(
      courseId,
      (list) => {
        setMembers(list);
        setLoadedCourseId(courseId);
      },
      () => setLoadedCourseId(courseId)
    );
    const unsubTransfers = subscribeRecentTransfers(courseId, (list) => {
      setRecentTransfers(list);
    });

    return () => {
      unsubLabs();
      unsubMembers();
      unsubTransfers();
    };
  }, [selectedCourse?.id]);

  const labNameById = useMemo(
    () => new Map(labs.map((l) => [l.id, l.nama])),
    [labs]
  );

  const targetLab = useMemo(
    () => labs.find((l) => l.id === targetLabId) ?? null,
    [labs, targetLabId]
  );

  const selectableMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (targetLab && m.labId === targetLab.id) return false;
      if (sourceLabId !== 'ALL' && m.labId !== sourceLabId) return false;
      if (!q) return true;
      const labNama = (labNameById.get(m.labId) ?? m.labId).toLowerCase();
      return (
        m.nama.toLowerCase().includes(q) ||
        m.emailLower.includes(q) ||
        (m.nim ?? '').toLowerCase().includes(q) ||
        labNama.includes(q)
      );
    });
  }, [members, targetLab, sourceLabId, searchQuery, labNameById]);

  const selectedMembers = useMemo(
    () =>
      members.filter(
        (m) => selectedIds.has(m.id) && (!targetLab || m.labId !== targetLab.id)
      ),
    [members, selectedIds, targetLab]
  );

  const toggleSelect = (id: string) => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev ?? selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev ?? selectedIds);
      selectableMembers.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const clearSelection = () => setManualSelectedIds(new Set());

  const handleConfirmTransfer = async () => {
    if (!targetLab || !userDoc?.uid || selectedMembers.length === 0) return;
    setTransferring(true);
    setBanner(null);
    try {
      const count = await transferLabMembers({
        members: selectedMembers,
        targetLab,
        reason,
        movedBy: userDoc.uid,
      });
      setBanner({
        type: 'success',
        text: `${count} anggota berhasil dipindahkan ke ${targetLab.nama}. Jadwal sesi praktikum tidak berubah.`,
      });
      setManualSelectedIds(new Set());
      setReason('');
      setConfirmVisible(false);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memindahkan anggota lab.',
      });
      setConfirmVisible(false);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Pressable
            style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
            onPress={() => router.replace('/aslab/anggota' as Href)}>
            <Text style={styles.backChipText}>← Kembali ke Anggota Lab</Text>
          </Pressable>

          <Text style={styles.title}>Pindah Laboratorium Anggota</Text>
          <Text style={styles.subtitle}>
            Pindahkan satu atau banyak praktikan/asprak ke laboratorium lain pada mata kuliah yang sama. Jadwal praktikum tidak ikut dipindahkan.
          </Text>

          {banner ? (
            <View
              style={[
                styles.bannerBox,
                banner.type === 'success' ? styles.bannerSuccess : styles.bannerError,
              ]}>
              <Text
                style={[
                  styles.bannerText,
                  banner.type === 'success' ? styles.bannerSuccessText : styles.bannerErrorText,
                ]}>
                {banner.text}
              </Text>
            </View>
          ) : null}

          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>1. Mata Kuliah</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {courses.map((c) => {
                const active = selectedCourse?.id === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setSourceLabId('ALL');
                      setManualSelectedIds(new Set());
                    }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.kode} - {c.nama}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.panelTitle}>2. Laboratorium Tujuan *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {labs.map((lab) => {
                const active = targetLab?.id === lab.id;
                return (
                  <Pressable
                    key={lab.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setTargetLabId(lab.id)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {lab.kode} • {lab.nama}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Alasan Pemindahan (Opsional)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="Mis. pemerataan kapasitas ruang atau pergantian kelompok"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.panelCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.panelTitle}>3. Pilih Anggota</Text>
              <Text style={styles.selectedCountText}>{selectedMembers.length} dipilih</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                style={[styles.chip, sourceLabId === 'ALL' && styles.chipActive]}
                onPress={() => setSourceLabId('ALL')}>
                <Text style={[styles.chipText, sourceLabId === 'ALL' && styles.chipTextActive]}>
                  Semua Lab Asal
                </Text>
              </Pressable>
              {labs
                .filter((l) => !targetLab || l.id !== targetLab.id)
                .map((lab) => {
                  const active = sourceLabId === lab.id;
                  return (
                    <Pressable
                      key={lab.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSourceLabId(lab.id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        Dari {lab.kode}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>

            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari nama, NIM, email, atau lab asal..."
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.selectActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.btnOutlineIndigo, pressed && styles.pressed]}
                onPress={selectAllVisible}>
                <Text style={styles.btnOutlineIndigoText}>
                  Pilih Semua Tampil ({selectableMembers.length})
                </Text>
              </Pressable>
              {selectedIds.size > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.btnNeutral, pressed && styles.pressed]}
                  onPress={clearSelection}>
                  <Text style={styles.btnNeutralText}>Bersihkan Pilihan</Text>
                </Pressable>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.aslabAccent} />
              </View>
            ) : selectableMembers.length === 0 ? (
              <EmptyState
                title="Tidak Ada Anggota Asal Tersedia"
                message={
                  targetLab
                    ? `Seluruh anggota saat ini sudah berada di ${targetLab.nama} atau tidak cocok dengan filter.`
                    : 'Tambahkan minimal dua laboratorium pada mata kuliah ini.'
                }
              />
            ) : (
              <View style={styles.memberChecklist}>
                {selectableMembers.map((m) => {
                  const checked = selectedIds.has(m.id);
                  const fromNama = labNameById.get(m.labId) ?? m.labId;
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.checkItem, checked && styles.checkItemActive]}
                      onPress={() => toggleSelect(m.id)}>
                      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                        <Text style={styles.checkboxMark}>{checked ? 'V' : ''}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.memberName}>{m.nama}</Text>
                        <Text style={styles.memberMeta}>
                          {m.role.toUpperCase()}
                          {m.nim ? ` • NIM ${m.nim}` : ''} • Dari {fromNama}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {recentTransfers.length > 0 ? (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Riwayat Perpindahan Terbaru</Text>
              <View style={{ gap: 8 }}>
                {recentTransfers.slice(0, 6).map((tr) => {
                  const fromNama = labNameById.get(tr.fromLabId) ?? tr.fromLabId;
                  const toNama = labNameById.get(tr.toLabId) ?? tr.toLabId;
                  return (
                    <View key={tr.id} style={styles.historyRow}>
                      <Text style={styles.historyTitle}>
                        {tr.role.toUpperCase()} • {tr.memberId}
                      </Text>
                      <Text style={styles.historySub}>
                        {fromNama} → {toNama} • {formatWib(tr.createdAt)}
                      </Text>
                      {tr.reason ? <Text style={styles.historyReason}>Alasan: {tr.reason}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <View style={styles.stickyInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyTitle}>
              {selectedMembers.length} anggota siap dipindahkan
            </Text>
            <Text style={styles.stickySub}>
              Tujuan: {targetLab ? targetLab.nama : 'Pilih lab tujuan'}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.commitBtn,
              (!targetLab || selectedMembers.length === 0) && styles.commitBtnDisabled,
              pressed && targetLab && selectedMembers.length > 0 && styles.pressed,
            ]}
            disabled={!targetLab || selectedMembers.length === 0}
            onPress={() => setConfirmVisible(true)}>
            <Text style={styles.commitBtnText}>
              Pindahkan {selectedMembers.length} Anggota
            </Text>
          </Pressable>
        </View>
      </View>

      <ConfirmationModal
        visible={confirmVisible}
        title={`Pindahkan ${selectedMembers.length} Anggota ke ${targetLab?.nama ?? ''}?`}
        description={`Anggota terpilih (${selectedMembers
          .slice(0, 3)
          .map((m) => m.nama)
          .join(', ')}${selectedMembers.length > 3 ? ', ...' : ''}) akan dipindahkan ke ${targetLab?.nama ?? ''}. Jadwal sesi praktikum dan riwayat presensi/tagihan lama tetap tidak berubah.`}
        confirmText="Ya, Pindahkan"
        cancelText="Batal"
        confirmVariant="primary"
        isLoading={transferring}
        onConfirm={() => void handleConfirmTransfer()}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 140 : 110,
  },
  inner: { maxWidth: 960, width: '100%', alignSelf: 'center', gap: 12 },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  backChipText: { fontSize: 11.5, fontWeight: '700', color: Colors.aslabAccent },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  subtitle: { fontSize: 13.5, color: '#64748B', lineHeight: 20 },
  bannerBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  bannerText: { fontSize: 13, fontWeight: '600' },
  bannerSuccessText: { color: '#15803D' },
  bannerErrorText: { color: '#B91C1C' },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  panelTitle: { fontSize: 13.5, fontWeight: '700', color: '#0F172A' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedCountText: { fontSize: 12.5, fontWeight: '800', color: Colors.aslabAccent },
  chipRow: { gap: 8 },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.aslabTint, borderColor: Colors.aslabAccent },
  chipText: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: Colors.aslabAccent, fontWeight: '700' },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
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
  selectActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnOutlineIndigo: {
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnOutlineIndigoText: { fontSize: 12.5, fontWeight: '700', color: Colors.aslabAccent },
  btnNeutral: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnNeutralText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  loadingBox: { paddingVertical: 32, alignItems: 'center' },
  memberChecklist: { gap: 8 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 54,
  },
  checkItemActive: { backgroundColor: Colors.aslabTint, borderColor: Colors.aslabAccent },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: { backgroundColor: Colors.aslabAccent, borderColor: Colors.aslabAccent },
  checkboxMark: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  memberName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  memberMeta: { fontSize: 12, color: '#64748B' },
  historyRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  historySub: { fontSize: 12, color: '#475569' },
  historyReason: { fontSize: 11.5, color: '#64748B' },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'web' ? 84 : 14,
  },
  stickyInner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stickyTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  stickySub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  commitBtn: {
    backgroundColor: Colors.aslabAccent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitBtnDisabled: { opacity: 0.45 },
  commitBtnText: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});
