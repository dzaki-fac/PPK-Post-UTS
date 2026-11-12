import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { Sesi, SessionDocument } from '@/types/praktikum';

interface SesiCardProps {
  sesi: Sesi | SessionDocument;
  isHadir?: boolean;
  waktuHadir?: string;
  totalHadir?: number;
  totalIzin?: number;
  leaveStatus?: 'menunggu' | 'disetujui' | 'ditolak';
  leaveCategory?: string;
  role?: 'praktikan' | 'asisten';
  onPress: () => void;
}

export function SesiCard({
  sesi,
  isHadir,
  waktuHadir,
  totalHadir,
  totalIzin,
  leaveStatus,
  leaveCategory,
  role = 'praktikan',
  onPress,
}: SesiCardProps) {
  const isAsisten = role === 'asisten';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sesi ${sesi.praktikum}, status ${sesi.status}`}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.praktikumTitle} numberOfLines={1}>
            {sesi.praktikum}
          </Text>
          <View style={styles.kelasChip}>
            <Text style={styles.kelasText}>{sesi.kelas}</Text>
          </View>
        </View>
        <StatusBadge status={sesi.status} />
      </View>

      {sesi.materi ? (
        <Text style={styles.materiText} numberOfLines={2}>
          {sesi.materi}
        </Text>
      ) : null}

      <View style={styles.metaDivider} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Tanggal:</Text>
          <Text style={styles.metaText}>{sesi.tanggal}</Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Waktu:</Text>
          <Text style={styles.metaText}>
            {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
          </Text>
        </View>
      </View>

      {sesi.ruang ? (
        <View style={styles.locationRow}>
          <Text style={styles.metaLabel}>Ruang:</Text>
          <Text style={styles.locationText}>{sesi.ruang}</Text>
        </View>
      ) : null}

      {/* Asisten metadata banner */}
      {isAsisten ? (
        <View style={styles.asistenFooter}>
          <View style={styles.asistenFooterLeft}>
            <View style={styles.attendanceCountBadge}>
              <Text style={styles.attendanceCountText}>
                {totalHadir !== undefined ? `${totalHadir} Hadir` : 'Kelola'}
              </Text>
            </View>
            {totalIzin && totalIzin > 0 ? (
              <View style={styles.izinCountBadge}>
                <Text style={styles.izinCountText}>{totalIzin} Izin</Text>
              </View>
            ) : null}
            {sesi.status === 'dibuka' && sesi.kodeSesi ? (
              <View style={styles.codePill}>
                <Text style={styles.codePillLabel}>Kode:</Text>
                <Text style={styles.codePillValue}>{sesi.kodeSesi}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actionHintWrap}>
            <Text style={styles.actionHint}>Kelola sesi →</Text>
          </View>
        </View>
      ) : null}

      {/* Praktikan attendance banner if student already attended */}
      {!isAsisten && isHadir ? (
        <View style={styles.attendanceBanner}>
          <View style={styles.attendanceTag}>
            <Text style={styles.attendanceTagText}>TERVERIFIKASI</Text>
          </View>
          <View style={styles.attendanceTextWrap}>
            <Text style={styles.attendanceTitle}>Sudah Presensi</Text>
            {waktuHadir ? (
              <Text style={styles.attendanceSub}>{waktuHadir}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Praktikan leave status banner if student filed leave */}
      {!isAsisten && !isHadir && leaveStatus ? (
        <View
          style={[
            styles.leaveBanner,
            leaveStatus === 'disetujui' && styles.leaveBannerApproved,
            leaveStatus === 'menunggu' && styles.leaveBannerPending,
            leaveStatus === 'ditolak' && styles.leaveBannerRejected,
          ]}>
          <View
            style={[
              styles.leaveTag,
              leaveStatus === 'disetujui' && styles.leaveTagApproved,
              leaveStatus === 'menunggu' && styles.leaveTagPending,
              leaveStatus === 'ditolak' && styles.leaveTagRejected,
            ]}>
            <Text
              style={[
                styles.leaveTagText,
                leaveStatus === 'disetujui' && styles.leaveTagTextApproved,
                leaveStatus === 'menunggu' && styles.leaveTagTextPending,
                leaveStatus === 'ditolak' && styles.leaveTagTextRejected,
              ]}>
              {leaveStatus === 'disetujui'
                ? 'IZIN DISETUJUI'
                : leaveStatus === 'menunggu'
                ? 'MENUNGGU VERIFIKASI'
                : 'IZIN DITOLAK'}
            </Text>
          </View>
          <View style={styles.attendanceTextWrap}>
            <Text
              style={[
                styles.leaveTitle,
                leaveStatus === 'disetujui' && { color: '#1E40AF' },
                leaveStatus === 'menunggu' && { color: '#92400E' },
                leaveStatus === 'ditolak' && { color: '#991B1B' },
              ]}>
              {leaveStatus === 'disetujui'
                ? 'Pengajuan Izin Disetujui'
                : leaveStatus === 'menunggu'
                ? 'Izin Dalam Pemeriksaan Asisten'
                : 'Izin Tidak Disetujui'}
            </Text>
            {leaveCategory ? (
              <Text style={styles.leaveSub}>Kategori AI: {leaveCategory}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
    borderColor: '#CBD5E1',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  praktikumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  kelasChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kelasText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  materiText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 19,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  asistenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  asistenFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  codePillLabel: {
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '600',
  },
  codePillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 1,
  },
  attendanceCountBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  attendanceCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  izinCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  izinCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  actionHintWrap: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  actionHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  attendanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  attendanceTag: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attendanceTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  attendanceTextWrap: {
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  attendanceSub: {
    fontSize: 11,
    color: '#16A34A',
    marginTop: 1,
  },
  leaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  leaveBannerApproved: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  leaveBannerPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  leaveBannerRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  leaveTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaveTagApproved: {
    backgroundColor: '#2563EB',
  },
  leaveTagPending: {
    backgroundColor: '#D97706',
  },
  leaveTagRejected: {
    backgroundColor: '#DC2626',
  },
  leaveTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  leaveTagTextApproved: {},
  leaveTagTextPending: {},
  leaveTagTextRejected: {},
  leaveTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  leaveSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
