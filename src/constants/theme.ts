/**
 * Below are the colors that are used in the app (light mode only).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  text: '#0F172A',
  background: '#FFFFFF',
  backgroundElement: '#F1F5F9',
  backgroundSelected: '#FFEDD5',
  textSecondary: '#64748B',
  tint: '#EA580C',
  tintSecondary: '#0D9488',
  tintTertiary: '#EAB308',
  success: '#16A34A',
  warning: '#EAB308',
  error: '#DC2626',
  info: '#0D9488',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
