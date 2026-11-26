import { router, type Href } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';

// TODO(P2): Programmer 2 akan mengisi peta status real-time seluruh laboratorium di sini.
export default function AslabPetaLabPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <EmptyState
          title="Monitoring Peta Laboratorium"
          message="Pemantauan peta status real-time seluruh laboratorium oleh Aslab akan dihubungkan pada tahap integrasi sesi."
          actionText="Lihat Daftar Lab"
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
