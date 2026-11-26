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
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { MetricsGrid, type MetricGridItem } from '@/components/metrics-grid';
import { useAuth } from '@/context/auth-context';
import { ensureDefaultCourse, subscribeManagedCourses } from '@/services/course-service';
import {
  softRemoveLabMember,
  subscribeMembersByCourse,
  updateLabMemberProfile,
  upsertSingleLabMember,
} from '@/services/lab-member-service';
import { subscribeLabsByCourse } from '@/services/lab-service';
import type {
  CourseDocument,
  LabLocationDocument,
  LabMemberDocument,
  LabMemberRole,
} from '@/types/praktikum';

const ASLAB_ACCENT = '#4F46E5';
const ASLAB_TINT = '#EEF2FF';
const ASLAB_BORDER = '#C7D2FE';

export default function AslabAnggotaScreen() {
  const { userDoc } = useAuth();
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [selectedLabId, setSelectedLabId] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<'all' | LabMemberRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<LabMemberDocument[]>([]);
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Tambah Manual / Edit Profil
  const [formVisible, setFormVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<LabMemberDocument | null>(null);
  const [formRole, setFormRole] = useState<LabMemberRole>('praktikan');
  const [formLabId, setFormLabId] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNim, setFormNim] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Modal Soft Delete
  const [removeTarget, setRemoveTarget] = useState<LabMemberDocument | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!userDoc?.uid) return;
    void ensureDefaultCourse(userDoc.uid).catch(() => {});

    const unsub = subscribeManagedCourses(userDoc.uid, userDoc.managedCourseIds, (list) => {
      setCourses(list);
      setSelectedCourseId((prev) => prev || list[0]?.id || '');
    });
    return unsub;
  }, [userDoc?.uid, userDoc?.managedCourseIds]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId]
  );

  const loading = Boolean(selectedCourse?.id && loadedCourseId !== selectedCourse.id);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    const courseId = selectedCourse.id;

    const unsubLabs = subscribeLabsByCourse(courseId, (list) => {
      setLabs(list);
      setFormLabId((prev) => prev || list[0]?.id || '');
    });
    const unsubMembers = subscribeMembersByCourse(
      courseId,
      (list) => {
        setMembers(list);
        setLoadedCourseId(courseId);
      },
      () => {
        setLoadedCourseId(courseId);
      }
    );

    return () => {
      unsubLabs();
      unsubMembers();
    };
  }, [selectedCourse?.id]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (selectedLabId !== 'ALL' && m.labId !== selectedLabId) return false;
      if (!q) return true;
      return (
        m.nama.toLowerCase().includes(q) ||
        m.emailLower.includes(q) ||
        (m.nim ?? '').toLowerCase().includes(q) ||
        m.labNama.toLowerCase().includes(q)
      );
    });
  }, [members, roleFilter, selectedLabId, searchQuery]);

  const metrics: MetricGridItem[] = useMemo(() => {
    const totalPraktikan = members.filter((m) => m.role === 'praktikan').length;
    const totalAsprak = members.filter((m) => m.role === 'asprak').length;
    const linked = members.filter((m) => Boolean(m.uid)).length;
    return [
      { key: 'total', label: 'Total Anggota', value: members.length, tone: 'primary' },
      { key: 'praktikan', label: 'Praktikan', value: totalPraktikan, tone: 'warning' },
      { key: 'asprak', label: 'Asprak', value: totalAsprak, tone: 'info' },
      { key: 'linked', label: 'Akun Tertaut', value: linked, tone: 'success' },
    ];
  }, [members]);

  const openAddModal = () => {
    setEditingMember(null);
    setFormRole(roleFilter === 'asprak' ? 'asprak' : 'praktikan');
    setFormLabId(selectedLabId !== 'ALL' ? selectedLabId : labs[0]?.id ?? '');
    setFormNama('');
    setFormEmail('');
    setFormNim('');
    setFormError(null);
    setFormVisible(true);
  };

  const openEditModal = (member: LabMemberDocument) => {
    setEditingMember(member);
    setFormRole(member.role);
    setFormLabId(member.labId);
    setFormNama(member.nama);
    setFormEmail(member.email);
    setFormNim(member.nim ?? '');
    setFormError(null);
    setFormVisible(true);
  };

  const handleSaveForm = async () => {
    if (!selectedCourse) return;
    setFormError(null);
    setSavingForm(true);
    try {
      if (editingMember) {
        await updateLabMemberProfile(editingMember.id, {
          nama: formNama,
          email: formEmail,
        });
        setBanner({
          type: 'success',
          text: `Data anggota "${formNama.trim()}" berhasil diperbarui.`,
        });
      } else {
        const lab = labs.find((l) => l.id === formLabId);
        if (!lab) {
          throw new Error('Pilih laboratorium tujuan terlebih dahulu.');
        }
        await upsertSingleLabMember({
          courseId: selectedCourse.id,
          lab,
          role: formRole,
          nama: formNama,
          email: formEmail,
          nim: formNim,
        });
        setBanner({
          type: 'success',
          text: `${formRole === 'praktikan' ? 'Praktikan' : 'Asprak'} "${formNama.trim()}" berhasil ditambahkan ke ${lab.nama}.`,
        });
      }
      setFormVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data anggota.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await softRemoveLabMember(removeTarget);
      setBanner({
        type: 'success',
        text: `${removeTarget.nama} dikeluarkan dari ${removeTarget.labNama}. Histori presensi & denda tetap tersimpan.`,
      });
      setRemoveTarget(null);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengeluarkan anggota lab.',
      });
    } finally {
      setRemoving(false);
    }
  };

  const renderMemberCard = ({ item }: { item: LabMemberDocument }) => {
    const isPraktikan = item.role === 'praktikan';
    const isLinked = Boolean(item.uid);

    return (
      <View style={styles.memberCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.roleBadge,
                isPraktikan ? styles.roleBadgePraktikan : styles.roleBadgeAsprak,
              ]}>
              <Text
                style={[
                  styles.roleBadgeText,
                  isPraktikan ? styles.roleTextPraktikan : styles.roleTextAsprak,
                ]}>
                {isPraktikan ? 'PRAKTIKAN' : 'ASPRAK'}
              </Text>
            </View>
            <View style={[styles.linkBadge, isLinked ? styles.linkYes : styles.linkNo]}>
              <Text
                style={[styles.linkBadgeText, isLinked ? styles.linkYesText : styles.linkNoText]}>
                {isLinked ? 'Akun Tertaut' : 'Menunggu Login'}
              </Text>
            </View>
          </View>
          <View style={styles.labTag}>
            <Text style={styles.labTagText}>{item.labNama}</Text>
          </View>
        </View>

        <Text style={styles.memberName}>{item.nama}</Text>
        <Text style={styles.memberMeta}>
          {item.nim ? `NIM ${item.nim} • ` : ''}
          {item.email}
        </Text>

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.btnCardOutline, pressed && styles.pressed]}
            onPress={() => openEditModal(item)}>
            <Text style={styles.btnCardOutlineText}>Edit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnCardIndigo, pressed && styles.pressed]}
            onPress={() =>
              router.push(
                `/aslab/pindah-anggota?memberId=${encodeURIComponent(item.id)}&courseId=${encodeURIComponent(item.courseId)}` as Href
              )
            }>
            <Text style={styles.btnCardIndigoText}>Pindah Lab</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnCardDanger, pressed && styles.pressed]}
            onPress={() => setRemoveTarget(item)}>
            <Text style={styles.btnCardDangerText}>Keluarkan</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberCard}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Anggota Laboratorium</Text>
            <Text style={styles.screenSubtitle}>
              Kelola daftar praktikan dan asprak, impor massal terpisah, serta pemindahan antar-lab dalam mata kuliah.
            </Text>

            <View style={styles.quickActionGrid}>
              <Pressable
                style={({ pressed }) => [styles.btnIndigo, pressed && styles.pressed]}
                onPress={openAddModal}>
                <Text style={styles.btnIndigoText}>+ Tambah Anggota</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnIndigoOutline, pressed && styles.pressed]}
                onPress={() => router.push('/aslab/impor-praktikan' as Href)}>
                <Text style={styles.btnIndigoOutlineText}>Impor Praktikan</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnIndigoOutline, pressed && styles.pressed]}
                onPress={() => router.push('/aslab/impor-asprak' as Href)}>
                <Text style={styles.btnIndigoOutlineText}>Impor Asprak</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnNeutral, pressed && styles.pressed]}
                onPress={() => router.push('/aslab/pindah-anggota' as Href)}>
                <Text style={styles.btnNeutralText}>Pindah Lab Massal →</Text>
              </Pressable>
            </View>

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

            <MetricsGrid items={metrics} accentColor={ASLAB_ACCENT} />

            {/* Pilihan Mata Kuliah */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {courses.map((c) => {
                const active = selectedCourse?.id === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setSelectedLabId('ALL');
                    }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.kode} - {c.nama}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Switcher Praktikan / Asprak */}
            <View style={styles.segmentedRow}>
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'praktikan', label: 'Praktikan' },
                  { key: 'asprak', label: 'Asprak' },
                ] as const
              ).map((seg) => {
                const active = roleFilter === seg.key;
                return (
                  <Pressable
                    key={seg.key}
                    style={[styles.segBtn, active && styles.segBtnActive]}
                    onPress={() => setRoleFilter(seg.key)}>
                    <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
                      {seg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Filter Lab */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                style={[styles.chip, selectedLabId === 'ALL' && styles.chipActive]}
                onPress={() => setSelectedLabId('ALL')}>
                <Text style={[styles.chipText, selectedLabId === 'ALL' && styles.chipTextActive]}>
                  Semua Lab ({labs.length})
                </Text>
              </Pressable>
              {labs.map((lab) => {
                const active = selectedLabId === lab.id;
                return (
                  <Pressable
                    key={lab.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedLabId(lab.id)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {lab.kode} • {lab.nama}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari nama, NIM, email, atau nama lab..."
              placeholderTextColor="#94A3B8"
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={ASLAB_ACCENT} />
              <Text style={styles.loadingLabel}>Memuat daftar anggota lab...</Text>
            </View>
          ) : (
            <EmptyState
              title="Belum Ada Anggota Terdaftar"
              message="Tambahkan anggota secara manual atau impor daftar praktikan / asprak dari file CSV/XLSX."
              actionText="Impor Praktikan"
              onAction={() => router.push('/aslab/impor-praktikan' as Href)}
            />
          )
        }
      />

      {/* Modal Tambah / Edit Anggota */}
      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMember ? 'Edit Data Anggota' : 'Tambah Anggota Lab'}
              </Text>
              <Pressable onPress={() => setFormVisible(false)}>
                <Text style={styles.closeText}>Tutup</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {formError ? (
                <View style={[styles.bannerBox, styles.bannerError]}>
                  <Text style={[styles.bannerText, styles.bannerErrorText]}>{formError}</Text>
                </View>
              ) : null}

              {!editingMember ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Peran Anggota *</Text>
                    <View style={styles.segmentedRow}>
                      {(['praktikan', 'asprak'] as const).map((r) => {
                        const active = formRole === r;
                        return (
                          <Pressable
                            key={r}
                            style={[styles.segBtn, active && styles.segBtnActive]}
                            onPress={() => setFormRole(r)}>
                            <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
                              {r === 'praktikan' ? 'Praktikan' : 'Asprak'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Laboratorium Tujuan *</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}>
                      {labs.map((lab) => {
                        const active = formLabId === lab.id;
                        return (
                          <Pressable
                            key={lab.id}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => setFormLabId(lab.id)}>
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {lab.kode} • {lab.nama}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
                <TextInput
                  style={styles.input}
                  value={formNama}
                  onChangeText={setFormNama}
                  placeholder="Nama lengkap mahasiswa"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="email@students.undip.ac.id"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {!editingMember ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    NIM {formRole === 'praktikan' ? '*' : '(Opsional)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={formNim}
                    onChangeText={setFormNim}
                    keyboardType="numeric"
                    placeholder="24060123140001"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.btnNeutral, { flex: 1 }]}
                onPress={() => setFormVisible(false)}
                disabled={savingForm}>
                <Text style={styles.btnNeutralText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.btnIndigo, { flex: 1 }]}
                onPress={handleSaveForm}
                disabled={savingForm}>
                {savingForm ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnIndigoText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Soft Remove */}
      <ConfirmationModal
        visible={Boolean(removeTarget)}
        title={`Keluarkan ${removeTarget?.nama ?? 'Anggota'}?`}
        description={`Anggota akan dikeluarkan dari ${removeTarget?.labNama ?? 'lab'}. Status diubah menjadi removed dan riwayat presensi/denda sebelumnya tetap terjaga.`}
        confirmText="Ya, Keluarkan"
        cancelText="Batal"
        confirmVariant="danger"
        isLoading={removing}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 96 : 32,
  },
  headerBlock: { gap: 10, marginBottom: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  screenSubtitle: { fontSize: 13.5, color: '#64748B', lineHeight: 20 },
  quickActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnIndigo: {
    backgroundColor: ASLAB_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIndigoText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  btnIndigoOutline: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIndigoOutlineText: { fontSize: 13, fontWeight: '700', color: ASLAB_ACCENT },
  btnNeutral: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnNeutralText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  bannerBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  bannerText: { fontSize: 13, fontWeight: '600' },
  bannerSuccessText: { color: '#15803D' },
  bannerErrorText: { color: '#B91C1C' },
  chipRow: { gap: 8 },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: ASLAB_TINT, borderColor: ASLAB_ACCENT },
  chipText: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: ASLAB_ACCENT, fontWeight: '700' },
  segmentedRow: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 9,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: ASLAB_TINT, borderColor: ASLAB_ACCENT },
  segBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  segBtnTextActive: { color: ASLAB_ACCENT },
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
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  roleBadgePraktikan: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  roleBadgeAsprak: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
  roleBadgeText: { fontSize: 10.5, fontWeight: '800' },
  roleTextPraktikan: { color: '#C2410C' },
  roleTextAsprak: { color: '#0F766E' },
  linkBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  linkYes: { backgroundColor: '#DCFCE7' },
  linkNo: { backgroundColor: '#F1F5F9' },
  linkBadgeText: { fontSize: 10.5, fontWeight: '700' },
  linkYesText: { color: '#15803D' },
  linkNoText: { color: '#64748B' },
  labTag: {
    backgroundColor: ASLAB_TINT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  labTagText: { fontSize: 11.5, fontWeight: '700', color: ASLAB_ACCENT },
  memberName: { fontSize: 15.5, fontWeight: '800', color: '#0F172A' },
  memberMeta: { fontSize: 12.5, color: '#64748B' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  btnCardOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnCardOutlineText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  btnCardIndigo: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnCardIndigoText: { fontSize: 12.5, fontWeight: '700', color: ASLAB_ACCENT },
  btnCardDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnCardDangerText: { fontSize: 12.5, fontWeight: '700', color: '#DC2626' },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingLabel: { fontSize: 13, color: '#64748B' },
  pressed: { opacity: 0.85 },
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
    maxWidth: 520,
    maxHeight: '90%',
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
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  closeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalBody: { padding: 18, gap: 12 },
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
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
