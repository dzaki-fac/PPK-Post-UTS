import { router } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePraktikum } from '@/context/praktikum-context';
import { DAFTAR_PRAKTIKAN, DAFTAR_ASISTEN } from '@/data';
import { Peran, Praktikan, Asisten } from '@/data/types';

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
      router.replace('/praktikan/jadwal');
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
            <ThemedText type="defaultSemiBold">← Kembali</ThemedText>
          </TouchableOpacity>

          <ThemedText type="title" style={styles.title}>
            Pilih Identitas
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            {peranDipilih === 'praktikan' ? 'Pilih nama Anda dari daftar praktikan:' : 'Pilih nama Anda dari daftar asisten:'}
          </ThemedText>

          <View style={styles.list}>
            {peranDipilih === 'praktikan'
              ? DAFTAR_PRAKTIKAN.map((praktikan) => (
                  <TouchableOpacity
                    key={praktikan.id}
                    style={styles.card}
                    onPress={() => handlePilihIdentitas(praktikan)}
                  >
                    <ThemedText type="defaultSemiBold">{praktikan.nama}</ThemedText>
                    <ThemedText type="small">NIM: {praktikan.nim}</ThemedText>
                    <ThemedText type="small">Kelas: {praktikan.kelas}</ThemedText>
                  </TouchableOpacity>
                ))
              : DAFTAR_ASISTEN.map((asisten) => (
                  <TouchableOpacity
                    key={asisten.id}
                    style={styles.card}
                    onPress={() => handlePilihIdentitas(asisten)}
                  >
                    <ThemedText type="defaultSemiBold">{asisten.nama}</ThemedText>
                    <ThemedText type="small">Asisten Praktikum</ThemedText>
                  </TouchableOpacity>
                ))}
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Presensi Praktikum
        </ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Pilih peran Anda untuk melanjutkan
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => handlePilihPeran('praktikan')}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Praktikan
            </ThemedText>
            <ThemedText type="small">Mahasiswa peserta praktikum</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => handlePilihPeran('asisten')}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              Asisten
            </ThemedText>
            <ThemedText type="small">Pengelola sesi praktikum</ThemedText>
          </TouchableOpacity>
        </View>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  buttonContainer: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  roleButton: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.one,
  },
  buttonText: {
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    flex: 1,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: Spacing.one,
  },
});
