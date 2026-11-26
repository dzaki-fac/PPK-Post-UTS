/**
 * Jadwal Sesi oleh Aslab — Sprint 4 / Programmer 2 (FR-P2-02).
 * Kewenangan tambah/edit/hapus sesi berada di portal Aslab, bukan Asprak.
 */
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
import { router, type Href } from 'expo-router';

import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import { subscribeLabs } from '@/services/lab-service';
import {
  createSession,
  deleteSession,
  subscribeSessions,
  updateSession,
} from '@/services/session-service';
import type { LabLocationDocument, SessionDocument } from '@/types/praktikum';
import { normalizeRoleP2 } from '@/utils/sprint4-p2-helpers';

type EditTarget = SessionDocument | null;

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}
function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim().replace('.', ':'));
}

export default function JadwalAslabScreen() {
  const { userDoc, loading } = useAuth();
  const role = normalizeRoleP2(userDoc?.peran);

  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [praktikum, setPraktikum] = useState('Praktikum Pengembangan Platform Khusus');
  const [materi, setMateri] = useState('');
  const [kelas, setKelas] = useState<'Kelas A' | 'Kelas B'>('Kelas A');
  const [tanggal, setTanggal] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [labId, setLabId] = useState('');
  const [ruang, setRuang] = useState('');

  useEffect(() => {
    if (!loading && role !== 'aslab') router.replace('/');
  }, [loading, role]);

  useEffect(() => {
    const unsubSessions = subscribeSessions((items) => {
      setSessions(items);
      setReady(true);
    });
    const unsubLabs = subscribeLabs(setLabs, () => setLabs([]));
    return () => {
      unsubSessions();
      unsubLabs();
    };
  }, []);

  const metrics = useMemo(
    () => ({
      total: sessions.length,
      dibuka: sessions.filter((s) => s.status === 'dibuka').length,
      belum: sessions.filter((s) => s.status === 'belum-dibuka').length,
      ditutup: sessions.filter((s) => s.status === 'ditutup').length,
    }),
    [sessions]
  );

  const bukaForm = (target: EditTarget = null) => {
    setEditing(target);
    setPraktikum(target?.praktikum ?? 'Praktikum Pengembangan Platform Khusus');
    setMateri(target?.materi ?? '');
    setKelas(target?.kelas ?? 'Kelas A');
    setTanggal(target?.tanggal ?? '');
    setWaktuMulai(target?.waktuMulai ?? '');
    setWaktuSelesai(target?.waktuSelesai ?? '');
    setLabId(target?.labId ?? labs[0]?.id ?? '');
    setRuang(target?.ruang ?? '');
    setError('');
    setFormVisible(true);
  };

  const simpan = async () => {
    if (!isValidDate(tanggal)) return setError('Tanggal wajib berformat YYYY-MM-DD.');
    if (!isValidTime(waktuMulai) || !isValidTime(waktuSelesai)) {
      return setError('Jam wajib berformat HH:mm (24 jam).');
    }
    if (!labId) return setError('Pilih laboratorium terlebih dahulu.');
    const lab = labs.find((item) => item.id === labId);
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateSession(editing.id, {
          praktikum,
          materi,
          kelas,
          tanggal,
          waktuMulai,
          waktuSelesai,
          labId,
          ruang: ruang || lab?.nama || '',
        });
      } else {
        await createSession({
          praktikum,
          materi,
          kelas,
          tanggal,
          waktuMulai,
          waktuSelesai,
          ruang: ruang || lab?.nama || 'Laboratorium',
          labId,
          createdBy: userDoc?.uid || 'aslab',
          status: 'belum-dibuka',
        });
      }
      setFormVisible(false);
    } catch (err) {
      console.warn('Gagal menyimpan jadwal:', err);
      setError('Gagal menyimpan jadwal. Periksa koneksi dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const hapus = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.warn('Gagal menghapus sesi:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/aslab/dashboard' as Href))}
              style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}>
              <Text style={styles.backPillText}>← Kembali ke Dashboard</Text>
            </Pressable>
            <Text style={styles.eyebrow}>Portal Aslab</Text>
            <Text style={styles.title}>Jadwal & Sesi Praktikum</Text>
            <Text style={styles.subtitle}>
              Buat dan kelola sesi beserta laboratorium tujuannya.
            </Text>
            <MetricsGrid
              items={[
                { label: 'Total Sesi', value: metrics.total, tint: 'indigo' },
                { label: 'Dibuka', value: metrics.dibuka, tint: 'green' },
                { label: 'Belum Dibuka', value: metrics.belum, tint: 'amber' },
                { label: 'Ditutup', value: metrics.ditutup, tint: 'default' },
              ]}
            />
            <Pressable
              onPress={() => bukaForm()}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <Text style={styles.addButtonText}>+ Tambah Sesi</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const lab = labs.find((l) => l.id === item.labId);
          return (
            <View style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <Text style={styles.sessionTitle}>{item.praktikum || 'Sesi Praktikum'}</Text>
                <Text style={[styles.status, item.status === 'dibuka' ? styles.statusOpen : item.status === 'ditutup' ? styles.statusClosed : styles.statusWait]}>
                  {item.status === 'dibuka' ? 'Dibuka' : item.status === 'ditutup' ? 'Ditutup' : 'Belum Dibuka'}
                </Text>
              </View>
              <Text style={styles.sessionMeta}>
                {[item.tanggal, `${item.waktuMulai}-${item.waktuSelesai} WIB`, item.kelas]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.sessionLab}>{lab?.nama || item.ruang || 'Laboratorium'}</Text>
              {item.materi ? <Text style={styles.sessionMateri}>{item.materi}</Text> : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => bukaForm(item)}
                  style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
                  <Text style={styles.editButtonText}>Edit Informasi Sesi</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDeleteTarget(item)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteButtonText}>Hapus Sesi</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Sesi"
            message="Tambahkan sesi baru untuk laboratorium yang Anda kelola."
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal transparent animationType="fade" visible={formVisible} onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormVisible(false)} />
        <View style={styles.modalWrap} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editing ? 'Edit Sesi' : 'Tambah Sesi Baru'}</Text>
                <Text style={styles.modalSubtitle}>Laboratorium wajib dipilih.</Text>
              </View>
              <Pressable onPress={() => setFormVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Praktikum</Text>
              <TextInput value={praktikum} onChangeText={setPraktikum} style={styles.input} />
              <Text style={styles.label}>Materi</Text>
              <TextInput value={materi} onChangeText={setMateri} style={styles.input} placeholder="Topik praktikum" />
              <Text style={styles.label}>Kelas</Text>
              <View style={styles.kelasRow}>
                {(['Kelas A', 'Kelas B'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setKelas(option)}
                    style={[styles.kelasButton, kelas === option && styles.kelasButtonActive]}>
                    <Text style={[styles.kelasText, kelas === option && styles.kelasTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
              <TextInput value={tanggal} onChangeText={setTanggal} style={styles.input} placeholder="2026-11-30" />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.label}>Mulai (HH:mm)</Text>
                  <TextInput value={waktuMulai} onChangeText={setWaktuMulai} style={styles.input} placeholder="08:00" />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.label}>Selesai (HH:mm)</Text>
                  <TextInput value={waktuSelesai} onChangeText={setWaktuSelesai} style={styles.input} placeholder="10:00" />
                </View>
              </View>
              <Text style={styles.label}>Laboratorium</Text>
              {labs.length === 0 ? (
                <Text style={styles.hint}>Belum ada laboratorium. Hubungi pengelola data laboratorium.</Text>
              ) : (
                <View style={styles.labGrid}>
                  {labs.map((lab) => (
                    <Pressable
                      key={lab.id}
                      onPress={() => setLabId(lab.id)}
                      style={[styles.labButton, labId === lab.id && styles.labButtonActive]}>
                      <Text style={[styles.labText, labId === lab.id && styles.labTextActive]}>
                        {lab.nama || lab.kode} · {lab.gedung || '-'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Ruang (opsional)</Text>
              <TextInput value={ruang} onChangeText={setRuang} style={styles.input} placeholder="Nama ruang" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable onPress={() => setFormVisible(false)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Batal</Text>
              </Pressable>
              <Pressable onPress={simpan} disabled={saving} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
                <Text style={styles.primaryText}>{saving ? 'Menyimpan...' : 'Simpan Sesi'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={!!deleteTarget}
        title="Hapus Sesi?"
        description="Sesi dan seluruh catatan presensi terkait akan dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        confirmVariant="danger"
        isLoading={saving}
        onConfirm={hapus}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 90,
    gap: 12,
  },
  header: { gap: 12, paddingTop: 18 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backPill: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 20, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  backPillText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 1 },
  title: { fontSize: Platform.OS === 'web' ? 28 : 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B' },
  addButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#4F46E5' },
  addButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  sessionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, gap: 5, elevation: 1 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  sessionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  status: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusOpen: { color: '#15803D', backgroundColor: '#DCFCE7' },
  statusWait: { color: '#B45309', backgroundColor: '#FEF3C7' },
  statusClosed: { color: '#991B1B', backgroundColor: '#FEE2E2' },
  sessionMeta: { fontSize: 11, color: '#475569' },
  sessionLab: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  sessionMateri: { fontSize: 11, color: '#64748B' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, backgroundColor: '#EEF2FF' },
  editButtonText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  deleteButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, backgroundColor: '#FEE2E2' },
  deleteButtonText: { fontSize: 11, fontWeight: '800', color: '#B91C1C' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.65)' },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 480, maxHeight: '88%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 11, color: '#64748B' },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  formScroll: { maxHeight: '65%' },
  label: { fontSize: 11, fontWeight: '800', color: '#334155', marginTop: 8 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF' },
  kelasRow: { flexDirection: 'row', gap: 8 },
  kelasButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  kelasButtonActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  kelasText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  kelasTextActive: { color: '#4F46E5' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  labGrid: { gap: 6 },
  labButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  labButtonActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  labText: { fontSize: 12, color: '#475569' },
  labTextActive: { color: '#4F46E5', fontWeight: '800' },
  hint: { fontSize: 11, color: '#B45309' },
  error: { fontSize: 11, fontWeight: '700', color: '#B91C1C', marginTop: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  secondaryButton: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  primaryButton: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 10, backgroundColor: '#4F46E5' },
  primaryText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
});
