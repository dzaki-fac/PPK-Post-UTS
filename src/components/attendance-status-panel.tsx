/**
 * Panel status presensi (Sprint 4 / Programmer 3) pada halaman presensi praktikan.
 * Menampilkan: izin, hasil sementara ("Memverifikasi"), Hadir Tepat Waktu, atau Terlambat + denda.
 */

import { router, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PAYMENT_COLORS } from '@/components/payment-ui';
import type { AttendanceDocument } from '@/types/praktikum';

export function AttendanceStatusPanel({ attendance }: { attendance: AttendanceDocument | null }) {
  if (!attendance) return null;

  const status = attendance.attendanceStatus ?? 'hadir';

  if (status === 'izin') {
    return (
      <View style={[styles.box, { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }]}>
        <Text style={[styles.title, { color: '#1E40AF' }]}>Anda tercatat izin pada sesi ini</Text>
        <Text style={styles.body}>
          Izin tidak dihitung sebagai hadir dan tidak dikenai denda keterlambatan.
        </Text>
      </View>
    );
  }

  const lateness = attendance.lateness;
  const isVerifying = !lateness || lateness.evaluatedBy !== 'server';

  if (isVerifying) {
    return (
      <View style={[styles.box, { backgroundColor: PAYMENT_COLORS.warning.bg, borderColor: '#FDE68A' }]}>
        <Text style={[styles.title, { color: PAYMENT_COLORS.warning.text }]}>● Memverifikasi</Text>
        <Text style={styles.body}>
          Status kehadiran sedang diverifikasi server menggunakan waktu resmi. Hasil akhir akan
          tampil dalam beberapa detik.
        </Text>
      </View>
    );
  }

  if (status === 'terlambat') {
    return (
      <View style={[styles.box, { backgroundColor: PAYMENT_COLORS.danger.bg, borderColor: '#FECACA' }]}>
        <Text style={[styles.title, { color: PAYMENT_COLORS.danger.text }]}>
          Terlambat {lateness.minutesAfterStart} menit
        </Text>
        <Text style={styles.body}>
          Presensi melewati toleransi {lateness.graceMinutes} menit. Tagihan denda diterbitkan untuk
          kejadian ini.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              (attendance.fineId
                ? `/praktikan/tagihan/${attendance.fineId}`
                : '/praktikan/tagihan') as Href
            )
          }
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>Lihat Tagihan →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: PAYMENT_COLORS.success.bg, borderColor: '#BBF7D0' }]}>
      <Text style={[styles.title, { color: PAYMENT_COLORS.success.text }]}>Hadir Tepat Waktu</Text>
      <Text style={styles.body}>Presensi dicatat sebelum batas toleransi. Tidak ada denda.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: '800' },
  body: { fontSize: 12.5, lineHeight: 18, color: PAYMENT_COLORS.textSecondary },
  action: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: PAYMENT_COLORS.accent,
    marginTop: 4,
  },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
