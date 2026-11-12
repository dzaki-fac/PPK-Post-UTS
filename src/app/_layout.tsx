import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { PraktikumProvider } from '@/context/praktikum-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'PPK LabPortal';
    }
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <PraktikumProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <AnimatedSplashOverlay />
          </PraktikumProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
