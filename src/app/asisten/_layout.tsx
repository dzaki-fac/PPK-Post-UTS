import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';

export default function AsistenLayout() {
  const { pengguna } = usePraktikum();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#0D9488',
          headerShown: true,
          headerTitleAlign: 'center',
          headerRight: () => (
            pengguna?.peran === 'asisten' ? (
              <ThemedText type="small" style={styles.headerRight}>
                👤 {pengguna.data.nama}
              </ThemedText>
            ) : null
          ),
        }}
      >
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal',
            tabBarIcon: ({ color }) => (
              <ThemedText style={{ color }}>📅</ThemedText>
            ),
          }}
        />
        <Tabs.Screen
          name="rekap"
          options={{
            title: 'Rekap',
            tabBarIcon: ({ color }) => (
              <ThemedText style={{ color }}>📊</ThemedText>
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
    </>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    marginRight: Spacing.three,
  },
});
