import { router, Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';

export default function PraktikanLayout() {
  const { pengguna, logout } = usePraktikum();

  const handleGantiPengguna = () => {
    logout();
    router.replace('/');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTitleAlign: 'center',
        headerTitleStyle: styles.headerTitle,
        headerRight: () =>
          pengguna?.peran === 'praktikan' ? (
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
          ) : null,
      }}
    >
      <Tabs.Screen name="jadwal" options={{ title: 'Jadwal' }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Riwayat' }} />
      <Tabs.Screen name="detail-sesi/[id]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
  },
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
    backgroundColor: '#F0FDFA',
  },
  logoutText: {
    color: '#0D9488',
  },
});
