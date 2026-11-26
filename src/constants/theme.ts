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
  aslabAccent: '#4F46E5',
  aslabPrimary: '#4F46E5',
  aslabTint: '#EEF2FF',
  aslabBorder: '#C7D2FE',
  success: '#16A34A',
  warning: '#EAB308',
  error: '#DC2626',
  info: '#0D9488',
} as const;

export const RoleThemeColors = {
  praktikan: {
    accent: '#EA580C',
    tint: '#FFF7ED',
    border: '#FFEDD5',
  },
  asprak: {
    accent: '#0D9488',
    tint: '#F0FDFA',
    border: '#CCFBF1',
  },
  aslab: {
    accent: '#4F46E5',
    tint: '#EEF2FF',
    border: '#C7D2FE',
  },
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
