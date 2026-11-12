import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { Sesi, SessionDocument } from '@/types/praktikum';

interface SesiCardProps {
  sesi: Sesi | SessionDocument;
  isHadir?: boolean;
  waktuHadir?: string;
  totalHadir?: number;
  role?: 'praktikan' | 'asisten';
  onPress: () => void;
}

export function SesiCard({
  sesi,
  isHadir,
  waktuHadir,
  totalHadir,
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
              <View style={styles.miniDotAsisten} />
              <Text style={styles.attendanceCountText}>
                {totalHadir !== undefined ? `${totalHadir} Mahasiswa Hadir` : 'Kelola Kehadiran'}
              </Text>
            </View>
            {sesi.status === 'dibuka' && sesi.kodeSesi ? (
              <View style={styles.codePill}>
                <Text style={styles.codePillLabel}>Kode:</Text>
                <Text style={styles.codePillValue}>{sesi.kodeSesi}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.actionHint}>Kelola sesi →</Text>
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
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  asistenFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  miniDotAsisten: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  attendanceCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
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
});
