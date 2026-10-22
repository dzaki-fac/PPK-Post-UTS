import { router, Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';

export default function AsistenLayout() {
  const { pengguna, logout } = usePraktikum();

  const handleGantiPengguna = () => {
    logout();
    router.replace('/');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#EA580C',
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
          },
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#111827',
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerRight: () => (
            pengguna?.peran === 'asisten' ? (
              <View style={styles.headerActions}>
                <ThemedText type="small" style={styles.userName}>
                  {pengguna.data.nama}
                </ThemedText>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={handleGantiPengguna}
                  style={styles.logoutButton}
                >
                  <ThemedText type="smallBold" style={styles.logoutText}>
                    Ganti pengguna
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : null
          ),
        }}
      >
        <Tabs.Screen
          name="jadwal"
          options={{
            title: 'Jadwal',
          }}
        />
        <Tabs.Screen
          name="rekap"
          options={{
            title: 'Rekap',
          }}
        />
        <Tabs.Screen
          name="detail-sesi/[id]"
          options={{
            href: null,
            title: 'Detail Sesi',
            headerShown: false,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: Spacing.three,
  },
  userName: {
    color: '#475569',
  },
  logoutButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    backgroundColor: '#FFF7ED',
  },
  logoutText: {
    color: '#EA580C',
  },
});
