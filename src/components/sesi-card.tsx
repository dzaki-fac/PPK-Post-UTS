import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { Sesi } from '@/types/praktikum';

interface SesiCardProps {
  sesi: Sesi;
  isHadir?: boolean;
  waktuHadir?: string;
  onPress: () => void;
}

export function SesiCard({ sesi, isHadir, waktuHadir, onPress }: SesiCardProps) {
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
          <Text style={styles.metaIcon}>📅</Text>
          <Text style={styles.metaText}>{sesi.tanggal}</Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>⏰</Text>
          <Text style={styles.metaText}>
            {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
          </Text>
        </View>
      </View>

      {sesi.ruang ? (
        <View style={styles.locationRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.locationText}>{sesi.ruang}</Text>
        </View>
      ) : null}

      {/* Attendance status banner if student already attended */}
      {isHadir ? (
        <View style={styles.attendanceBanner}>
          <Text style={styles.attendanceIcon}>✓</Text>
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
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    alignItems: 'flex-start',
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#475569',
  },
  materiText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
  },
  attendanceBanner: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendanceIcon: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: 'bold',
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
    color: '#166534',
    marginTop: 1,
  },
});
