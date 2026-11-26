/**
 * Roster presensi Sprint 4 (Programmer 2) — Hadir / Terlambat / Izin / Belum Hadir.
 * Seluruh status memakai teks semantik, tanpa emoji (DESIGN.md §8).
 */
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

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import {
  buildAttendanceRoster,
  createManualAttendance,
  hitungStatistikRoster,
  type LeaveMarker,
  type RosterEntry,
  type RosterStats,
  type RosterStudent,
} from '@/services/attendance-admin-service';
import type {
  RosterStatus,
  Sprint4AttendanceDocument,
} from '@/types/sprint4-p2';

export interface AttendanceRosterProps {
  sessionId: string;
  students: RosterStudent[];
  attendances: Sprint4AttendanceDocument[];
  approvedLeaves?: LeaveMarker[];
  canManage?: boolean;
  asprakUid?: string;
  onRosterChange?: () => void;
}

type RosterFilter = 'semua' | RosterStatus;

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'hadir', label: 'Hadir' },
  { key: 'terlambat', label: 'Terlambat' },
  { key: 'izin', label: 'Izin' },
  { key: 'belum-hadir', label: 'Belum Hadir' },
];

const STATUS_STYLE: Record<RosterStatus, { label: string; color: string; bg: string; border: string }> = {
  hadir: { label: 'Hadir', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' },
  terlambat: { label: 'Terlambat', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  izin: { label: 'Izin', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
  'belum-hadir': { label: 'Belum Hadir', color: '#475569', bg: '#F1F5F9', border: '#E2E8F0' },
};

function StatusChip({ status }: { status: RosterStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <View style={[styles.chip, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.chipText, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}

export function AttendanceRoster({
  sessionId,
  students,
  attendances,
  approvedLeaves = [],
  canManage = false,
  asprakUid = '',
  onRosterChange,
}: AttendanceRosterProps) {
  const [filter, setFilter] = useState<RosterFilter>('semua');
  const [manualTarget, setManualTarget] = useState<RosterEntry | null>(null);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const entries = useMemo(
    () => buildAttendanceRoster(students, attendances, approvedLeaves),
    [students, attendances, approvedLeaves]
  );
  const stats = useMemo<RosterStats>(() => hitungStatistikRoster(entries), [entries]);
  const filtered = useMemo(
    () => (filter === 'semua' ? entries : entries.filter((item) => item.status === filter)),
    [entries, filter]
  );

  const simpanManual = async () => {
    if (!manualTarget) return;
    setSaving(true);
    const result = await createManualAttendance({
      sessionId,
      student: {
        id: manualTarget.studentId,
        nama: manualTarget.nama,
        nim: manualTarget.nim,
        kelas: manualTarget.kelas,
      },
      asprakUid,
      catatan,
    });
    setSaving(false);
    setFeedback({
      title: result.success ? 'Presensi Tercatat' : 'Presensi Ditolak',
      message: result.message,
    });
    if (result.success) {
      setManualTarget(null);
      setCatatan('');
      onRosterChange?.();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headingRow}>
        <Text style={styles.sectionTitle}>Roster Kehadiran</Text>
        <Text style={styles.sectionCount}>{stats.persentaseHadir}% hadir</Text>
      </View>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricHadir]}>
          <Text style={styles.metricValue}>{stats.hadir}</Text>
          <Text style={styles.metricLabel}>Hadir</Text>
        </View>
        <View style={[styles.metricCard, styles.metricTerlambat]}>
          <Text style={styles.metricValue}>{stats.terlambat}</Text>
          <Text style={styles.metricLabel}>Terlambat</Text>
        </View>
        <View style={[styles.metricCard, styles.metricIzin]}>
          <Text style={styles.metricValue}>{stats.izin}</Text>
          <Text style={styles.metricLabel}>Izin</Text>
        </View>
        <View style={[styles.metricCard, styles.metricBelum]}>
          <Text style={styles.metricValue}>{stats.belumHadir}</Text>
          <Text style={styles.metricLabel}>Belum Hadir</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count =
            item.key === 'semua'
              ? stats.total
              : item.key === 'belum-hadir'
                ? stats.belumHadir
                : stats[item.key];
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {item.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.note}>Izin tidak dihitung sebagai kehadiran.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.studentId}`}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.nama || 'P').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.nama}</Text>
              <Text style={styles.rowMeta}>
                {[item.nim && `NIM ${item.nim}`, item.kelas && `Kelas ${item.kelas}`]
                  .filter(Boolean)
                  .join(' · ') || 'Praktikan'}
              </Text>
              {item.menitTerlambat ? (
                <Text style={styles.rowLate}>Terlambat {item.menitTerlambat} menit</Text>
              ) : null}
              {item.alasanIzin ? (
                <Text style={styles.rowNote}>{item.alasanIzin}</Text>
              ) : null}
              {item.waktu ? <Text style={styles.rowTime}>{item.waktu} WIB</Text> : null}
            </View>
            <View style={styles.rowAction}>
              <StatusChip status={item.status} />
              {canManage && item.status === 'belum-hadir' ? (
                <Pressable
                  onPress={() => {
                    setManualTarget(item);
                    setCatatan('');
                  }}
                  style={({ pressed }) => [styles.manualButton, pressed && styles.pressed]}>
                  <Text style={styles.manualButtonText}>Catat Hadir</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Data Roster"
            message={
              filter === 'semua'
                ? 'Praktikan pada laboratorium ini belum tersedia.'
                : `Tidak ada praktikan berstatus ${filter}.`
            }
            actionText={filter !== 'semua' ? 'Tampilkan Semua' : undefined}
            onAction={filter !== 'semua' ? () => setFilter('semua') : undefined}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal transparent animationType="fade" visible={!!manualTarget} onRequestClose={() => setManualTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setManualTarget(null)} />
        <View style={styles.modalWrap} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catat Presensi Manual</Text>
            <Text style={styles.modalSubtitle}>
              {manualTarget?.nama} · {manualTarget?.nim || 'Tanpa NIM'}
            </Text>
            <Text style={styles.inputLabel}>Catatan wajib</Text>
            <TextInput
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={3}
              placeholder="Contoh: perangkat praktikan bermasalah, hadir di lab"
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
            />
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setManualTarget(null)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={simpanManual}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  saving && styles.disabled,
                ]}>
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Menyimpan...' : 'Simpan Presensi'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={!!feedback}
        title={feedback?.title ?? ''}
        description={feedback?.message}
        confirmText="Mengerti"
        onConfirm={() => setFeedback(null)}
        onCancel={() => setFeedback(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 24,
    gap: 10,
  },
  header: { gap: 12, paddingTop: 4 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    elevation: 1,
  },
  metricHadir: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  metricTerlambat: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  metricIzin: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  metricBelum: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2 },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },
  note: { fontSize: 11, color: '#64748B' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    elevation: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: '#0D9488' },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  rowMeta: { fontSize: 11, color: '#64748B' },
  rowLate: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  rowNote: { fontSize: 11, color: '#1D4ED8' },
  rowTime: { fontSize: 11, color: '#64748B' },
  rowAction: { alignItems: 'flex-end', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: '800' },
  manualButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#0D9488',
  },
  manualButtonText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.65)' },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  textInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#0D9488',
  },
  primaryButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
