import { Redirect, Tabs, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleHeader } from '@/components/role-header';
import {
  TabCalendarIcon,
  TabChartIcon,
  TabLocationPinIcon,
  TabMapIcon,
  TabUsersIcon,
} from '@/components/tab-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getHomeRouteByRole } from '@/utils/role';

export default function AslabLayout() {
  const { user, userDoc, loading, role } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.aslabAccent} />
        <Text style={styles.loadingText}>Memverifikasi akses Aslab...</Text>
      </View>
    );
  }

  if (!user || !userDoc) {
    return <Redirect href={'/login' as Href} />;
  }

  if (role !== 'aslab') {
    return <Redirect href={getHomeRouteByRole(role)} />;
  }

  const bottomPadding = Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 14) + 8;
  const tabHeight = Platform.OS === 'web' ? 58 : 56 + bottomPadding;

  return (
    <View style={styles.container}>
      <RoleHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.aslabAccent,
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
          name="dashboard"
          options={{
            title: 'Dasbor Aslab',
            tabBarLabel: 'Dasbor',
            tabBarIcon: ({ color, focused }) => (
              <TabChartIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal Sesi',
            tabBarLabel: 'Jadwal',
            tabBarIcon: ({ color, focused }) => (
              <TabCalendarIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="laboratorium"
          options={{
            title: 'Manajemen Laboratorium',
            tabBarLabel: 'Lab',
            tabBarIcon: ({ color, focused }) => (
              <TabLocationPinIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="anggota"
          options={{
            title: 'Anggota Lab',
            tabBarLabel: 'Anggota',
            tabBarIcon: ({ color, focused }) => (
              <TabUsersIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="peta-lab"
          options={{
            title: 'Peta Laboratorium',
            tabBarLabel: 'Peta Lab',
            tabBarIcon: ({ color, focused }) => (
              <TabMapIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="impor-lab"
          options={{
            href: null,
            title: 'Impor Laboratorium',
          }}
        />
        <Tabs.Screen
          name="impor-praktikan"
          options={{
            href: null,
            title: 'Impor Praktikan',
          }}
        />
        <Tabs.Screen
          name="impor-asprak"
          options={{
            href: null,
            title: 'Impor Asprak',
          }}
        />
        <Tabs.Screen
          name="pindah-anggota"
          options={{
            href: null,
            title: 'Pindah Lab Anggota',
          }}
        />
        <Tabs.Screen
          name="notifikasi"
          options={{
            href: null,
            title: 'Pusat Notifikasi',
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
    maxWidth: 640,
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
