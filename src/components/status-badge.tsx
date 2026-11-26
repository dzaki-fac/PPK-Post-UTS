import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AttendanceStatus,
  FineStatus,
  PaymentStatus,
  SesiStatus,
} from '@/types/praktikum';

export type BadgeStatus =
  | SesiStatus
  | 'hadir'
  | 'belum-hadir'
  | AttendanceStatus
  | FineStatus
  | PaymentStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'small' | 'medium';
}

interface StatusStyleConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

function getStatusConfig(status: BadgeStatus): StatusStyleConfig {
  switch (status) {
    case 'dibuka':
      return { label: 'Dibuka', bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' };
    case 'belum-dibuka':
      return { label: 'Belum Dibuka', bg: '#FEF3C7', text: '#B45309', dot: '#D97706' };
    case 'ditutup':
      return { label: 'Ditutup', bg: '#F1F5F9', text: '#475569', dot: '#64748B' };
    case 'hadir':
      return { label: 'Hadir', bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' };
    case 'belum-hadir':
      return { label: 'Belum Hadir', bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' };
    case 'terlambat':
      return { label: 'Terlambat', bg: '#FEF3C7', text: '#B45309', dot: '#D97706' };
    case 'izin':
      return { label: 'Izin', bg: '#E0F2FE', text: '#0369A1', dot: '#0284C7' };
    case 'unpaid':
      return { label: 'Belum Dibayar', bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' };
    case 'pending':
      return { label: 'Menunggu', bg: '#FEF3C7', text: '#B45309', dot: '#D97706' };
    case 'paid':
      return { label: 'Lunas', bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' };
    case 'success':
      return { label: 'Berhasil', bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' };
    case 'failed':
      return { label: 'Gagal', bg: '#FEE2E2', text: '#B91C1C', dot: '#DC2626' };
  }
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const cfg = getStatusConfig(status);
  const small = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        small ? styles.badgeSmall : styles.badgeMedium,
        { backgroundColor: cfg.bg },
      ]}>
      <View
        style={[
          styles.dot,
          small ? styles.dotSmall : styles.dotMedium,
          { backgroundColor: cfg.dot },
        ]}
      />
      <Text
        style={[
          styles.label,
          small ? styles.labelSmall : styles.labelMedium,
          { color: cfg.text },
        ]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
  dotSmall: {
    width: 6,
    height: 6,
  },
  dotMedium: {
    width: 7,
    height: 7,
  },
  label: {
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 11,
  },
  labelMedium: {
    fontSize: 12,
  },
});
