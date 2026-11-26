import { router, type Href } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';

// TODO(P2): Programmer 2 akan mengisi jadwal praktikum & pembuatan sesi per lab di sini.
export default function AslabJadwalPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <EmptyState
          title="Jadwal Sesi Lintas Lab"
          message="Modul penjadwalan praktikum lintas laboratorium oleh Aslab sedang disiapkan pada tahap integrasi berikutnya."
          actionText="Kelola Laboratorium"
          onAction={() => router.push('/aslab/laboratorium' as Href)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
  },
  inner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
});
