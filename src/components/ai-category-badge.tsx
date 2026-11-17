import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';

import { AICategory } from '@/services/ai-service';

export interface AICategoryBadgeProps {
  category: AICategory | string;
  confidence: number; // 0.0 to 1.0 or 0 to 100
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'medium';
}

const CATEGORY_THEMES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Sakit: {
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FECACA',
  },
  Akademik: {
    bg: '#DBEAFE',
    text: '#2563EB',
    border: '#BFDBFE',
  },
  Keluarga: {
    bg: '#F3E8FF',
    text: '#7C3AED',
    border: '#E9D5FF',
  },
  Lainnya: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
  },
};

export function AICategoryBadge({
  category,
  confidence,
  style,
  size = 'medium',
}: AICategoryBadgeProps) {
  const normalizedCategory =
    CATEGORY_THEMES[category] ? (category as AICategory) : 'Lainnya';
  const theme = CATEGORY_THEMES[normalizedCategory];

  // Pastikan format persen 0-100%
  const percent =
    confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Rekomendasi AI: Kategori ${normalizedCategory}, keyakinan ${percent} persen`}>
      <Text
        style={[
          styles.text,
          {
            color: theme.text,
            fontSize: isSmall ? 10 : 12,
          },
        ]}>
        AI: {normalizedCategory} • {percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
