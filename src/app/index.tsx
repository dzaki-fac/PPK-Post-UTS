import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { DUMMY_PRAKTIKAN as DAFTAR_PRAKTIKAN, DUMMY_ASISTEN as DAFTAR_ASISTEN } from '@/data/dummy';
import { Peran } from '@/data/types';
import { Praktikan, Asisten } from '@/types/praktikum';

export default function IndexScreen() {
  const { setPengguna } = usePraktikum();
  const [langkah, setLangkah] = useState<'pilih-peran' | 'pilih-identitas'>('pilih-peran');
  const [peranDipilih, setPeranDipilih] = useState<Peran>(null);

  const handlePilihPeran = (peran: Peran) => {
    if (!peran) return;
    setPeranDipilih(peran);
    setLangkah('pilih-identitas');
  };

  const handlePilihIdentitas = (identitas: Praktikan | Asisten) => {
    if (peranDipilih === 'praktikan') {
      setPengguna({ peran: 'praktikan', data: identitas as Praktikan });
      router.replace('/praktikan/jadwal' as Href);
    } else if (peranDipilih === 'asisten') {
      setPengguna({ peran: 'asisten', data: identitas as Asisten });
      router.replace('/asisten/jadwal');
    }
  };

  const handleKembali = () => {
    setLangkah('pilih-peran');
    setPeranDipilih(null);
  };

  if (langkah === 'pilih-identitas' && peranDipilih) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity onPress={handleKembali} style={styles.backButton}>
            <ThemedText type="defaultSemiBold" style={styles.backButtonText}>
              Kembali
            </ThemedText>
          </TouchableOpacity>

          <ThemedText type="title" style={styles.identityTitle}>
            Pilih Identitas
          </ThemedText>
          <ThemedText type="default" style={styles.identitySubtitle}>
            {peranDipilih === 'praktikan' ? 'Pilih nama Anda dari daftar praktikan:' : 'Pilih nama Anda dari daftar asisten:'}
          </ThemedText>

          <ScrollView contentContainerStyle={styles.list}>
            {peranDipilih === 'praktikan'
              ? DAFTAR_PRAKTIKAN.map((praktikan) => (
                  <TouchableOpacity
                    key={praktikan.id}
                    style={styles.card}
                    onPress={() => handlePilihIdentitas(praktikan)}
                  >
                    <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{praktikan.nama}</ThemedText>
                    <ThemedText type="small" style={styles.cardDetail}>NIM {praktikan.nim}  ·  Kelas {praktikan.kelas}</ThemedText>
                  </TouchableOpacity>
                ))
              : DAFTAR_ASISTEN.map((asisten) => (
                  <TouchableOpacity
                    key={asisten.id}
                    style={styles.card}
                    onPress={() => handlePilihIdentitas(asisten)}
                  >
                    <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{asisten.nama}</ThemedText>
                    <ThemedText type="small" style={styles.cardDetail}>Asisten praktikum</ThemedText>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <ThemedText type="smallBold" style={styles.eyebrow}>
              PORTAL PRAKTIKUM
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Presensi Praktikum
            </ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              Kelola kehadiran praktikum dengan alur yang sederhana.
            </ThemedText>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handlePilihPeran('praktikan')}
            >
              <ThemedText type="smallBold" style={styles.roleLabel}>PRAKTIKAN</ThemedText>
              <ThemedText type="subtitle" style={styles.roleTitle}>Masuk sebagai praktikan</ThemedText>
              <ThemedText type="small" style={styles.roleDescription}>Lihat jadwal dan lakukan presensi.</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handlePilihPeran('asisten')}
            >
              <ThemedText type="smallBold" style={styles.roleLabel}>ASISTEN</ThemedText>
              <ThemedText type="subtitle" style={styles.roleTitle}>Masuk sebagai asisten</ThemedText>
              <ThemedText type="small" style={styles.roleDescription}>Buka sesi dan pantau presensi.</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 42,
    lineHeight: 48,
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748B',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  eyebrow: {
    color: '#0D9488',
    letterSpacing: 1.5,
  },
  buttonContainer: {
    gap: Spacing.three,
  },
  roleButton: {
    padding: Spacing.four,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDFA',
    gap: Spacing.one,
  },
  roleLabel: {
    color: '#0D9488',
    letterSpacing: 1,
  },
  roleTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: '#134E4A',
  },
  roleDescription: {
    color: '#475569',
  },
  backButton: {
    alignSelf: 'flex-start',
    margin: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#F0FDFA',
  },
  backButtonText: {
    color: '#0D9488',
  },
  list: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
    gap: Spacing.one,
  },
  identityTitle: {
    alignSelf: 'center',
    fontSize: 36,
    lineHeight: 42,
  },
  identitySubtitle: {
    alignSelf: 'center',
    marginBottom: Spacing.two,
    color: '#64748B',
  },
  cardTitle: {
    color: '#134E4A',
  },
  cardDetail: {
    color: '#475569',
  },
});
