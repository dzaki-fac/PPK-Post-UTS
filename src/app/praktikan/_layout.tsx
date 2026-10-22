import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoleHeader } from '@/components/role-header';

export default function PraktikanLayout() {
  return (
    <View style={styles.container}>
      <RoleHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#EA580C', // LocalGuide Red-Orange
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
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
          name="riwayat"
          options={{
            title: 'Riwayat Kehadiran',
            tabBarLabel: 'Riwayat',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>📝</Text>
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
});
