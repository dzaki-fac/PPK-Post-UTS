import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { RoleHeader } from '@/components/role-header';

export default function AsistenLayout() {
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
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal Praktikum',
            tabBarLabel: 'Jadwal',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>📅</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="rekap"
          options={{
            title: 'Rekap Presensi',
            tabBarLabel: 'Rekap',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>📊</Text>
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
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 'auto',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
});
