import { Redirect, Tabs, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleHeader } from '@/components/role-header';
import {
  TabCalendarIcon,
  TabDocumentIcon,
  TabHistoryIcon,
} from '@/components/tab-icons';
import { useAuth } from '@/context/auth-context';

export default function PraktikanLayout() {
  const { user, userDoc, loading, role } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memverifikasi akses praktikan...</Text>
      </View>
    );
  }

  if (!user || !userDoc) {
    return <Redirect href={'/login' as Href} />;
  }

  if (role !== 'praktikan') {
    return <Redirect href={'/asisten/jadwal' as Href} />;
  }

  const bottomPadding = Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 14) + 8;
  const tabHeight = Platform.OS === 'web' ? 58 : 56 + bottomPadding;

  return (
    <View style={styles.container}>
      <RoleHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#EA580C',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: [
            styles.tabBar,
            {
              height: tabHeight,
              paddingBottom: bottomPadding,
              paddingTop: 6,
            },
            Platform.OS === 'web' && styles.tabBarWeb,
          ],
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 3,
            paddingBottom: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '700',
            marginTop: 1.5,
            marginBottom: Platform.OS === 'android' ? 2 : 0,
          },
        }}>
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal Praktikum',
            tabBarLabel: 'Jadwal Sesi',
            tabBarIcon: ({ color, focused }) => (
              <TabCalendarIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="pengajuan-izin"
          options={{
            title: 'Pengajuan Izin',
            tabBarLabel: 'Ajukan Izin',
            tabBarIcon: ({ color, focused }) => (
              <TabDocumentIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="riwayat"
          options={{
            title: 'Riwayat Kehadiran',
            tabBarLabel: 'Riwayat Presensi',
            tabBarIcon: ({ color, focused }) => (
              <TabHistoryIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="detail-sesi/[id]"
          options={{
            href: null,
            title: 'Detail Sesi',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
  },
  tabBarWeb: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 'auto',
    position: 'absolute',
    bottom: 20,
    borderRadius: 24,
    height: 58,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    paddingBottom: 6,
    paddingTop: 6,
  },
});
