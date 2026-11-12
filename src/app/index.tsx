import { Redirect, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function IndexScreen() {
  const { user, userDoc, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>PPK</Text>
        </View>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat sesi PPK LabPortal...</Text>
      </View>
    );
  }

  if (user && userDoc && role === 'asisten') {
    return <Redirect href={'/asisten/jadwal' as Href} />;
  }

  if (user && userDoc && role === 'praktikan') {
    return <Redirect href={'/praktikan/jadwal' as Href} />;
  }

  return <Redirect href={'/login' as Href} />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.6,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
