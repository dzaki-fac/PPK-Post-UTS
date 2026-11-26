import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AttendanceStatus, FineStatus, PaymentStatus, SesiStatus } from '@/types/praktikum';

export type BadgeStatusType =
  | SesiStatus
  | AttendanceStatus
  | FineStatus
  | PaymentStatus
  | 'belum-hadir';

interface StatusBadgeProps {
  status: BadgeStatusType;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        isSmall && styles.badgeSmall,
      ]}>
      <Text
        style={[
          styles.label,
          { color: config.text },
          isSmall && styles.labelSmall,
        ]}>
        {config.label}
      </Text>
    </View>
  );
}

function getStatusConfig(status: BadgeStatusType) {
  switch (status) {
    case 'dibuka':
      return {
        label: 'Dibuka',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    case 'belum-dibuka':
      return {
        label: 'Belum Dibuka',
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#B45309',
      };
    case 'ditutup':
      return {
        label: 'Ditutup',
        bg: '#FEE2E2',
        border: '#FCA5A5',
        text: '#B91C1C',
      };
    case 'hadir':
      return {
        label: 'Hadir',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    case 'terlambat':
      return {
        label: 'Terlambat',
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#B45309',
      };
    case 'izin':
      return {
        label: 'Izin',
        bg: '#DBEAFE',
        border: '#93C5FD',
        text: '#1D4ED8',
      };
    case 'unpaid':
      return {
        label: 'Belum Dibayar',
        bg: '#FEE2E2',
        border: '#FCA5A5',
        text: '#B91C1C',
      };
    case 'pending':
      return {
        label: 'Menunggu Pembayaran',
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#B45309',
      };
    case 'paid':
      return {
        label: 'Lunas',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    case 'success':
      return {
        label: 'Berhasil',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    case 'failed':
      return {
        label: 'Gagal',
        bg: '#FEE2E2',
        border: '#FCA5A5',
        text: '#B91C1C',
      };
    case 'belum-hadir':
      return {
        label: 'Belum Hadir',
        bg: '#F1F5F9',
        border: '#CBD5E1',
        text: '#64748B',
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 11,
  },
});
