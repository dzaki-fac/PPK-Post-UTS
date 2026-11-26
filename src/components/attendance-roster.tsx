import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { formatDistanceMeters } from '@/services/location-service';
import { AttendanceStatus } from '@/types/praktikum';

export type RosterFilterType = 'semua' | 'hadir' | 'terlambat' | 'izin' | 'belum-hadir';

export interface AttendanceRosterRow {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  attendanceStatus?: AttendanceStatus;
  lateMinutes?: number;
  waktuHadir?: string;
  distanceMeters?: number;
  verificationMethod?: 'code-location' | 'qr-location' | 'manual-asprak' | 'leave-approved';
  leaveStatus?: 'menunggu' | 'disetujui' | 'ditolak';
  aiCategory?: string;
}

interface AttendanceRosterProps {
  kelasLabel: string;
  rows: AttendanceRosterRow[];
  totalIzinMenunggu: number;
  onManualAttend?: (row: AttendanceRosterRow, note: string) => Promise<void>;
}

export function AttendanceRoster({
  kelasLabel,
  rows,
  totalIzinMenunggu,
  onManualAttend,
}: AttendanceRosterProps) {
  const [filter, setFilter] = useState<RosterFilterType>('semua');
  const [manualTarget, setManualTarget] = useState<AttendanceRosterRow | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  const counts = useMemo(() => {
    const hadir = rows.filter((r) => r.attendanceStatus === 'hadir').length;
    const terlambat = rows.filter((r) => r.attendanceStatus === 'terlambat').length;
    const izin = rows.filter(
      (r) => r.attendanceStatus === 'izin' || r.leaveStatus === 'disetujui'
    ).length;
    const belumHadir = rows.filter(
      (r) => !r.attendanceStatus && r.leaveStatus !== 'disetujui'
    ).length;
    return {
      total: rows.length,
      hadir,
      terlambat,
      izin,
      belumHadir,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'hadir') return rows.filter((r) => r.attendanceStatus === 'hadir');
    if (filter === 'terlambat') return rows.filter((r) => r.attendanceStatus === 'terlambat');
    if (filter === 'izin') {
      return rows.filter(
        (r) =>
          r.attendanceStatus === 'izin' ||
          r.leaveStatus === 'disetujui' ||
          r.leaveStatus === 'menunggu'
      );
    }
    if (filter === 'belum-hadir') {
      return rows.filter((r) => !r.attendanceStatus && r.leaveStatus !== 'disetujui');
    }
    return rows;
  }, [rows, filter]);

  const handleSubmitManual = async () => {
    if (!manualTarget || !onManualAttend) return;
    setManualError(null);
    if (manualNote.trim().length < 3) {
      setManualError('Catatan alasan presensi manual wajib diisi minimal 3 karakter.');
      return;
    }
    setSavingManual(true);
    try {
      await onManualAttend(manualTarget, manualNote.trim());
      setManualTarget(null);
      setManualNote('');
    } catch (err) {
      setManualError(
        err instanceof Error ? err.message : 'Gagal mencatat presensi manual.'
      );
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionHeader}>Daftar Kehadiran Mahasiswa</Text>
        <Text style={styles.rosterSubtitle}>
          {kelasLabel} • {counts.hadir} hadir • {counts.terlambat} terlambat •{' '}
          {counts.izin} izin (excused) dari {counts.total} praktikan
        </Text>
      </View>

      {totalIzinMenunggu > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/moderasi-izin')}
          style={({ pressed }) => [styles.izinBanner, pressed && styles.pressed]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.izinBannerTitle}>
              {totalIzinMenunggu} Pengajuan Izin Menunggu Keputusan
            </Text>
            <Text style={styles.izinBannerSub}>
              Ketuk untuk meninjau rekomendasi AI dan menetapkan persetujuan izin.
            </Text>
          </View>
          <Text style={styles.izinBannerAction}>Periksa →</Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}>
        {(
          [
            { key: 'semua', label: `Semua (${counts.total})` },
            { key: 'hadir', label: `Hadir (${counts.hadir})` },
            { key: 'terlambat', label: `Terlambat (${counts.terlambat})` },
            { key: 'izin', label: `Izin (${counts.izin})` },
            { key: 'belum-hadir', label: `Belum Hadir (${counts.belumHadir})` },
          ] as const
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredRows.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Roster"
          message="Tidak ditemukan praktikan yang cocok dengan filter status kehadiran saat ini."
        />
      ) : (
        <View style={styles.list}>
          {filteredRows.map((item) => {
            const canManualAttend =
              Boolean(onManualAttend) &&
              !item.attendanceStatus &&
              item.leaveStatus !== 'disetujui';

            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.meta}>
                  <Text style={styles.name}>{item.nama}</Text>
                  <Text style={styles.sub}>
                    NIM: {item.nim} • Kelas {item.kelas}
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  {item.attendanceStatus === 'hadir' ? (
                    <View style={[styles.badge, styles.badgeHadir]}>
                      <Text style={[styles.badgeTitle, { color: '#15803D' }]}>Hadir</Text>
                      {item.waktuHadir ? (
                        <Text style={styles.badgeMeta}>
                          {item.waktuHadir.includes(',')
                            ? item.waktuHadir.split(',')[1]?.trim()
                            : item.waktuHadir}
                        </Text>
                      ) : null}
                      {item.verificationMethod === 'manual-asprak' ? (
                        <Text style={styles.badgeMeta}>Manual Asprak</Text>
                      ) : item.distanceMeters !== undefined ? (
                        <Text style={styles.badgeMeta}>
                          {formatDistanceMeters(item.distanceMeters)} •{' '}
                          {item.verificationMethod === 'qr-location' ? 'QR+GPS' : 'GPS'}
                        </Text>
                      ) : null}
                    </View>
                  ) : item.attendanceStatus === 'terlambat' ? (
                    <View style={[styles.badge, styles.badgeTerlambat]}>
                      <Text style={[styles.badgeTitle, { color: '#B45309' }]}>
                        Terlambat{item.lateMinutes !== undefined ? ` (+${item.lateMinutes} mnt)` : ''}
                      </Text>
                      {item.waktuHadir ? (
                        <Text style={[styles.badgeMeta, { color: '#92400E' }]}>
                          {item.waktuHadir.includes(',')
                            ? item.waktuHadir.split(',')[1]?.trim()
                            : item.waktuHadir}
                        </Text>
                      ) : null}
                    </View>
                  ) : item.attendanceStatus === 'izin' || item.leaveStatus === 'disetujui' ? (
                    <View style={[styles.badge, styles.badgeIzin]}>
                      <Text style={[styles.badgeTitle, { color: '#1D4ED8' }]}>
                        Tidak Hadir dengan Izin
                      </Text>
                      {item.aiCategory ? (
                        <Text style={[styles.badgeMeta, { color: '#1E40AF' }]}>
                          AI: {item.aiCategory}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.unattendedCol}>
                      <View style={[styles.badge, styles.badgeBelum]}>
                        <Text style={[styles.badgeTitle, { color: '#475569' }]}>
                          {item.leaveStatus === 'menunggu'
                            ? 'Menunggu Izin'
                            : item.leaveStatus === 'ditolak'
                            ? 'Belum Hadir (Izin Ditolak)'
                            : 'Belum Hadir'}
                        </Text>
                      </View>
                      {canManualAttend ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setManualTarget(item);
                            setManualNote('');
                            setManualError(null);
                          }}
                          style={({ pressed }) => [styles.manualBtn, pressed && styles.pressed]}>
                          <Text style={styles.manualBtnText}>Catat Manual</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Modal Presensi Manual Asprak */}
      <Modal
        visible={Boolean(manualTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => !savingManual && setManualTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catat Presensi Manual</Text>
            <Text style={styles.modalSub}>
              {manualTarget?.nama} ({manualTarget?.nim}) akan dicatat berstatus Hadir oleh Asprak tanpa menerbitkan denda.
            </Text>

            {manualError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{manualError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Catatan / Alasan (Wajib)</Text>
            <TextInput
              style={styles.input}
              value={manualNote}
              onChangeText={setManualNote}
              placeholder="Contoh: Kendala perangkat / GPS mahasiswa diverifikasi di lab"
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setManualTarget(null)}
                disabled={savingManual}
                style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitManual}
                disabled={savingManual}
                style={styles.confirmBtn}>
                {savingManual ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Simpan Hadir</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 3,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  rosterSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  izinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  izinBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  izinBannerSub: {
    fontSize: 11.5,
    color: '#B45309',
    marginTop: 2,
  },
  izinBannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  tabBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  sub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  unattendedCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  badgeHadir: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  badgeTerlambat: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeIzin: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  badgeBelum: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  badgeTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  badgeMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
    marginTop: 1,
  },
  manualBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    justifyContent: 'center',
  },
  manualBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
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
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
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
  },
  input: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
