import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_FINE_AMOUNT, DEFAULT_GRACE_MINUTES } from '@/constants/praktikum-config';
import { Colors } from '@/constants/theme';
import { LabStatusCardItem } from '@/services/dashboard-service';
import { formatRupiah } from '@/utils/format';

interface LabStatusCardProps {
  item: LabStatusCardItem;
}

export function LabStatusCard({ item }: LabStatusCardProps) {
  const { lab, state, praktikanCount, asprakCount, activeSession, nextSession, attendanceProgress } =
    item;

  const badgeStyle =
    state === 'berlangsung'
      ? { bg: '#DCFCE7', border: '#86EFAC', dot: '#16A34A', text: '#15803D', label: 'Berlangsung' }
      : state === 'terjadwal'
      ? { bg: '#DBEAFE', border: '#93C5FD', dot: '#2563EB', text: '#1D4ED8', label: 'Terjadwal' }
      : {
          bg: '#F1F5F9',
          border: '#CBD5E1',
          dot: '#64748B',
          text: '#475569',
          label: 'Tidak Ada Kegiatan',
        };

  const featuredSession = activeSession ?? nextSession;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.labName} numberOfLines={1}>
            {lab.nama}
          </Text>
          <View style={styles.codeChip}>
            <Text style={styles.codeText}>{lab.kode}</Text>
          </View>
        </View>
        <View
          style={[
            styles.stateBadge,
            { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
          ]}>
          <Text style={[styles.stateDot, { color: badgeStyle.dot }]}>●</Text>
          <Text style={[styles.stateLabel, { color: badgeStyle.text }]}>{badgeStyle.label}</Text>
        </View>
      </View>

      <Text style={styles.locationText}>
        {lab.gedung}
        {lab.courseNama ? ` • ${lab.courseNama}` : ''}
      </Text>

      <View style={styles.metricsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{praktikanCount}</Text>
          <Text style={styles.statLabel}>Praktikan</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{asprakCount}</Text>
          <Text style={styles.statLabel}>Asprak</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{lab.radiusMeter} m</Text>
          <Text style={styles.statLabel}>Radius</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{lab.graceMinutes ?? DEFAULT_GRACE_MINUTES} mnt</Text>
          <Text style={styles.statLabel}>Grace</Text>
        </View>
      </View>

      {featuredSession ? (
        <View
          style={[
            styles.sessionBox,
            state === 'berlangsung' ? styles.sessionBoxActive : styles.sessionBoxNext,
          ]}>
          <Text style={styles.sessionBoxTag}>
            {state === 'berlangsung' ? 'SESI SEDANG BERLANGSUNG' : 'JADWAL BERIKUTNYA'}
          </Text>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {featuredSession.praktikum} • {featuredSession.kelas}
          </Text>
          {featuredSession.materi ? (
            <Text style={styles.sessionMateri} numberOfLines={1}>
              {featuredSession.materi}
            </Text>
          ) : null}
          <Text style={styles.sessionTime}>
            {featuredSession.tanggal} • {featuredSession.waktuMulai} - {featuredSession.waktuSelesai} WIB
          </Text>

          {attendanceProgress ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Kehadiran Sesi Berjalan</Text>
                <Text style={styles.progressValue}>
                  {attendanceProgress.presentCount}/{attendanceProgress.totalCount} ({attendanceProgress.percent}%)
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, attendanceProgress.percent)}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.idleBox}>
          <Text style={styles.idleText}>
            Belum ada sesi berlangsung atau terjadwal pada laboratorium ini. Denda keterlambatan:{' '}
            {formatRupiah(lab.fineAmount ?? DEFAULT_FINE_AMOUNT)}.
          </Text>
        </View>
      )}
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
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  labName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  codeChip: {
    backgroundColor: Colors.aslabTint,
    borderColor: Colors.aslabBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.aslabPrimary,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  stateDot: {
    fontSize: 9,
  },
  stateLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flex: 1,
    minWidth: 72,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  sessionBox: {
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    gap: 4,
  },
  sessionBoxActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  sessionBoxNext: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  sessionBoxTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.4,
  },
  sessionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sessionMateri: {
    fontSize: 12,
    color: '#475569',
  },
  sessionTime: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  progressWrap: {
    marginTop: 6,
    gap: 5,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  idleBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idleText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});
