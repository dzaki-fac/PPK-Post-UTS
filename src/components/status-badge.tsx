import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SesiStatus } from '@/types/praktikum';

interface StatusBadgeProps {
  status: SesiStatus | 'hadir' | 'belum-hadir';
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

function getStatusConfig(status: SesiStatus | 'hadir' | 'belum-hadir') {
  switch (status) {
    case 'dibuka':
      return {
        label: 'Dibuka',
        bg: '#DCFCE7', // Tailwind green-100
        border: '#86EFAC', // Tailwind green-300
        text: '#15803D', // Tailwind green-700
      };
    case 'belum-dibuka':
      return {
        label: 'Belum Dibuka',
        bg: '#FEF3C7', // Tailwind amber-100
        border: '#FDE68A', // Tailwind amber-300
        text: '#B45309', // Tailwind amber-700
      };
    case 'ditutup':
      return {
        label: 'Ditutup',
        bg: '#FEE2E2', // Tailwind red-100
        border: '#FCA5A5', // Tailwind red-300
        text: '#B91C1C', // Tailwind red-700
      };
    case 'hadir':
      return {
        label: 'Hadir',
        bg: '#DCFCE7',
        border: '#86EFAC',
        text: '#15803D',
      };
    case 'belum-hadir':
      return {
        label: 'Belum Hadir',
        bg: '#F3F4F6',
        border: '#E5E7EB',
        text: '#6B7280',
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
