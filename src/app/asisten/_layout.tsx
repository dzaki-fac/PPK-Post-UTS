import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { RoleHeader } from '@/components/role-header';
import { usePraktikum } from '@/context/praktikum-context';

export default function AsistenLayout() {
  const { role, currentAsisten } = usePraktikum();

  // Route Guard: Redirect to portal landing if not authenticated as assistant
  if (role !== 'asisten' || !currentAsisten) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <RoleHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0D9488',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: [
            styles.tabBar,
            Platform.OS === 'web' && styles.tabBarWeb,
          ],
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal Praktikum',
            tabBarLabel: 'Kelola Sesi',
          }}
        />
        <Tabs.Screen
          name="moderasi-izin"
          options={{
            title: 'Moderasi Izin',
            tabBarLabel: 'Moderasi Izin',
          }}
        />
        <Tabs.Screen
          name="rekap"
          options={{
            title: 'Rekap Presensi',
            tabBarLabel: 'Rekap Kelas',
          }}
        />
        <Tabs.Screen
          name="mahasiswa"
          options={{
            title: 'Kelola Pengguna',
            tabBarLabel: 'Pengguna',
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarWeb: {
    maxWidth: 580,
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
